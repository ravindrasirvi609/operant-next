import * as React from "react";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, type Tone } from "@/lib/ui/tone";

/**
 * The app's metric tile.
 *
 * Replaces ~29 near-identical local components named MetricCard, SummaryCard,
 * InfoCard, and DashboardMetric, which had drifted into four different label
 * sizes and three different paddings.
 *
 * `tone` tints only the icon chip and the trend text, never the card surface —
 * a wall of colored cards is noise, and it would also stop tone from meaning
 * anything.
 */

export type StatCardProps = Omit<React.ComponentProps<typeof Card>, "children"> & {
    label: string;
    value: React.ReactNode;
    /** Secondary line under the value. */
    helper?: string;
    icon?: LucideIcon;
    tone?: Tone;
    /** Signed percentage or count change. Positive renders as an up-trend. */
    trend?: { value: number; label?: string };
    /** Compact variant for dense grids and in-card breakdowns. */
    dense?: boolean;
};

export function StatCard({
    label,
    value,
    helper,
    icon,
    tone = "accent",
    trend,
    dense = false,
    className,
    ...props
}: StatCardProps) {
    const TrendIcon = trend && trend.value < 0 ? TrendingDown : TrendingUp;
    // Down is not automatically bad (a falling backlog is good), so the caller
    // supplies meaning through `tone`; the trend text just follows direction.
    const trendTone = trend && trend.value < 0 ? "text-muted-foreground" : TONE_CLASSES[tone].text;

    return (
        <Card className={cn("gap-0", className)} {...props}>
            <CardContent className={cn("flex items-start justify-between gap-3", dense ? "p-4" : "p-5")}>
                <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {label}
                    </p>
                    <p
                        className={cn(
                            "font-semibold text-foreground",
                            dense ? "text-2xl" : "text-3xl"
                        )}
                    >
                        {value}
                    </p>
                    {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
                    {trend ? (
                        <p className={cn("flex items-center gap-1 text-xs font-medium", trendTone)}>
                            <TrendIcon className="size-3.5" aria-hidden />
                            <span className="tabular-nums">
                                {trend.value > 0 ? "+" : ""}
                                {trend.value}
                            </span>
                            {trend.label ? (
                                <span className="font-normal text-muted-foreground">{trend.label}</span>
                            ) : null}
                        </p>
                    ) : null}
                </div>
                {icon ? <IconChip icon={icon} tone={tone} size={dense ? "sm" : "default"} /> : null}
            </CardContent>
        </Card>
    );
}

/**
 * Borderless variant for use *inside* an existing Card (the "operational
 * readiness" style grids), where nesting Card in Card looks wrong.
 */
export function StatTile({
    label,
    value,
    helper,
    icon,
    tone = "neutral",
    className,
}: Pick<StatCardProps, "label" | "value" | "helper" | "icon" | "tone" | "className">) {
    return (
        <div className={cn("flex items-start justify-between gap-3 rounded-lg border bg-muted/40 p-4", className)}>
            <div className="min-w-0 space-y-1">
                <p className="truncate text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold text-foreground">{value}</p>
                {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
            </div>
            {icon ? <IconChip icon={icon} tone={tone} size="sm" /> : null}
        </div>
    );
}
