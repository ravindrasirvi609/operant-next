"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PbasOption } from "@/components/cas/cas-types";

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
    return (
        <div className="grid gap-3">
            {options.length ? options.map((item) => {
                const isSelected = selectedIds.includes(item._id);
                return (
                    <button
                        type="button"
                        onClick={() => onToggle(item._id)}
                        disabled={disabled}
                        key={item._id}
                        className={cn(
                            "rounded-lg border p-4 text-left",
                            isSelected ? "border-border bg-card" : "border-border bg-muted/50",
                            disabled && "cursor-not-allowed opacity-60"
                        )}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{item.academicYear}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Teaching {item.teachingScore ?? 0} | Research {item.researchScore ?? 0} | Institutional {item.institutionalScore ?? 0}
                                </p>
                                {item.status ? (
                                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                        {item.status}{item.usableForSubmit === false ? " • Preview only" : ""}
                                    </p>
                                ) : null}
                            </div>
                            <Badge>{isSelected ? "Selected" : item.usableForSubmit === false ? "Preview" : "Available"}</Badge>
                        </div>
                    </button>
                );
            }) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                    No PBAS reports are available yet. Create and submit PBAS applications first in the PBAS module.
                </div>
            )}
        </div>
    );
}
