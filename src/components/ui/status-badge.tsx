import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { resolveActive, resolveStatus } from "@/lib/ui/status";
import { TONE_CLASSES, type Tone } from "@/lib/ui/tone";

/**
 * The single status badge for the whole app.
 *
 * Replaces ~24 local `statusBadge()` helpers that each hardcoded their own
 * color literals. Pass the raw status string straight from the API/model —
 * src/lib/ui/status.ts owns the mapping to tone, icon, and display label, and
 * is total, so an unrecognised status still renders sensibly.
 *
 *   <StatusBadge status={record.status} />
 *   <StatusBadge active={user.isActive} />          // boolean shorthand
 *   <StatusBadge status="Approved" tone="info" />   // override when needed
 */

type StatusBadgeProps = Omit<React.ComponentProps<typeof Badge>, "variant" | "children"> & {
    /** Raw status string, e.g. "Committee Review". */
    status?: string | null;
    /** Boolean shorthand, for the very common active/inactive column. */
    active?: boolean;
    /** Force a tone instead of the one derived from `status`. */
    tone?: Tone;
    /** Hide the leading icon. Avoid — the icon is what keeps the badge readable without color. */
    hideIcon?: boolean;
    /** Override the visible text while keeping the derived tone and icon. */
    label?: string;
};

export function StatusBadge({
    status,
    active,
    tone,
    hideIcon = false,
    label,
    className,
    ...props
}: StatusBadgeProps) {
    const resolved = active === undefined ? resolveStatus(status) : resolveActive(active);
    const effectiveTone = tone ?? resolved.tone;
    const Icon = resolved.Icon;

    return (
        <Badge
            variant="outline"
            className={cn("h-auto gap-1 py-0.5", TONE_CLASSES[effectiveTone].badge, className)}
            {...props}
        >
            {hideIcon ? null : <Icon aria-hidden />}
            {label ?? resolved.label}
        </Badge>
    );
}
