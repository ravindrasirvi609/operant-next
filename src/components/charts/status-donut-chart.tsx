"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { resolveStatus } from "@/lib/ui/status";
import { TONE_CLASSES, type Tone } from "@/lib/ui/tone";

/**
 * Donut for a workflow status split (pending / verified / rejected), with the
 * total as the hero figure in the hole.
 *
 * This uses the SEMANTIC tones, not the categorical chart ramp: these slices are
 * states, and states have reserved colors. Consequently the legend carries the
 * status icon and label from src/lib/ui/status.ts — the same icon the badges use
 * — so a slice is never identified by color alone.
 *
 * A 2px ring in the surface color separates touching slices, per the mark specs;
 * no stroke is drawn around the marks themselves.
 */

const TONE_VAR: Record<Tone, string> = {
    success: "var(--success)",
    warning: "var(--warning)",
    info: "var(--info)",
    danger: "var(--destructive)",
    neutral: "var(--muted-foreground)",
    accent: "var(--primary)",
};

export type StatusSlice = {
    /** Raw status string; tone and icon are derived from it. */
    status: string;
    value: number;
};

export function StatusDonutChart({
    data,
    totalLabel = "Total",
    emptyMessage = "No records to summarise yet.",
    className,
}: {
    data: StatusSlice[];
    totalLabel?: string;
    emptyMessage?: string;
    className?: string;
}) {
    const slices = React.useMemo(
        () =>
            data
                .filter((slice) => slice.value > 0)
                .map((slice) => {
                    const resolved = resolveStatus(slice.status);

                    return {
                        key: slice.status,
                        label: resolved.label,
                        value: slice.value,
                        tone: resolved.tone,
                        Icon: resolved.Icon,
                        fill: TONE_VAR[resolved.tone],
                    };
                }),
        [data]
    );

    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    if (total === 0) {
        return <EmptyState bordered title="Nothing to summarise" description={emptyMessage} />;
    }

    const config: ChartConfig = Object.fromEntries(
        slices.map((slice) => [slice.key, { label: slice.label, color: slice.fill }])
    );

    return (
        <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:gap-6", className)}>
            <ChartContainer config={config} className="aspect-square h-[180px] w-[180px] shrink-0">
                <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent nameKey="label" hideLabel />}
                    />
                    <Pie
                        data={slices}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={54}
                        outerRadius={80}
                        // 2px separation in the surface color, per the mark specs.
                        stroke="var(--card)"
                        strokeWidth={2}
                        isAnimationActive={false}
                    >
                        {slices.map((slice) => (
                            <Cell key={slice.key} fill={slice.fill} />
                        ))}
                        <Label
                            position="center"
                            content={({ viewBox }) => {
                                if (!viewBox || !("cx" in viewBox)) return null;
                                const { cx, cy } = viewBox as { cx: number; cy: number };

                                return (
                                    <>
                                        <text
                                            x={cx}
                                            y={cy - 4}
                                            textAnchor="middle"
                                            className="fill-foreground text-2xl font-semibold"
                                        >
                                            {total.toLocaleString()}
                                        </text>
                                        <text
                                            x={cx}
                                            y={cy + 14}
                                            textAnchor="middle"
                                            className="fill-muted-foreground text-[11px]"
                                        >
                                            {totalLabel}
                                        </text>
                                    </>
                                );
                            }}
                        />
                    </Pie>
                </PieChart>
            </ChartContainer>

            {/* Legend: icon + label + value, so identity never depends on hue. */}
            <ul className="grid w-full min-w-0 gap-2">
                {slices.map((slice) => {
                    const Icon = slice.Icon;
                    const share = Math.round((slice.value / total) * 100);

                    return (
                        <li key={slice.key} className="flex items-center gap-2.5 text-sm">
                            <span
                                aria-hidden
                                className={cn("size-2.5 shrink-0 rounded-full", TONE_CLASSES[slice.tone].dot)}
                            />
                            <Icon
                                aria-hidden
                                className={cn("size-4 shrink-0", TONE_CLASSES[slice.tone].text)}
                            />
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                {slice.label}
                            </span>
                            <span className="shrink-0 font-medium text-foreground tabular-nums">
                                {slice.value}
                            </span>
                            <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                                {share}%
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
