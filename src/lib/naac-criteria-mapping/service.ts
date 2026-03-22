import { z } from "zod";

import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import {
    defaultNaacCriteriaMappings,
    getNaacCriterionMeta,
    getNaacMetricMeta,
    naacCriterionCatalog,
} from "@/lib/naac-criteria-mapping/catalog";
import NaacCriteriaMapping from "@/models/reference/naac-criteria-mapping";

const criteriaCodeSchema = z.enum(
    naacCriterionCatalog.map((item) => item.criteriaCode) as [string, ...string[]]
);

export const naacCriteriaMappingSchema = z.object({
    criteriaCode: criteriaCodeSchema,
    criteriaName: z.string().trim().min(2).optional(),
    tableName: z.string().trim().min(1, "Source table is required."),
    fieldReference: z.string().trim().min(1, "Field reference is required."),
    weightage: z.coerce.number().min(0, "Weightage must be zero or more."),
});

export const naacCriteriaMappingUpdateSchema =
    naacCriteriaMappingSchema.partial();

function validateSupportedMetric(tableName: string, fieldReference: string) {
    if (!getNaacMetricMeta(tableName, fieldReference)) {
        throw new Error(
            `Unsupported mapping source "${tableName}.${fieldReference}". Select one of the registered AQAR metrics.`
        );
    }
}

function normalizeCriteriaPayload(
    input: z.output<typeof naacCriteriaMappingSchema>
) {
    validateSupportedMetric(input.tableName, input.fieldReference);

    const criterionMeta = getNaacCriterionMeta(input.criteriaCode);
    if (!criterionMeta) {
        throw new Error("Unsupported NAAC criterion code.");
    }

    return {
        criteriaCode: input.criteriaCode,
        criteriaName: criterionMeta.criteriaName,
        tableName: input.tableName.trim(),
        fieldReference: input.fieldReference.trim(),
        weightage: input.weightage,
    };
}

export async function ensureNaacCriteriaMappingsSeeded() {
    await dbConnect();

    const existing = await NaacCriteriaMapping.countDocuments({});
    if (existing > 0) {
        return;
    }

    await NaacCriteriaMapping.insertMany(defaultNaacCriteriaMappings);
}

export async function listNaacCriteriaMappings() {
    await dbConnect();
    await ensureNaacCriteriaMappingsSeeded();

    return NaacCriteriaMapping.find({})
        .sort({ criteriaCode: 1, tableName: 1, fieldReference: 1 })
        .lean();
}

export async function createNaacCriteriaMapping(
    input: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    await ensureNaacCriteriaMappingsSeeded();

    const parsed = naacCriteriaMappingSchema.parse(input);
    const normalized = normalizeCriteriaPayload(parsed);

    const mapping = await NaacCriteriaMapping.create(normalized);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "NAAC_MAPPING_CREATE",
            tableName: "naac_criteria_mapping",
            recordId: mapping._id.toString(),
            newData: mapping,
            auditContext: options.auditContext,
        });
    }

    return mapping;
}

export async function updateNaacCriteriaMapping(
    id: string,
    input: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    await ensureNaacCriteriaMappingsSeeded();

    const existing = await NaacCriteriaMapping.findById(id);
    if (!existing) {
        throw new Error("NAAC criteria mapping not found.");
    }

    const oldState = existing.toObject();

    const parsed = naacCriteriaMappingUpdateSchema.parse(input);
    const nextCriteriaCode = parsed.criteriaCode ?? existing.criteriaCode;
    const nextTableName = parsed.tableName ?? existing.tableName;
    const nextFieldReference = parsed.fieldReference ?? existing.fieldReference;
    const nextWeightage =
        typeof parsed.weightage === "number" ? parsed.weightage : existing.weightage;

    const normalized = normalizeCriteriaPayload({
        criteriaCode: nextCriteriaCode as z.output<typeof criteriaCodeSchema>,
        criteriaName: parsed.criteriaName,
        tableName: nextTableName,
        fieldReference: nextFieldReference,
        weightage: nextWeightage,
    });

    existing.criteriaCode = normalized.criteriaCode;
    existing.criteriaName = normalized.criteriaName;
    existing.tableName = normalized.tableName;
    existing.fieldReference = normalized.fieldReference;
    existing.weightage = normalized.weightage;
    await existing.save();

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "NAAC_MAPPING_UPDATE",
            tableName: "naac_criteria_mapping",
            recordId: existing._id.toString(),
            oldData: oldState,
            newData: existing.toObject(),
            auditContext: options.auditContext,
        });
    }

    return existing;
}

export async function deleteNaacCriteriaMapping(
    id: string,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    await ensureNaacCriteriaMappingsSeeded();

    const deleted = await NaacCriteriaMapping.findByIdAndDelete(id);
    if (!deleted) {
        throw new Error("NAAC criteria mapping not found.");
    }

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "NAAC_MAPPING_DELETE",
            tableName: "naac_criteria_mapping",
            recordId: deleted._id.toString(),
            oldData: deleted,
            auditContext: options.auditContext,
        });
    }

    return deleted;
}
