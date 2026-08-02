"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * Horizontal bar chart for "count by category" breakdowns — department backlog,
 * record-type volume, criterion coverage. These were previously rendered as a
 * list of rows with a number badge, which made relative magnitude invisible.
 *
 * Single series on purpose: the measure is one count across categories, so
 * position encodes magnitude and color encodes nothing. Using one hue rather
 * than a hue per bar avoids implying the categories are different *kinds* of
 * thing, and sidesteps the categorical color-separation limits entirely.
 *
 * Mark specs (see the dataviz reference): bars capped at 24px so the band keeps
 * some air, 4px rounded data-end with a square baseline, hairline grid on the
 * value axis only, and a direct value label at each tip. The direct labels are
 * also what makes the light-mode contrast acceptable — the bar fill is not the
 * only way to read the number.
 */

export type BreakdownDatum = {
    label: string;
    value: number;
    /** Optional secondary count surfaced in the tooltip, e.g. "of which pending". */
    secondaryValue?: number;
};

const config = {
    value: { label: "Count", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BreakdownBarChart({
    data,
    max = 8,
    valueLabel = "Count",
    secondaryLabel,
    emptyMessage = "Nothing to chart yet.",
    className,
}: {
    data: BreakdownDatum[];
    /** Bars to show. The remainder is folded into a single "Other" bar. */
    max?: number;
    valueLabel?: string;
    secondaryLabel?: string;
    emptyMessage?: string;
    className?: string;
}) {
    const sorted = [...data].filter((entry) => entry.value > 0).sort((a, b) => b.value - a.value);

    if (sorted.length === 0) {
        return <EmptyState bordered title="No data" description={emptyMessage} />;
    }

    // Fold the tail rather than truncating it, so the total still reconciles
    // with the stat cards above the chart.
    const head = sorted.slice(0, max);
    const tail = sorted.slice(max);
    const chartData =
        tail.length > 0
            ? [
                  ...head,
                  {
                      label: `Other (${tail.length})`,
                      value: tail.reduce((sum, entry) => sum + entry.value, 0),
                  },
              ]
            : head;

    // Room for the longest label, clamped so one long department name cannot
    // squeeze the plot area to nothing.
    const axisWidth = Math.min(160, Math.max(72, ...chartData.map((entry) => entry.label.length * 6.5)));

    return (
        <ChartContainer
            config={{
                ...config,
                value: { ...config.value, label: valueLabel },
            }}
            className={cn("aspect-auto w-full", className)}
            style={{ height: `${Math.max(140, chartData.length * 34 + 24)}px` }}
        >
            <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                margin={{ left: 4, right: 36, top: 4, bottom: 4 }}
            >
                <CartesianGrid horizontal={false} strokeDasharray="" />
                <XAxis type="number" dataKey="value" hide />
                <YAxis
                    type="category"
                    dataKey="label"
                    width={axisWidth}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    interval={0}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            labelKey="label"
                            formatter={(value, _name, item) => {
                                const secondary = (item?.payload as BreakdownDatum | undefined)
                                    ?.secondaryValue;

                                return (
                                    <span className="flex flex-col">
                                        <span className="tabular-nums">
                                            {valueLabel}: {value as number}
                                        </span>
                                        {secondaryLabel && secondary !== undefined ? (
                                            <span className="text-muted-foreground tabular-nums">
                                                {secondaryLabel}: {secondary}
                                            </span>
                                        ) : null}
                                    </span>
                                );
                            }}
                        />
                    }
                />
                <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    maxBarSize={24}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                >
                    <LabelList
                        dataKey="value"
                        position="right"
                        offset={8}
                        className="fill-muted-foreground"
                        fontSize={11}
                    />
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}
