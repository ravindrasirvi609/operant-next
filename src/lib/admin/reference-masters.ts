import { z } from "zod";

import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import Award from "@/models/reference/award";
import CulturalActivity from "@/models/reference/cultural-activity";
import Event from "@/models/reference/event";
import Skill from "@/models/reference/skill";
import SocialProgram from "@/models/reference/social-program";
import Sport from "@/models/reference/sport";

export const referenceMasterKinds = [
    "award",
    "skill",
    "sport",
    "cultural-activity",
    "social-program",
    "event",
] as const;

export type ReferenceMasterKind = (typeof referenceMasterKinds)[number];

const baseOptions = z.object({
    isActive: z.boolean().optional(),
});

const awardSchema = baseOptions.extend({
    title: z.string().trim().min(1, "Title is required."),
    category: z.string().trim().optional(),
    organizingBody: z.string().trim().optional(),
    level: z.enum(["College", "State", "National", "International"]).optional(),
});

const skillSchema = baseOptions.extend({
    name: z.string().trim().min(1, "Name is required."),
    category: z.enum(["Technical", "SoftSkill", "Domain", "Language", "Other"]),
});

const sportSchema = baseOptions.extend({
    sportName: z.string().trim().min(1, "Sport name is required."),
});

const culturalActivitySchema = baseOptions.extend({
    name: z.string().trim().min(1, "Name is required."),
    category: z.string().trim().optional(),
});

const socialProgramSchema = baseOptions.extend({
    name: z.string().trim().min(1, "Name is required."),
    type: z.enum(["NSS", "NCC", "Social", "Extension", "Other"]),
    description: z.string().trim().optional(),
});

const eventSchema = baseOptions.extend({
    title: z.string().trim().min(1, "Title is required."),
    eventType: z.enum(["Seminar", "Workshop", "Conference", "Symposium", "Webinar", "Other"]),
    organizedBy: z.string().trim().min(1, "Organizer is required."),
    level: z.enum(["College", "State", "National", "International"]).optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    location: z.string().trim().optional(),
});

const schemaByKind = {
    award: awardSchema,
    skill: skillSchema,
    sport: sportSchema,
    "cultural-activity": culturalActivitySchema,
    "social-program": socialProgramSchema,
    event: eventSchema,
} satisfies Record<ReferenceMasterKind, z.ZodTypeAny>;

function getModel(kind: ReferenceMasterKind) {
    switch (kind) {
        case "award":
            return Award;
        case "skill":
            return Skill;
        case "sport":
            return Sport;
        case "cultural-activity":
            return CulturalActivity;
        case "social-program":
            return SocialProgram;
        case "event":
            return Event;
    }
}

type ReferenceMasterModel = ReturnType<typeof getModel> & {
    findById: (id: string) => Promise<any>;
    create: (payload: unknown) => Promise<any>;
};

function getTableName(kind: ReferenceMasterKind) {
    switch (kind) {
        case "award":
            return "awards";
        case "skill":
            return "skills";
        case "sport":
            return "sports";
        case "cultural-activity":
            return "cultural_activities";
        case "social-program":
            return "social_programs";
        case "event":
            return "events";
    }
}

function toDateOrUndefined(value?: string) {
    if (!value) {
        return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function listReferenceMasters() {
    await dbConnect();

    const [awards, skills, sports, culturalActivities, socialPrograms, events] = await Promise.all([
        Award.find({}).sort({ title: 1 }).lean(),
        Skill.find({}).sort({ name: 1 }).lean(),
        Sport.find({}).sort({ sportName: 1 }).lean(),
        CulturalActivity.find({}).sort({ name: 1 }).lean(),
        SocialProgram.find({}).sort({ name: 1 }).lean(),
        Event.find({}).sort({ title: 1, startDate: -1 }).lean(),
    ]);

    return {
        awards,
        skills,
        sports,
        culturalActivities,
        socialPrograms,
        events,
    };
}

export async function createReferenceMaster(
    kind: ReferenceMasterKind,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();

    const input = schemaByKind[kind].parse(rawInput);
    const Model = getModel(kind) as ReferenceMasterModel;

    const payload =
        kind === "event"
            ? {
                  ...input,
                  startDate: toDateOrUndefined((input as z.infer<typeof eventSchema>).startDate),
                  endDate: toDateOrUndefined((input as z.infer<typeof eventSchema>).endDate),
              }
            : input;

    const record = await Model.create(payload);

    if (!record) {
        throw new AuthError("Reference master creation failed.", 500);
    }

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "REFERENCE_MASTER_CREATE",
            tableName: getTableName(kind),
            recordId: record._id.toString(),
            newData: { kind, ...record.toObject() },
            auditContext: options.auditContext,
        });
    }

    return record;
}

export async function updateReferenceMasterStatus(
    kind: ReferenceMasterKind,
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();

    const input = z.object({ isActive: z.boolean() }).parse(rawInput);
    const Model = getModel(kind) as ReferenceMasterModel;

    const record = await Model.findById(id);
    if (!record) {
        throw new AuthError("Reference master record not found.", 404);
    }

    const oldState = record.toObject();
    record.set("isActive", input.isActive);
    await record.save();

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "REFERENCE_MASTER_STATUS_UPDATE",
            tableName: getTableName(kind),
            recordId: record._id.toString(),
            oldData: oldState,
            newData: record.toObject(),
            auditContext: options.auditContext,
        });
    }

    return record;
}
