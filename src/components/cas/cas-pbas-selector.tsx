"use client";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailInline } from "@/components/workspace/detail-list";
import { cn } from "@/lib/utils";
import type { PbasOption } from "@/components/cas/cas-types";

/**
 * Approved PBAS reports to draw the CAS score from.
 *
 * The original rendered the three sub-scores as one pipe-delimited string
 * ("Teaching 12 | Research 8 | Institutional 4") and used a single `<Badge>` to
 * mean three different things — Selected, Preview, and Available — while the
 * record's actual workflow status sat above it as plain uppercase text. Selection
 * state and record state are separate concerns, so they get separate affordances:
 * a border and a Linked badge for the former, `StatusBadge` for the latter.
 *
 * Selection also previously relied on `bg-card` versus `bg-muted/50` — a few
 * percent of luminance, and the only cue that a report was included at all.
 */
export function PBASSelector({
    options,
    selectedIds,
    onToggle,
    disabled = false,
}: {
    options: PbasOption[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    disabled?: boolean;
}) {
    if (!options.length) {
        return (
            <EmptyState
                bordered
                title="No PBAS reports available"
                description="CAS scoring reuses your approved PBAS data. Submit a PBAS application first, then link it here."
                className="py-8"
            />
        );
    }

    return (
        <ul className="grid gap-3 md:grid-cols-2">
            {options.map((option) => {
                const isSelected = selectedIds.includes(option._id);
                const previewOnly = option.usableForSubmit === false;

                return (
                    <li key={option._id}>
                        <button
                            type="button"
                            onClick={() => onToggle(option._id)}
                            disabled={disabled}
                            aria-pressed={isSelected}
                            className={cn(
                                "w-full rounded-lg border p-4 text-left transition-colors",
                                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                isSelected
                                    ? "border-primary bg-accent/50 ring-1 ring-primary/30"
                                    : "bg-card hover:border-ring/50 hover:bg-accent/30",
                                disabled && "cursor-not-allowed opacity-60"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{option.academicYear}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Total API {option.totalApiScore ?? 0}
                                    </p>
                                </div>
                                <span className="flex shrink-0 flex-col items-end gap-1.5">
                                    {option.status ? <StatusBadge status={option.status} /> : null}
                                    {isSelected ? (
                                        <Badge className="gap-1">
                                            <Check aria-hidden />
                                            Linked
                                        </Badge>
                                    ) : null}
                                </span>
                            </div>

                            <DetailInline
                                className="mt-3"
                                items={[
                                    { label: "Teaching", value: option.teachingScore ?? 0 },
                                    { label: "Research", value: option.researchScore ?? 0 },
                                    { label: "Institutional", value: option.institutionalScore ?? 0 },
                                ]}
                            />

                            {previewOnly ? (
                                <p className="mt-3 text-xs text-warning-muted-foreground">
                                    Not yet approved — shown for preview, but it will not count toward the
                                    submitted score.
                                </p>
                            ) : null}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
