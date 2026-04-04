"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type DocumentRecord = {
    id: string;
    fileName?: string;
    fileUrl?: string;
    verificationStatus?: string;
    verificationRemarks?: string;
};

type ReviewRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    scopeType: string;
    focusArea: string;
    unitLabel: string;
    planStatus: string;
    planSummary?: string;
    planStrategicPriorities?: string;
    planTargets: {
        meetings: number;
        initiatives: number;
        policies: number;
        complianceReviews: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    governanceStructureNarrative?: string;
    leadershipParticipationNarrative?: string;
    iqacFrameworkNarrative?: string;
    qualityInitiativesNarrative?: string;
    policyGovernanceNarrative?: string;
    complianceMonitoringNarrative?: string;
    stakeholderParticipationNarrative?: string;
    institutionalBestPracticesNarrative?: string;
    feedbackLoopNarrative?: string;
    actionPlan?: string;
    supportingLinks: string[];
    documents: DocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    iqacMeetings: Array<{
        id: string;
        meetingType: string;
        title: string;
        meetingDate?: string;
        chairedBy?: string;
        attendeeCount?: number;
        agendaSummary?: string;
        decisionSummary?: string;
        actionTakenSummary?: string;
        remarks?: string;
        document?: DocumentRecord;
    }>;
    qualityInitiatives: Array<{
        id: string;
        initiativeType: string;
        title: string;
        startDate?: string;
        endDate?: string;
        status: string;
        ownerName?: string;
        impactSummary?: string;
        remarks?: string;
        document?: DocumentRecord;
    }>;
    policyCirculars: Array<{
        id: string;
        policyType: string;
        title: string;
        issueDate?: string;
        issuingAuthority?: string;
        applicabilityScope?: string;
        revisionStatus: string;
        summary?: string;
        remarks?: string;
        document?: DocumentRecord;
    }>;
    complianceReviews: Array<{
        id: string;
        reviewType: string;
        title: string;
        reviewDate?: string;
        status: string;
        riskLevel: string;
        observationsSummary?: string;
        actionTakenSummary?: string;
        remarks?: string;
        document?: DocumentRecord;
    }>;
    reviewHistory: Array<{
        reviewerName?: string;
        reviewerRole?: string;
        stage: string;
        decision: string;
        remarks?: string;
        reviewedAt?: string;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: string;
    }>;
    valueSummary: string;
    submittedAt?: string;
    reviewedAt?: string;
    approvedAt?: string;
    updatedAt?: string;
    currentStageLabel: string;
    currentStageKind: string | null;
    availableDecisions: string[];
    permissions: {
        canView: boolean;
        canReview: boolean;
        canApprove: boolean;
        canReject: boolean;
    };
};

type ReviewSummary = {
    total: number;
    actionable: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
};

const narrativeSections: Array<{ key: keyof ReviewRecord; label: string }> = [
    { key: "governanceStructureNarrative", label: "Governance structure" },
    { key: "leadershipParticipationNarrative", label: "Leadership participation" },
    { key: "iqacFrameworkNarrative", label: "IQAC framework" },
    { key: "qualityInitiativesNarrative", label: "Quality initiatives" },
    { key: "policyGovernanceNarrative", label: "Policy and circular governance" },
    { key: "complianceMonitoringNarrative", label: "Compliance monitoring" },
    { key: "stakeholderParticipationNarrative", label: "Stakeholder participation" },
    { key: "institutionalBestPracticesNarrative", label: "Institutional best practices" },
    { key: "feedbackLoopNarrative", label: "Feedback loop" },
    { key: "actionPlan", label: "Action plan" },
];

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    const data = (await response.json()) as T & { message?: string };
    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(value?: string) {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusBadge(status: string) {
    if (status === "Approved") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Rejected") {
        return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
    }

    if (["Submitted", "IQAC Review", "Leadership Review", "Governance Review"].includes(status)) {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

function EvidenceLink({
    label,
    document,
}: {
    label: string;
    document?: DocumentRecord | null;
}) {
    if (!document?.fileUrl) {
        return <p className="mt-2 text-xs text-zinc-500">{label}: no linked file available.</p>;
    }

    return (
        <a
            className="mt-2 inline-block text-xs font-medium text-zinc-900 underline"
            href={document.fileUrl}
            rel="noreferrer"
            target="_blank"
        >
            {label}: {document.fileName || "Open document"}
            {document.verificationStatus ? ` · ${document.verificationStatus}` : ""}
        </a>
    );
}

function renderNarrative(title: string, value?: string) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-950">{title}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                {value?.trim() || "Not provided."}
            </p>
        </div>
    );
}

