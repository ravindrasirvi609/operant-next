"use client";

import { ArrowRight, Download, FileCheck2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailList } from "@/components/workspace/detail-list";
import { APIScoreCalculator } from "@/components/cas/cas-api-score-calculator";
import { CasAchievementsList } from "@/components/cas/cas-achievements-list";
import { emptyCasAchievementBucket } from "@/components/cas/cas-types";
import { formatTimestamp } from "@/lib/ui/dates";
import type { CasApp, CasDocumentItem, PbasOption } from "@/components/cas/cas-types";

/**
 * Read-only CAS record, shown once the application leaves Draft/Rejected.
 *
 * The status badge, the status timeline, and the committee trail all moved out of
 * here: the badge is in the workspace header and both timelines are in the rail.
 * The original rendered all three here *and* in the left sidebar at the same time,
 * so a submitted CAS application showed its status three times and its two
 * timelines twice each on a single screen.
 */
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
    const linked = application.linkedAchievements ?? emptyCasAchievementBucket();
    const manual = application.manualAchievements ?? emptyCasAchievementBucket();
    const eligibility = application.eligibility ?? {
        isEligible: false,
        message: "Eligibility has not been recalculated for this record yet.",
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Submission record"
                description="This application is locked while it moves through committee review."
                actions={
                    <Button asChild type="button" variant="outline" size="sm">
                        <a href={`/api/cas/${application._id}/report`}>
                            <Download aria-hidden />
                            Download PDF
                        </a>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Promotion applied for
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {application.currentDesignation}
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {application.applyingForDesignation}
                </p>
            </div>

            <DetailList
                items={[
                    { label: "Application year", value: application.applicationYear },
                    {
                        label: "Eligibility period",
                        value: `${application.eligibilityPeriod.fromYear} – ${application.eligibilityPeriod.toYear}`,
                    },
                    { label: "Experience", value: `${application.experienceYears} years` },
                    { label: "Submitted", value: formatTimestamp(application.submittedAt) },
                    { label: "Last updated", value: formatTimestamp(application.updatedAt), wide: true },
                ]}
            />

            <APIScoreCalculator
                score={application.apiScore}
                eligibility={eligibility}
                breakup={application.apiBreakup}
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Linked PBAS reports</CardTitle>
                    <CardDescription>The approved years this score was drawn from.</CardDescription>
                </CardHeader>
                <CardContent>
                    {application.pbasReports.length ? (
                        <ul className="flex flex-wrap gap-2">
                            {application.pbasReports.map((id) => {
                                const option = pbasOptions.find((item) => item._id === id);

                                return (
                                    <li key={id}>
                                        <Badge variant="outline">
                                            {option?.academicYear ?? "Unknown year"}
                                            {option?.totalApiScore !== undefined
                                                ? ` · API ${option.totalApiScore}`
                                                : ""}
                                        </Badge>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No PBAS reports were linked to this application.
                        </p>
                    )}
                </CardContent>
            </Card>

            <CasAchievementsList
                achievements={linked}
                title="Achievements from your profile"
                description="Reused from your profile records at the time of submission."
                emptyNoun="linked"
                showConferenceCount
            />
            <CasAchievementsList
                achievements={manual}
                title="Achievements you added"
                description="Entered directly in this application."
                emptyNoun="manually added"
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Document checklist</CardTitle>
                    <CardDescription>Evidence submitted with this application.</CardDescription>
                </CardHeader>
                <CardContent>
                    {docLoading ? (
                        <div className="space-y-2" aria-busy>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <Skeleton key={`doc-skeleton-${index}`} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : docError ? (
                        <InlineAlert message={{ type: "error", text: docError }} />
                    ) : documents.length ? (
                        <ul className="divide-y rounded-lg border">
                            {documents.map((doc) => (
                                <li
                                    key={doc.documentType}
                                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium break-words text-foreground">
                                            {doc.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {doc.isMandatory ? "Mandatory" : "Optional"}
                                            {doc.uploadedAt ? ` · ${formatTimestamp(doc.uploadedAt)}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {doc.documentId?.fileUrl ? (
                                            <a
                                                href={doc.documentId.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-medium text-primary hover:underline"
                                            >
                                                {doc.documentId.fileName || "View file"}
                                            </a>
                                        ) : null}
                                        <Badge
                                            variant="outline"
                                            className={
                                                doc.documentId?._id
                                                    ? "border-success-border bg-success-muted text-success-muted-foreground"
                                                    : undefined
                                            }
                                        >
                                            {doc.documentId?._id ? "Uploaded" : "Missing"}
                                        </Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={FileCheck2}
                            title="No documents on this record"
                            className="py-6"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
