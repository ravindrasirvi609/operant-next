import { Types } from "mongoose";

import type { AuditRequestContext } from "@/lib/audit/service";

/**
 * Actor passed through all module service functions.
 * Combines the user identity fields needed by the authorization
 * layer with the optional audit context used by the audit log.
 */
export type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    auditContext?: AuditRequestContext;
};

/**
 * Parse a deadline/reminder date string to a Date object.
 * Accepts ISO strings and YYYY-MM-DD date-only strings (treated as
 * end-of-day UTC so the full calendar day is within the window).
 * Returns null for empty, missing, or unparseable values.
 */
export function parseDeadlineDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnlyMatch
        ? new Date(`${trimmed}T23:59:59.999Z`)
        : new Date(trimmed);

    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Bucket a days-remaining value into the reminder threshold bands
 * used for deadline notification de-duplication.
 * Returns null when outside all threshold windows (no reminder needed).
 */
export function getReminderThreshold(
    daysRemaining: number
): "overdue" | 1 | 3 | 7 | 14 | null {
    if (daysRemaining < 0) {
        return "overdue";
    }

    if (daysRemaining <= 1) {
        return 1;
    }

    if (daysRemaining <= 3) {
        return 3;
    }

    if (daysRemaining <= 7) {
        return 7;
    }

    if (daysRemaining <= 14) {
        return 14;
    }

    return null;
}

/**
 * Build the status log entry object that both AQAR and PBAS push
 * onto their respective `statusLogs` arrays.
 *
 * Generic over TStatus so the returned `status` field keeps its
 * narrow enum type (e.g. AqarStatus or PbasStatus), which lets
 * Mongoose's DocumentArray.push() type-check correctly.
 */
export function buildStatusLogEntry<TStatus extends string = string>(
    status: TStatus,
    actor?: SafeActor,
    remarks?: string
): {
    status: TStatus;
    actorId: Types.ObjectId | undefined;
    actorName: string | undefined;
    actorRole: string | undefined;
    remarks: string | undefined;
    changedAt: Date;
} {
    return {
        status,
        actorId: actor ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    };
}
