import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import { PbasSourceLoadingSkeleton, ReadonlySourceTable } from "@/components/pbas/pbas-source-table";
import type { PbasSnapshot } from "@/lib/pbas/validators";
import type { PbasSourceRow, PbasSourceStepConfig } from "@/components/pbas/pbas-types";

export function TeachingSnapshotCard({ snapshot }: { snapshot: PbasSnapshot["category1"] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Teaching Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
                <StatTile label="Classes Taken" value={snapshot.classesTaken} />
                <StatTile label="Courses Taught" value={snapshot.coursesTaught.length} />
                <StatTile label="Mentoring" value={snapshot.mentoringCount} />
                <StatTile label="Lab Supervision" value={snapshot.labSupervisionCount} />
            </CardContent>
        </Card>
    );
}

export function PbasStepTeachingSources({
    config,
    snapshot,
    canEdit,
    onRemove,
    loading,
    error,
    hasDetail,
}: {
    config?: PbasSourceStepConfig;
    snapshot: PbasSnapshot["category1"];
    canEdit: boolean;
    onRemove: (row: PbasSourceRow) => void;
    loading: boolean;
    error: string | null;
    hasDetail: boolean;
}) {
    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-semibold text-foreground">{config?.label ?? "Teaching Sources"}</p>
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
                            key={`teaching-${group.title}`}
                            title={group.title}
                            rows={group.rows}
                            canEdit={canEdit}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            ) : null}

            <TeachingSnapshotCard snapshot={snapshot} />
        </div>
    );
}
