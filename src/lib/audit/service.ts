import { Types, type ClientSession } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import AuditLog from "@/models/core/audit-log";

export type AuditActor = {
    id?: string;
    name?: string;
    role?: string;
};

export type AuditRequestContext = {
    ipAddress?: string;
};

type AuditPayload = {
    actor?: AuditActor;
    action: string;
    tableName: string;
    recordId?: string;
    oldData?: unknown;
    newData?: unknown;
    auditContext?: AuditRequestContext;
    session?: ClientSession;
};

export type AuditLogFilters = {
    page?: number | string;
    pageSize?: number | string;
    action?: string;
    tableName?: string;
    recordId?: string;
    userId?: string;
    query?: string;
    startDate?: string;
    endDate?: string;
};

function toPlainAuditValue(value: unknown): unknown {
    if (value === undefined || value === null) {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (value instanceof Types.ObjectId) {
        return value.toString();
    }

    if (Array.isArray(value)) {
        return value.map((item) => toPlainAuditValue(item));
    }

    if (typeof value === "object") {
        const source =
            "toObject" in (value as Record<string, unknown>) &&
            typeof (value as { toObject?: unknown }).toObject === "function"
                ? (value as { toObject: () => unknown }).toObject()
                : value;

        return Object.entries(source as Record<string, unknown>).reduce<Record<string, unknown>>(
            (accumulator, [key, entryValue]) => {
                if (entryValue === undefined) {
                    return accumulator;
                }

                accumulator[key] = toPlainAuditValue(entryValue);
                return accumulator;
            },
            {}
        );
    }

    return value;
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createAuditLog({
    actor,
    action,
    tableName,
    recordId,
    oldData,
    newData,
    auditContext,
    session,
}: AuditPayload) {
    await AuditLog.create(
        [
            {
                userId: actor?.id ? new Types.ObjectId(actor.id) : undefined,
                action,
                tableName,
                recordId,
                oldData: toPlainAuditValue(oldData),
                newData: toPlainAuditValue(newData),
                ipAddress: auditContext?.ipAddress,
            },
        ],
        { session }
    );
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
    await dbConnect();

    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize ?? 25)));
    const query: Record<string, unknown> = {};

    if (filters.action?.trim()) {
        query.action = filters.action.trim();
    }

    if (filters.tableName?.trim()) {
        query.tableName = filters.tableName.trim();
    }

    if (filters.recordId?.trim()) {
        query.recordId = filters.recordId.trim();
    }

    if (filters.userId && Types.ObjectId.isValid(filters.userId)) {
        query.userId = new Types.ObjectId(filters.userId);
    }

    const createdAt: Record<string, Date> = {};
    if (filters.startDate) {
        createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        createdAt.$lte = endDate;
    }
    if (Object.keys(createdAt).length) {
        query.createdAt = createdAt;
    }

    if (filters.query?.trim()) {
        const pattern = new RegExp(escapeRegex(filters.query.trim()), "i");
        query.$or = [
            { action: pattern },
            { tableName: pattern },
            { recordId: pattern },
        ];
    }

    const [items, total, actions, tables] = await Promise.all([
        AuditLog.find(query)
            .populate("userId", "name email role")
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        AuditLog.countDocuments(query),
        AuditLog.distinct("action"),
        AuditLog.distinct("tableName"),
    ]);

    return {
        items,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        filterOptions: {
            actions: actions.sort(),
            tableNames: tables.sort(),
        },
    };
}
