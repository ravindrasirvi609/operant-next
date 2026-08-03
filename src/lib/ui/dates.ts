/**
 * Date formatting for the UI layer.
 *
 * Consolidates six local helpers: `parseDateValue`, `formatDateLabel`,
 * `toDateInputValue`, and `formatTimestamp` from aqar-dashboard.tsx, plus
 * `normalizeDateInput` and `toPrettyDateTime` from ssr-contributor-workspace.tsx.
 * They disagreed on the empty case — AQAR rendered "Select date", SSR rendered
 * "-", and the PBAS/CAS timelines called `new Date(x).toLocaleString()` with no
 * guard at all, which prints "Invalid Date" for a missing timestamp.
 *
 * Everything here is total: bad input yields the placeholder, never a throw and
 * never "Invalid Date".
 */

import { format, isValid, parseISO } from "date-fns";

/** Shown wherever a date is absent. One dash, app-wide. */
export const EMPTY_VALUE = "—";

export function parseIsoDate(value?: string | null): Date | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = parseISO(String(value));
    return isValid(parsed) ? parsed : undefined;
}

/** `Date` -> the `yyyy-MM-dd` string the API and zod schemas expect. */
export function toIsoDateString(date?: Date | null): string {
    if (!date || !isValid(date)) {
        return "";
    }

    return format(date, "yyyy-MM-dd");
}

/** Trims an ISO datetime down to its date part for `<input type="date">`. */
export function toDateInputValue(value?: string | null): string {
    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
}

/** Human date, e.g. "12 Jun 2025". */
export function formatDateLabel(value?: string | null, fallback = EMPTY_VALUE): string {
    const parsed = parseIsoDate(value);
    return parsed ? format(parsed, "dd MMM yyyy") : fallback;
}

/** Human date + time, for audit trails and timelines. */
export function formatTimestamp(value?: string | null, fallback = EMPTY_VALUE): string {
    if (!value) {
        return fallback;
    }

    // Timeline entries arrive as full ISO datetimes; `parseISO` handles both
    // those and bare dates, but a Mongo `Date` serialized by JSON.stringify can
    // also arrive here, so fall back to the Date constructor.
    const parsed = parseIsoDate(value) ?? new Date(String(value));
    return isValid(parsed) ? format(parsed, "dd MMM yyyy, h:mm a") : fallback;
}

/** Inclusive date range, e.g. "01 Jun 2025 — 31 May 2026". */
export function formatDateRange(from?: string | null, to?: string | null): string {
    const start = formatDateLabel(from);
    const end = formatDateLabel(to);

    if (start === EMPTY_VALUE && end === EMPTY_VALUE) {
        return EMPTY_VALUE;
    }

    return `${start} — ${end}`;
}
