import { z } from "zod";

import dbConnect from "@/lib/dbConnect";
import { designationOptions, getAllowedCasPromotionTargets } from "@/lib/faculty/options";
import CasPromotionRule from "@/models/core/cas-promotion-rule";

const designationSchema = z.enum(designationOptions);

const categoryMinimumsSchema = z.object({
    teachingLearning: z.coerce.number().min(0).default(0),
    researchPublication: z.coerce.number().min(0).default(0),
    academicContribution: z.coerce.number().min(0).default(0),
});

export const casPromotionRuleSchema = z.object({
    currentDesignation: designationSchema,
    targetDesignation: designationSchema,
    minExperienceYears: z.coerce.number().min(0),
    minApiScore: z.coerce.number().min(0),
    categoryMinimums: categoryMinimumsSchema.optional(),
    notes: z.string().trim().optional(),
    isActive: z.coerce.boolean().default(true),
});

export const casPromotionRuleUpdateSchema = casPromotionRuleSchema.partial();

const CAS_SCORE_CAPS = {
    teachingLearning: 100,
    researchPublication: 150,
    academicContribution: 100,
} as const;

function roundScore(value: number) {
    return Math.round(value * 100) / 100;
}

function deriveCategoryMinimums(
    minApiScore: number,
    explicitMinimums?: Partial<z.infer<typeof categoryMinimumsSchema>> | null
) {
    const explicit = {
        teachingLearning: Number(explicitMinimums?.teachingLearning ?? 0),
        researchPublication: Number(explicitMinimums?.researchPublication ?? 0),
        academicContribution: Number(explicitMinimums?.academicContribution ?? 0),
    };

    if (explicit.teachingLearning || explicit.researchPublication || explicit.academicContribution) {
        return explicit;
    }

    const totalCap =
        CAS_SCORE_CAPS.teachingLearning +
        CAS_SCORE_CAPS.researchPublication +
        CAS_SCORE_CAPS.academicContribution;

    return {
        teachingLearning: roundScore((minApiScore * CAS_SCORE_CAPS.teachingLearning) / totalCap),
        researchPublication: roundScore((minApiScore * CAS_SCORE_CAPS.researchPublication) / totalCap),
        academicContribution: roundScore((minApiScore * CAS_SCORE_CAPS.academicContribution) / totalCap),
    };
}

function validatePromotionPath(currentDesignation: string, targetDesignation: string) {
    const allowedTargets = getAllowedCasPromotionTargets(currentDesignation);

    if (!allowedTargets.includes(targetDesignation as (typeof allowedTargets)[number])) {
        throw new Error("Selected CAS promotion path is not allowed for the current designation.");
    }
}

export async function getCasPromotionRules() {
    await dbConnect();

    return CasPromotionRule.find({})
        .sort({ currentDesignation: 1, targetDesignation: 1, minApiScore: 1 })
        .lean();
}

export async function createCasPromotionRule(input: unknown) {
    await dbConnect();

    const data = casPromotionRuleSchema.parse(input);
    validatePromotionPath(data.currentDesignation, data.targetDesignation);

    const rule = await CasPromotionRule.create({
        currentDesignation: data.currentDesignation,
        targetDesignation: data.targetDesignation,
        minExperienceYears: data.minExperienceYears,
        minApiScore: data.minApiScore,
        categoryMinimums: deriveCategoryMinimums(data.minApiScore, data.categoryMinimums),
        notes: data.notes?.trim() || undefined,
        isActive: data.isActive,
    });

    return rule;
}

export async function updateCasPromotionRule(id: string, input: unknown) {
    await dbConnect();

    const existing = await CasPromotionRule.findById(id);

    if (!existing) {
        throw new Error("CAS promotion rule not found.");
    }

    const data = casPromotionRuleUpdateSchema.parse(input);
    const currentDesignation = data.currentDesignation ?? existing.currentDesignation;
    const targetDesignation = data.targetDesignation ?? existing.targetDesignation;

    validatePromotionPath(currentDesignation, targetDesignation);

    existing.currentDesignation = currentDesignation;
    existing.targetDesignation = targetDesignation;

    if (typeof data.minExperienceYears === "number") {
        existing.minExperienceYears = data.minExperienceYears;
    }

    if (typeof data.minApiScore === "number") {
        existing.minApiScore = data.minApiScore;
    }

    existing.categoryMinimums = deriveCategoryMinimums(
        existing.minApiScore,
        data.categoryMinimums ?? existing.categoryMinimums
    );
    existing.notes = data.notes !== undefined ? data.notes.trim() || undefined : existing.notes;

    if (typeof data.isActive === "boolean") {
        existing.isActive = data.isActive;
    }

    await existing.save();

    return existing;
}

export async function deleteCasPromotionRule(id: string) {
    await dbConnect();

    const deleted = await CasPromotionRule.findByIdAndDelete(id);

    if (!deleted) {
        throw new Error("CAS promotion rule not found.");
    }

    return deleted;
}
