"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert, type FeedbackMessage } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import type { IndicatorEntry } from "@/components/pbas/pbas-types";

/**
 * Reviewer moderation of claimed indicator scores.
 *
 * Extracted from `pbas-review-board.tsx`, where it was the reason that file
 * carried five extra pieces of state — `activeApplicationId`,
 * `entriesByApplication`, `isEntryLoading`, `isEntrySaving`, and `entryMessage` —
 * each a `Record<string, …>` keyed by application id, so that one expandable panel
 * could exist per row. Scoping the state to a component that mounts per expansion
 * removes all five maps.
 *
 * It also fixes an accessibility problem the original had: the approved-score
 * inputs were bare `<Input className="w-24 text-right">` cells inside a table,
 * with the indicator name in a sibling `<td>` and no label association at all.
 */
export function PbasIndicatorModeration({ applicationId }: { applicationId: string }) {
    const [entries, setEntries] = useState<IndicatorEntry[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<FeedbackMessage | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setMessage(null);

        void requestJson<{ entries?: { items?: IndicatorEntry[] } }>(
            `/api/pbas/${applicationId}/entries`,
            { fallbackMessage: "Unable to load indicator entries." }
        )
            .then((payload) => {
                if (cancelled) return;
                setEntries(payload.entries?.items ?? []);
            })
            .catch((cause: unknown) => {
                if (cancelled) return;
                setEntries(null);
                setMessage({
                    type: "error",
                    text: toErrorMessage(cause, "Unable to load indicator entries."),
                });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [applicationId]);

    async function save() {
        if (!entries?.length) return;

        setSaving(true);
        setMessage(null);

        try {
            const payload = await requestJson<{
                message?: string;
                entries?: { items?: IndicatorEntry[] };
            }>(`/api/pbas/${applicationId}/entries/moderate`, {
                method: "POST",
                body: {
                    updates: entries.map((entry) => ({
                        indicatorId: entry.indicatorId,
                        // An untouched row keeps the claimed value, which is what
                        // "approve as claimed" means.
                        approvedScore: entry.approvedScore ?? entry.claimedScore,
                        remarks: entry.remarks,
                    })),
                },
                fallbackMessage: "Unable to save the approved scores.",
            });

            if (payload.entries?.items) {
                setEntries(payload.entries.items);
            }
            setMessage({ type: "success", text: payload.message ?? "Approved scores saved." });
        } catch (cause) {
            setMessage({
                type: "error",
                text: toErrorMessage(cause, "Unable to save the approved scores."),
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-2" aria-busy>
                {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={`moderation-skeleton-${index}`} className="h-14 w-full" />
                ))}
            </div>
        );
    }

    if (!entries?.length) {
        return (
            <div className="space-y-3">
                {message ? <InlineAlert message={message} /> : null}
                <EmptyState
                    title="No indicator entries"
                    description="This PBAS form has no scored indicators to moderate."
                    className="py-6"
                />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {message ? <InlineAlert message={message} /> : null}

            <ul className="divide-y rounded-lg border bg-background">
                {entries.map((entry) => {
                    const inputId = `approved-${applicationId}-${entry.indicatorId}`;

                    return (
                        <li
                            key={entry.indicatorId}
                            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium break-words text-foreground">
                                    {entry.indicatorName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {entry.indicatorCode} · claimed {entry.claimedScore} · max {entry.maxScore}
                                </p>
                            </div>

                            <div className="shrink-0 space-y-1.5">
                                <Label htmlFor={inputId} className="text-xs">
                                    Approved score
                                </Label>
                                <Input
                                    id={inputId}
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={entry.maxScore}
                                    step={0.1}
                                    className="w-28 text-right"
                                    disabled={saving}
                                    value={entry.approvedScore ?? entry.claimedScore}
                                    onChange={(event) => {
                                        const next = Number(event.target.value);
                                        setEntries((current) =>
                                            (current ?? []).map((item) =>
                                                item.indicatorId === entry.indicatorId
                                                    ? {
                                                          ...item,
                                                          approvedScore: Number.isFinite(next) ? next : 0,
                                                      }
                                                    : item
                                            )
                                        );
                                    }}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="flex justify-end">
                <Button type="button" size="sm" loading={saving} disabled={saving} onClick={() => void save()}>
                    <Save aria-hidden />
                    Save approved scores
                </Button>
            </div>
        </div>
    );
}
