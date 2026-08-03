import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList } from "@/components/workspace/detail-list";
import { formatTimestamp } from "@/lib/ui/dates";
import type { PbasRevisionSummary } from "@/components/pbas/pbas-types";

/**
 * Prior submissions of this PBAS form. Shared by the review step and the
 * read-only submission summary.
 *
 * `new Date(revision.submittedAt).toLocaleString()` became `formatTimestamp`,
 * which renders a dash for a missing value instead of "Invalid Date" — and
 * `approvedAt` is optional on this type, so that case was reachable.
 */
export function PbasRevisionHistory({ revisions }: { revisions: PbasRevisionSummary[] }) {
    if (!revisions.length) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submission revisions</CardTitle>
                <CardDescription>
                    Each submission is archived with the API score it carried at the time.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {revisions.map((revision) => {
                    const provenance = [revision.backfillIntegrity, revision.migrationSource]
                        .filter(Boolean)
                        .join(" · ");

                    return (
                        <div key={revision._id} className="rounded-lg border bg-muted/40 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                    Revision {revision.revisionNumber}
                                </p>
                                <Badge variant="outline">API {revision.apiScore.totalScore}</Badge>
                            </div>
                            <DetailList
                                className="mt-3"
                                items={[
                                    { label: "Submitted", value: formatTimestamp(revision.submittedAt) },
                                    {
                                        label: revision.approvedAt ? "Approved" : "Created from",
                                        value: revision.approvedAt
                                            ? formatTimestamp(revision.approvedAt)
                                            : revision.createdFromStatus,
                                    },
                                    ...(provenance ? [{ label: "Provenance", value: provenance, wide: true }] : []),
                                ]}
                            />
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
