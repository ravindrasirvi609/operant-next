"use client";

import { InlineAlert } from "@/components/ui/inline-alert";
import { StatTile } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/page-header";
import { PbasSourceGroup, PbasSourceLoadingSkeleton } from "@/components/pbas/pbas-source-table";
import type { PbasSourceRow, PbasSourceStepConfig } from "@/components/pbas/pbas-types";
import type { PbasSourceStepConfig as PbasSourceStepDescriptor } from "@/lib/pbas/source-config";
import type { PbasSnapshot } from "@/lib/pbas/validators";

/**
 * One PBAS source-selection step, for any of teaching / research /
 * institutional.
 *
 * Replaces `pbas-step-teaching-sources.tsx`, `pbas-step-research-sources.tsx`,
 * and `pbas-step-institutional-sources.tsx`, which were the same 70-line file
 * three times over. The only real differences were a fallback label, the snapshot
 * card at the bottom, and the `key=` prefix on a mapped list — all three of which
 * are now fields on the step descriptor in lib/pbas/source-config.ts.
 *
 * The snapshot cards went with them: `TeachingSnapshotCard`,
 * `ResearchSnapshotCard`, and `InstitutionalSnapshotCard` were three `<Card>`s
 * wrapping a `StatTile` grid with different labels and a different column count
 * each (`sm:grid-cols-2`, `lg:grid-cols-3`, `lg:grid-cols-3`), so the same
 * information changed shape between steps for no reason.
 */
export function PbasStepSources({
    descriptor,
    config,
    snapshot,
    canEdit,
    onToggle,
    loading,
    error,
    hasDetail,
}: {
    descriptor: PbasSourceStepDescriptor;
    /** Built rows for this step; absent until the draft detail has loaded. */
    config?: PbasSourceStepConfig;
    snapshot: PbasSnapshot;
    canEdit: boolean;
    onToggle: (row: PbasSourceRow) => void;
    loading: boolean;
    error: string | null;
    hasDetail: boolean;
}) {
    const tiles = descriptor.snapshotTiles(snapshot);

    return (
        <div className="space-y-6">
            <SectionHeader title={descriptor.title} description={config?.description} />

            <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">{descriptor.snapshotTitle}</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {tiles.map((tile) => (
                        <StatTile key={tile.label} label={tile.label} value={tile.value} />
                    ))}
                </div>
            </div>

            {loading ? (
                <PbasSourceLoadingSkeleton />
            ) : error ? (
                <InlineAlert message={{ type: "error", text: error }} />
            ) : hasDetail ? (
                <div className="space-y-4">
                    {(config?.groups ?? []).map((group) => (
                        <PbasSourceGroup
                            key={`${descriptor.key}-${group.title}`}
                            title={group.title}
                            rows={group.rows}
                            canEdit={canEdit}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            ) : (
                <InlineAlert
                    tone="info"
                    title="No draft selected"
                    // The originals rendered `null` here, so a faculty member with
                    // no draft saw the snapshot and then nothing at all, with no
                    // indication that anything was missing.
                >
                    Create or open a PBAS draft to choose which records it includes.
                </InlineAlert>
            )}
        </div>
    );
}
