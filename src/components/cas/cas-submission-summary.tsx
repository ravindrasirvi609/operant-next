"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APIScoreCalculator } from "@/components/cas/cas-api-score-calculator";
import { CASCommitteeTimeline } from "@/components/cas/cas-committee-timeline";
import { CASStatusTimeline } from "@/components/cas/cas-status-timeline";
import { LinkedAchievementsReadonly } from "@/components/cas/cas-linked-achievements-table";
import { ManualAchievementsReadonly } from "@/components/cas/cas-manual-achievements-readonly";
import { emptyCasAchievementBucket, type CasApp, type CasDocumentItem, type PbasOption } from "@/components/cas/cas-types";

export function CasSubmissionSummary({
    application,
    pbasOptions,
    documents,
    docLoading,
    docError,
}: {
    application: CasApp;
    pbasOptions: PbasOption[];
    documents: CasDocumentItem[];
    docLoading: boolean;
    docError: string | null;
}) {
    const linkedAchievements = application.linkedAchievements ?? emptyCasAchievementBucket();
    const manualAchievements = application.manualAchievements ?? emptyCasAchievementBucket();
    const computedEligibility = application.eligibility ?? {
        isEligible: false,
        message: "Waiting for the latest CAS calculation from the server.",
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle>Submission Summary</CardTitle>
                            <CardDescription>
                                {application.applicationYear} CAS promotion application — read-only after submission.
                            </CardDescription>
                        </div>
                        <Badge>{application.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 p-4">
                        <span className="text-sm font-semibold text-foreground">{application.currentDesignation}</span>
                        <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                        <span className="text-sm font-semibold text-foreground">{application.applyingForDesignation}</span>
                    </div>
                </CardContent>
            </Card>

            <APIScoreCalculator
                score={application.apiScore}
                eligibility={computedEligibility}
                breakup={application.apiBreakup}
            />

            <LinkedAchievementsReadonly linkedAchievements={linkedAchievements} />
            <ManualAchievementsReadonly manualAchievements={manualAchievements} />

            <Card>
                <CardHeader>
                    <CardTitle>Document Checklist</CardTitle>
                    <CardDescription>Read-only view of documents submitted with this CAS application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {docLoading ? (
                        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                            Loading CAS documents...
                        </div>
                    ) : docError ? (
                        <div className="rounded-lg border border-destructive-border bg-destructive-muted p-4 text-sm text-destructive-muted-foreground">
                            {docError}
                        </div>
                    ) : documents.length ? (
                        documents.map((doc) => (
                            <div key={doc.documentType} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{doc.label}</p>
                                    <p className="text-xs text-muted-foreground">{doc.isMandatory ? "Mandatory" : "Optional"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {doc.documentId?.fileUrl ? (
                                        <a
                                            href={doc.documentId.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                                        >
                                            <ShieldCheck className="size-4" />
                                            {doc.documentId.fileName || "View file"}
                                        </a>
                                    ) : null}
                                    <Badge variant={doc.documentId?._id ? "default" : "secondary"}>
                                        {doc.documentId?._id ? "Uploaded" : "Missing"}
                                    </Badge>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                            No CAS documents defined yet.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Linked PBAS Reports</CardTitle>
                    <CardDescription>PBAS reports linked to this CAS application.</CardDescription>
                </CardHeader>
                <CardContent>
                    {application.pbasReports.length ? (
                        <div className="flex flex-wrap gap-2">
                            {application.pbasReports.map((id) => {
                                const option = pbasOptions.find((item) => item._id === id);
                                return <Badge key={id}>{option?.academicYear ?? id}</Badge>;
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No PBAS reports linked.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Status Timeline</CardTitle>
                    <CardDescription>Every status transition for this CAS application is logged here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CASStatusTimeline logs={application.statusLogs} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Committee Review Trail</CardTitle>
                    <CardDescription>Department, committee, and admin decisions are stored in the dedicated CAS committee register.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CASCommitteeTimeline reviews={application.committeeReviews ?? []} />
                </CardContent>
            </Card>
        </div>
    );
}
