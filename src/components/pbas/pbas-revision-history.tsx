import { Badge } from "@/components/ui/badge";
import type { PbasRevisionSummary } from "@/components/pbas/pbas-types";

/** Shared between the Score & Review step and the read-only Submission Summary. */
export function PbasRevisionHistory({ revisions }: { revisions: PbasRevisionSummary[] }) {
    if (!revisions.length) {
        return null;
    }

    return (
        <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-semibold text-foreground">Submission Revisions</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
                {revisions.map((revision) => (
                    <div key={revision._id} className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-foreground">Revision {revision.revisionNumber}</p>
                            <Badge variant="secondary">{revision.apiScore.totalScore}</Badge>
                        </div>
                        <p className="mt-2">
                            Submitted {new Date(revision.submittedAt).toLocaleString()}
                        </p>
                        <p>
                            {revision.approvedAt
                                ? `Approved ${new Date(revision.approvedAt).toLocaleString()}`
                                : revision.createdFromStatus}
                        </p>
                        {revision.backfillIntegrity || revision.migrationSource ? (
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                {[revision.backfillIntegrity, revision.migrationSource].filter(Boolean).join(" • ")}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