export function GovernanceLeadershipIqacReviewBoard({
    summary,
    records,
    viewerLabel,
}: {
    summary: ReviewSummary;
    records: ReviewRecord[];
    viewerLabel: string;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [selectedId, setSelectedId] = useState(records[0]?._id ?? "");
    const [decision, setDecision] = useState("Forward");
    const [remarks, setRemarks] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredRecords = useMemo(
        () =>
            records.filter((record) => {
                const query = deferredSearch.trim().toLowerCase();
                if (!query) {
                    return true;
                }

                return [
                    record.planTitle,
                    record.unitLabel,
                    record.assigneeName,
                    record.status,
                    record.currentStageLabel,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(query));
            }),
        [deferredSearch, records]
    );

    const selectedRecord =
        filteredRecords.find((record) => record._id === selectedId) ??
        filteredRecords[0] ??
        null;

    useEffect(() => {
        setDecision(selectedRecord?.availableDecisions[0] ?? "Forward");
        setRemarks("");
    }, [selectedRecord?._id, selectedRecord?.availableDecisions]);

    function submitReview() {
        if (!selectedRecord) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const data = await requestJson<{ message?: string }>(
                    `/api/governance-leadership-iqac/assignments/${selectedRecord._id}/review`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            decision,
                            remarks: remarks.trim(),
                        }),
                    }
                );

                setMessage({
                    type: "success",
                    text:
                        data.message ??
                        "Governance Leadership / IQAC review recorded successfully.",
                });
                setRemarks("");
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to record the governance leadership / IQAC review.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
                <SummaryCard label="Total" value={summary.total} />
                <SummaryCard label="Actionable" value={summary.actionable} />
                <SummaryCard label="Pending" value={summary.pendingCount} />
                <SummaryCard label="Approved" value={summary.approvedCount} />
                <SummaryCard label="Rejected" value={summary.rejectedCount} />
            </div>

            <Input
                className="max-w-sm"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by plan, unit, assignee, or status"
                value={search}
            />

            {message ? (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        message.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-rose-200 bg-rose-50 text-rose-900"
                    }`}
                >
                    {message.text}
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                <div className="space-y-3">
                    {filteredRecords.length ? (
                        filteredRecords.map((record) => {
                            const active = record._id === selectedRecord?._id;

                            return (
                                <button
                                    className={`w-full rounded-xl border p-4 text-left transition ${
                                        active
                                            ? "border-zinc-900 bg-zinc-900 text-white"
                                            : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100"
                                    }`}
                                    key={record._id}
                                    onClick={() => setSelectedId(record._id)}
                                    type="button"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">
                                                {record.focusArea}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold">
                                                {record.planTitle}
                                            </p>
                                            <p className="mt-1 text-xs opacity-80">
                                                {record.unitLabel} · {record.assigneeName}
                                            </p>
                                        </div>
                                        <div>{statusBadge(record.status)}</div>
                                    </div>
                                    <p className="mt-3 text-xs opacity-80">
                                        {record.currentStageLabel} · {record.valueSummary}
                                    </p>
                                </button>
                            );
                        })
                    ) : (
                        <Card>
                            <CardContent className="p-6 text-sm text-zinc-500">
                                No governance leadership / IQAC records match the current filter.
                            </CardContent>
                        </Card>
                    )}
                </div>

                {selectedRecord ? (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {statusBadge(selectedRecord.status)}
                                        <Badge variant="secondary">{selectedRecord.currentStageLabel}</Badge>
                                        <Badge variant="outline">{selectedRecord.scopeType}</Badge>
                                        <Badge variant="outline">{selectedRecord.focusArea}</Badge>
                                    </div>
                                    <h3 className="mt-3 text-2xl font-semibold text-zinc-950">
                                        {selectedRecord.planTitle}
                                    </h3>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        {selectedRecord.unitLabel} · {selectedRecord.academicYearLabel} ·{" "}
                                        {selectedRecord.assigneeName}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        Due {formatDate(selectedRecord.dueDate)} · Plan status {selectedRecord.planStatus}
                                    </p>
                                </div>
                                <div className="grid gap-2 text-right text-sm text-zinc-500">
                                    <p>{selectedRecord.iqacMeetings.length} IQAC meeting row(s)</p>
                                    <p>{selectedRecord.qualityInitiatives.length} initiative row(s)</p>
                                    <p>{selectedRecord.policyCirculars.length} policy row(s)</p>
                                    <p>{selectedRecord.complianceReviews.length} compliance row(s)</p>
                                    <p>{selectedRecord.documents.length} manual document(s)</p>
                                    <p>Updated {formatDate(selectedRecord.updatedAt)}</p>
                                </div>
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Targets and Reviewer Context</CardTitle>
                                <CardDescription>
                                    Plan targets, contributor note, and portfolio context for {viewerLabel.toLowerCase()} review.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <MetricCard label="Meeting target" value={selectedRecord.planTargets.meetings} />
                                    <MetricCard label="Initiative target" value={selectedRecord.planTargets.initiatives} />
                                    <MetricCard label="Policy target" value={selectedRecord.planTargets.policies} />
                                    <MetricCard label="Compliance target" value={selectedRecord.planTargets.complianceReviews} />
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    {selectedRecord.planSummary?.trim() || "No plan summary provided."}
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    {selectedRecord.planStrategicPriorities?.trim() || "No strategic priorities provided."}
                                </div>
                                {selectedRecord.notes ? (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                        {selectedRecord.notes}
                                    </div>
                                ) : null}
                                {selectedRecord.contributorRemarks ? (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                        <p className="font-semibold text-zinc-950">Contributor remarks</p>
                                        <p className="mt-2 whitespace-pre-wrap">
                                            {selectedRecord.contributorRemarks}
                                        </p>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Narrative Sections</CardTitle>
                                <CardDescription>
                                    Review the contributor’s governance and IQAC narrative before evaluating the structured evidence rows.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                {narrativeSections.map((section) =>
                                    renderNarrative(
                                        section.label,
                                        selectedRecord[section.key] as string | undefined
                                    )
                                )}
                            </CardContent>
                        </Card>

                        <RowCard
                            title="IQAC Meetings"
                            emptyLabel="No IQAC meeting rows were added."
                            rows={selectedRecord.iqacMeetings.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.title}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.meetingType, formatDate(row.meetingDate), row.chairedBy]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Attendees {row.attendeeCount ?? "-"}
                                    </p>
                                    {row.agendaSummary ? (
                                        <p className="mt-2 text-sm text-zinc-600">Agenda: {row.agendaSummary}</p>
                                    ) : null}
                                    {row.decisionSummary ? (
                                        <p className="mt-2 text-sm text-zinc-600">Decision: {row.decisionSummary}</p>
                                    ) : null}
                                    {row.actionTakenSummary ? (
                                        <p className="mt-2 text-sm text-zinc-600">Action taken: {row.actionTakenSummary}</p>
                                    ) : null}
                                    {row.remarks ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.remarks}</p>
                                    ) : null}
                                    <EvidenceLink document={row.document} label="Evidence" />
                                </div>
                            ))}
                        />

                        <RowCard
                            title="Quality Initiatives"
                            emptyLabel="No quality initiative rows were added."
                            rows={selectedRecord.qualityInitiatives.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.title}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.initiativeType, row.status, row.ownerName].filter(Boolean).join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Start {formatDate(row.startDate)} · End {formatDate(row.endDate)}
                                    </p>
                                    {row.impactSummary ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.impactSummary}</p>
                                    ) : null}
                                    {row.remarks ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.remarks}</p>
                                    ) : null}
                                    <EvidenceLink document={row.document} label="Evidence" />
                                </div>
                            ))}
                        />

                        <RowCard
                            title="Policy & Circular Tracking"
                            emptyLabel="No policy rows were added."
                            rows={selectedRecord.policyCirculars.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.title}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.policyType, row.revisionStatus, row.issuingAuthority]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Issue date {formatDate(row.issueDate)} · Scope {row.applicabilityScope ?? "-"}
                                    </p>
                                    {row.summary ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.summary}</p>
                                    ) : null}
                                    {row.remarks ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.remarks}</p>
                                    ) : null}
                                    <EvidenceLink document={row.document} label="Evidence" />
                                </div>
                            ))}
                        />

                        <RowCard
                            title="Compliance Reviews"
                            emptyLabel="No compliance review rows were added."
                            rows={selectedRecord.complianceReviews.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.title}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.reviewType, row.status, row.riskLevel]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Review date {formatDate(row.reviewDate)}
                                    </p>
                                    {row.observationsSummary ? (
                                        <p className="mt-2 text-sm text-zinc-600">Observations: {row.observationsSummary}</p>
                                    ) : null}
                                    {row.actionTakenSummary ? (
                                        <p className="mt-2 text-sm text-zinc-600">Action taken: {row.actionTakenSummary}</p>
                                    ) : null}
                                    {row.remarks ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.remarks}</p>
                                    ) : null}
                                    <EvidenceLink document={row.document} label="Evidence" />
                                </div>
                            ))}
                        />

                        <Card>
                            <CardHeader>
                                <CardTitle>Manual documents and links</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-2">
                                    {selectedRecord.documents.map((document) => (
                                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={document.id}>
                                            {document.fileUrl ? (
                                                <a
                                                    className="text-sm font-semibold text-zinc-950 underline"
                                                    href={document.fileUrl}
                                                    rel="noreferrer"
                                                    target="_blank"
                                                >
                                                    {document.fileName || document.id}
                                                </a>
                                            ) : (
                                                <p className="text-sm font-semibold text-zinc-950">
                                                    {document.fileName || document.id}
                                                </p>
                                            )}
                                            <p className="mt-1 text-xs text-zinc-500">
                                                {document.verificationStatus || "Verification pending"}
                                            </p>
                                            {document.verificationRemarks ? (
                                                <p className="mt-2 text-xs text-zinc-500">
                                                    {document.verificationRemarks}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                                {selectedRecord.supportingLinks.length ? (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <p className="text-sm font-semibold text-zinc-950">Supporting links</p>
                                        <div className="mt-3 flex flex-col gap-2">
                                            {selectedRecord.supportingLinks.map((link) => (
                                                <a
                                                    className="text-sm font-medium text-zinc-900 underline"
                                                    href={link}
                                                    key={link}
                                                    rel="noreferrer"
                                                    target="_blank"
                                                >
                                                    {link}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Workflow History</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-zinc-950">Review history</p>
                                    {selectedRecord.reviewHistory.length ? (
                                        selectedRecord.reviewHistory.map((entry, index) => (
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.stage}-${index}`}>
                                                <p className="text-sm font-semibold text-zinc-950">{entry.stage}</p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {[entry.reviewerName, entry.reviewerRole, entry.decision]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                                <p className="mt-2 text-sm text-zinc-600">
                                                    {entry.remarks?.trim() || "No remarks captured."}
                                                </p>
                                                <p className="mt-2 text-xs text-zinc-500">
                                                    {formatDateTime(entry.reviewedAt)}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No review entries recorded yet.
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-zinc-950">Status log</p>
                                    {selectedRecord.statusLogs.length ? (
                                        selectedRecord.statusLogs.map((entry, index) => (
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.status}-${index}`}>
                                                <p className="text-sm font-semibold text-zinc-950">{entry.status}</p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {[entry.actorName, entry.actorRole].filter(Boolean).join(" · ")}
                                                </p>
                                                <p className="mt-2 text-sm text-zinc-600">
                                                    {entry.remarks?.trim() || "No remarks captured."}
                                                </p>
                                                <p className="mt-2 text-xs text-zinc-500">
                                                    {formatDateTime(entry.changedAt)}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No workflow status entries recorded yet.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {selectedRecord.permissions.canReview ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Record Review</CardTitle>
                                    <CardDescription>
                                        Capture your governed review decision for this governance leadership / IQAC portfolio.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Decision</Label>
                                            <Select onValueChange={setDecision} value={decision}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select decision" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {selectedRecord.availableDecisions.map((item) => (
                                                        <SelectItem key={item} value={item}>
                                                            {item}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Current reviewer</Label>
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                                                {viewerLabel}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Remarks</Label>
                                        <Textarea
                                            onChange={(event) => setRemarks(event.target.value)}
                                            rows={5}
                                            value={remarks}
                                        />
                                    </div>

                                    <Button
                                        disabled={
                                            isPending ||
                                            !selectedRecord.availableDecisions.length ||
                                            !remarks.trim()
                                        }
                                        onClick={submitReview}
                                        type="button"
                                    >
                                        Save review
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
        </Card>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function RowCard({
    title,
    rows,
    emptyLabel,
}: {
    title: string;
    rows: React.ReactNode[];
    emptyLabel: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {rows.length ? (
                    rows
                ) : (
                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                        {emptyLabel}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
