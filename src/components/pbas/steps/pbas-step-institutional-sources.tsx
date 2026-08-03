import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import { PbasSourceLoadingSkeleton, ReadonlySourceTable } from "@/components/pbas/pbas-source-table";
import type { PbasSnapshot } from "@/lib/pbas/validators";
import type { PbasSourceRow, PbasSourceStepConfig } from "@/components/pbas/pbas-types";

export function InstitutionalSnapshotCard({ snapshot }: { snapshot: PbasSnapshot["category3"] }) {
    const guidanceCount = snapshot.studentGuidance.reduce((sum, item) => sum + item.count, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Institutional Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatTile label="Committees" value={snapshot.committees.length} />
                <StatTile label="Admin Duties" value={snapshot.administrativeDuties.length} />
                <StatTile label="Exam Duties" value={snapshot.examDuties.length} />
                <StatTile label="Guidance" value={guidanceCount} />
                <StatTile label="Extension Activities" value={snapshot.extensionActivities.length} />
            </CardContent>
        </Card>
    );
}

export function PbasStepInstitutionalSources({
    config,
    snapshot,
    canEdit,
    onRemove,
    loading,
    error,
    hasDetail,
}: {
    config?: PbasSourceStepConfig;
    snapshot: PbasSnapshot["category3"];
    canEdit: boolean;
    onRemove: (row: PbasSourceRow) => void;
    loading: boolean;
    error: string | null;
    hasDetail: boolean;
}) {
    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-semibold text-foreground">{config?.label ?? "Institutional Sources"}</p>
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
                            key={`institutional-${group.title}`}
                            title={group.title}
                            rows={group.rows}
                            canEdit={canEdit}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            ) : null}

            <InstitutionalSnapshotCard snapshot={snapshot} />
        </div>
    );
}
