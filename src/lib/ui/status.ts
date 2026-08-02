import {
    Archive,
    Ban,
    CalendarClock,
    CheckCircle2,
    CircleDashed,
    CircleSlash,
    Clock,
    FileCheck2,
    FileText,
    Gavel,
    GraduationCap,
    Hourglass,
    Lock,
    PauseCircle,
    Send,
    ShieldCheck,
    Sparkles,
    TriangleAlert,
    UserCheck,
    XCircle,
    type LucideIcon,
} from "lucide-react";

import type { Tone } from "./tone";

/**
 * Single source of truth for how a workflow status renders.
 *
 * The app has ~40 distinct status strings spread across the Mongoose models
 * (curriculum, teaching-learning, research, infrastructure, governance, CAS,
 * PBAS, AQAR, SSR, compliance...). Each feature component used to re-implement
 * its own `statusBadge()` with a slightly different set of cases, so the same
 * status could be amber in one screen and gray in the next.
 *
 * `resolveStatus` is deliberately total: anything unmapped falls through to a
 * keyword heuristic and then to neutral, so a new status value added to a model
 * degrades to a sensible badge instead of rendering as an unstyled string.
 *
 * Every entry carries an icon. Tone is never the only signal — that is what
 * makes the sub-3:1 light-mode warning yellow acceptable, and what makes the
 * badges readable for color-vision-deficient users.
 */

export type ResolvedStatus = {
    tone: Tone;
    Icon: LucideIcon;
    /** Human-readable label; splits PascalCase values like "PendingActivation". */
    label: string;
};

type Entry = { tone: Tone; Icon: LucideIcon };

const STATUS_MAP: Record<string, Entry> = {
    // --- settled, good outcomes -------------------------------------------
    approved: { tone: "success", Icon: CheckCircle2 },
    verified: { tone: "success", Icon: ShieldCheck },
    active: { tone: "success", Icon: CheckCircle2 },
    completed: { tone: "success", Icon: CheckCircle2 },
    accepted: { tone: "success", Icon: CheckCircle2 },
    granted: { tone: "success", Icon: CheckCircle2 },
    published: { tone: "success", Icon: Sparkles },
    awarded: { tone: "success", Icon: Sparkles },
    pass: { tone: "success", Icon: CheckCircle2 },
    promoted: { tone: "success", Icon: CheckCircle2 },
    sent: { tone: "success", Icon: Send },
    read: { tone: "success", Icon: CheckCircle2 },

    // --- in flight, awaiting someone ---------------------------------------
    submitted: { tone: "warning", Icon: Send },
    "under review": { tone: "warning", Icon: Hourglass },
    "committee review": { tone: "warning", Icon: Gavel },
    "board review": { tone: "warning", Icon: Gavel },
    "department review": { tone: "warning", Icon: Hourglass },
    "iqac review": { tone: "warning", Icon: Hourglass },
    "teaching learning review": { tone: "warning", Icon: Hourglass },
    "research review": { tone: "warning", Icon: Hourglass },
    "infrastructure review": { tone: "warning", Icon: Hourglass },
    "leadership review": { tone: "warning", Icon: Gavel },
    "governance review": { tone: "warning", Icon: Gavel },
    "principal review": { tone: "warning", Icon: Gavel },
    "bos review": { tone: "warning", Icon: Gavel },
    pending: { tone: "warning", Icon: Clock },
    pendingactivation: { tone: "warning", Icon: UserCheck },
    inprogress: { tone: "warning", Icon: Hourglass },
    "in progress": { tone: "warning", Icon: Hourglass },
    ongoing: { tone: "warning", Icon: Hourglass },
    scheduled: { tone: "warning", Icon: CalendarClock },
    actionpending: { tone: "warning", Icon: TriangleAlert },
    open: { tone: "warning", Icon: CircleDashed },
    onleave: { tone: "warning", Icon: PauseCircle },

    // --- settled but locked / informational --------------------------------
    locked: { tone: "info", Icon: Lock },
    finalized: { tone: "info", Icon: FileCheck2 },
    generated: { tone: "info", Icon: FileText },
    reviewed: { tone: "info", Icon: FileCheck2 },
    ready: { tone: "info", Icon: CheckCircle2 },
    overridden: { tone: "info", Icon: FileText },
    filed: { tone: "info", Icon: FileText },

    // --- bad outcomes -------------------------------------------------------
    rejected: { tone: "danger", Icon: XCircle },
    overdue: { tone: "danger", Icon: TriangleAlert },
    failed: { tone: "danger", Icon: XCircle },
    fail: { tone: "danger", Icon: XCircle },
    revoked: { tone: "danger", Icon: Ban },
    suspended: { tone: "danger", Icon: Ban },
    dropped: { tone: "danger", Icon: CircleSlash },
    expired: { tone: "danger", Icon: TriangleAlert },
    withheld: { tone: "danger", Icon: TriangleAlert },

    // --- dormant ------------------------------------------------------------
    planned: { tone: "neutral", Icon: CalendarClock },
    draft: { tone: "neutral", Icon: FileText },
    inactive: { tone: "neutral", Icon: CircleSlash },
    archived: { tone: "neutral", Icon: Archive },
    closed: { tone: "neutral", Icon: CircleSlash },
    retired: { tone: "neutral", Icon: CircleSlash },
    skipped: { tone: "neutral", Icon: CircleSlash },
    delivered: { tone: "neutral", Icon: Send },
    graduated: { tone: "neutral", Icon: GraduationCap },
    all: { tone: "neutral", Icon: CircleDashed },
};

/** Ordered keyword fallbacks for statuses not in STATUS_MAP. First hit wins. */
const HEURISTICS: Array<[RegExp, Entry]> = [
    [/reject|fail|revoke|suspend|overdue|expire|withheld|breach|error/i, { tone: "danger", Icon: XCircle }],
    [/review|pending|await|progress|submit|schedul/i, { tone: "warning", Icon: Hourglass }],
    [/approv|verif|complet|accept|grant|success|activ/i, { tone: "success", Icon: CheckCircle2 }],
    [/lock|final|generat|publish/i, { tone: "info", Icon: Lock }],
    [/draft|inactive|archiv|clos|cancel/i, { tone: "neutral", Icon: FileText }],
];

const FALLBACK: Entry = { tone: "neutral", Icon: CircleDashed };

/** "PendingActivation" -> "Pending Activation"; leaves already-spaced input alone. */
export function humanizeStatus(status: string): string {
    const trimmed = status.trim();
    if (!trimmed) return "";
    if (trimmed.includes(" ")) return trimmed;
    return trimmed
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

export function resolveStatus(status: string | null | undefined): ResolvedStatus {
    const raw = (status ?? "").trim();
    const label = humanizeStatus(raw) || "Unknown";

    if (!raw) {
        return { ...FALLBACK, label };
    }

    const exact = STATUS_MAP[raw.toLowerCase()];
    if (exact) {
        return { ...exact, label };
    }

    for (const [pattern, entry] of HEURISTICS) {
        if (pattern.test(raw)) {
            return { ...entry, label };
        }
    }

    return { ...FALLBACK, label };
}

/** Tone for a plain active/inactive boolean — the other very common case. */
export function resolveActive(isActive: boolean | undefined): ResolvedStatus {
    return isActive
        ? { tone: "success", Icon: CheckCircle2, label: "Active" }
        : { tone: "neutral", Icon: CircleSlash, label: "Inactive" };
}
