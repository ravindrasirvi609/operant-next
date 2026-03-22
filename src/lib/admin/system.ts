import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import {
    systemUpdatePatchSchema,
    systemUpdateSchema,
} from "@/lib/admin/validators";
import { AuthError } from "@/lib/auth/errors";
import SystemMisc from "@/models/engagement/system-misc";

function tryParseContent(content: string) {
    try {
        return JSON.parse(content) as unknown;
    } catch {
        return content;
    }
}

export async function getSystemUpdates() {
    await dbConnect();

    return SystemMisc.find().sort({ createdAt: -1 });
}

export async function createSystemUpdate(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = systemUpdateSchema.parse(rawInput);

    await dbConnect();

    const item = await SystemMisc.create({
        type: input.type,
        title: input.title,
        category: input.category || undefined,
        targetRoles: input.targetRoles,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        isActive: input.isActive,
        content: tryParseContent(input.content),
    });

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "SYSTEM_UPDATE_CREATE",
            tableName: "system_updates",
            recordId: item._id.toString(),
            newData: item,
            auditContext: options.auditContext,
        });
    }

    return item;
}

export async function updateSystemUpdate(
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = systemUpdatePatchSchema.parse(rawInput);

    await dbConnect();

    const item = await SystemMisc.findById(id);

    if (!item) {
        throw new AuthError("System update not found.", 404);
    }

    const oldState = item.toObject();

    if (input.type !== undefined) {
        item.type = input.type;
    }

    if (input.title !== undefined) {
        item.title = input.title;
    }

    if (input.category !== undefined) {
        item.category = input.category || undefined;
    }

    if (input.targetRoles !== undefined) {
        item.targetRoles = input.targetRoles;
    }

    if (input.expiresAt !== undefined) {
        item.expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    }

    if (input.isActive !== undefined) {
        item.isActive = input.isActive;
    }

    if (input.content !== undefined) {
        item.content = tryParseContent(input.content);
    }

    await item.save();

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "SYSTEM_UPDATE_UPDATE",
            tableName: "system_updates",
            recordId: item._id.toString(),
            oldData: oldState,
            newData: item.toObject(),
            auditContext: options.auditContext,
        });
    }

    return item;
}
