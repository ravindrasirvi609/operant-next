import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import { PbasSourceLoadingSkeleton, ReadonlySourceTable } from "@/components/pbas/pbas-source-table";
import type { PbasSnapshot } from "@/lib/pbas/validators";
import type { PbasSourceRow, PbasSourceStepConfig } from "@/components/pbas/pbas-types";

export function ResearchSnapshotCard({ snapshot }: { snapshot: PbasSnapshot["category2"] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Research Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatTile label="Papers" value={snapshot.researchPapers.length} />
                <StatTile label="Books" value={snapshot.books.length} />
                <StatTile label="Patents" value={snapshot.patents.length} />
                <StatTile label="Projects" value={snapshot.projects.length} />
                <StatTile label="Conferences" value={snapshot.conferences.length} />
            </CardContent>
        </Card>
    );
}

export function PbasStepResearchSources({
    config,
    snapshot,
    canEdit,
    onRemove,
    loading,
    error,
    hasDetail,
}: {
    config?: PbasSourceStepConfig;
    snapshot: PbasSnapshot["category2"];
    canEdit: boolean;
    onRemove: (row: PbasSourceRow) => void;
    loading: boolean;
    error: string | null;
    hasDetail: boolean;
}) {
    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-semibold text-foreground">{config?.label ?? "Research Sources"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{config?.description}</p>
            </div>

            {loading ? (
                <PbasSourceLoadingSkeleton />
            ) : error ? (
                <div className="rounded-lg border border-destructive-border bg-destructive-muted p-4 text-sm text-destructive-muted-foreground">
                    {error}
                </div>
            ) : hasDetail ? (
                <div className="grid gap-4">
                    {(config?.groups ?? []).map((group) => (
                        <ReadonlySourceTable
                            key={`research-${group.title}`}
                            title={group.title}
                            rows={group.rows}
                            canEdit={canEdit}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            ) : null}

            <ResearchSnapshotCard snapshot={snapshot} />
        </div>
    );
}
