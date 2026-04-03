"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ReviewRecord = {
    _id: string;
    assignmentId: string;
    cycleTitle: string;
    cycleCode: string;
    criterionCode: string;
    criterionTitle: string;
    metricCode: string;
    metricTitle: string;
    metricDescription?: string;
    metricInstructions?: string;
    metricType?: string;
    dataType?: string;
    ownershipScope?: string;
    evidenceMode?: string;
    sourceModule?: string;
    benchmarkValue?: string;
    unitLabel?: string;
    sectionTitle?: string;
    sectionPrompt?: string;
    sectionGuidance?: string;
    wordLimitMin?: number;
    wordLimitMax?: number;
    contributorName: string;
    contributorEmail: string;
    contributorRole: string;
    status: string;
    assignmentStatus: string;
    dueDate?: string | Date;
    assignmentNotes?: string;
    valueSummary: string;
    narrativeResponse?: string;
    metricValueNumeric?: number;
    metricValueText?: string;
    metricValueBoolean?: boolean;
    metricValueDate?: string | Date;
    tableData?: Record<string, unknown>;
    supportingLinks: string[];
    documents: Array<{
        id: string;
        fileName?: string;
        fileUrl?: string;
        fileType?: string;
        uploadedAt?: string | Date;
        verificationStatus?: string;
        verificationRemarks?: string;
    }>;
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: Array<{
        reviewerName?: string;
        reviewerRole?: string;
        stage: string;
        decision: string;
        remarks?: string;
        reviewedAt?: string | Date;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: string | Date;
    }>;
    submittedAt?: string | Date;
    reviewedAt?: string | Date;
    approvedAt?: string | Date;
    updatedAt?: string | Date;
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
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
    actionableCount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
};

function formatDate(value?: string | Date) {
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

function formatDateTime(value?: string | Date) {
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

function formatBoolean(value?: boolean) {
    if (value === undefined) {
        return "-";
    }

    return value ? "Yes" : "No";
}

function statusBadge(status: string) {
    if (status === "Approved") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Rejected") {
        return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
    }

    if (status === "Committee Review") {
        return <Badge className="bg-blue-100 text-blue-700">{status}</Badge>;
    }

    if (status === "Under Review" || status === "Submitted") {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

export function SsrReviewBoard({
    records,
    summary,
    viewerLabel,
}: {
    records: ReviewRecord[];
    summary: ReviewSummary;
    viewerLabel: string;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [activeTab, setActiveTab] = useState<"actionable" | "history" | "all">("actionable");
    const [selectedId, setSelectedId] = useState(records[0]?._id ?? "");
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredRecords = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        return records.filter((record) => {
            const actionable = record.permissions.canReview || record.permissions.canApprove;
            if (activeTab === "actionable" && !actionable) {
                return false;
            }

            if (activeTab === "history" && actionable) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                record.metricCode,
                record.metricTitle,
                record.cycleTitle,
                record.criterionCode,
                record.contributorName,
                record.contributorEmail,
                record.status,
                record.currentStageLabel,
                record.scopeDepartmentName,
                record.scopeCollegeName,
                record.scopeUniversityName,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [activeTab, deferredSearch, records]);

    useEffect(() => {
        if (!filteredRecords.length) {
            setSelectedId("");
            return;
        }

        if (!filteredRecords.some((record) => record._id === selectedId)) {
            setSelectedId(filteredRecords[0]._id);
        }
    }, [filteredRecords, selectedId]);

    const selectedRecord = filteredRecords.find((record) => record._id === selectedId) ?? null;

    function submitDecision(decision: string) {
        if (!selectedRecord) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const response = await fetch(`/api/ssr/responses/${selectedRecord._id}/review`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        decision,
                        remarks:
                            remarks[selectedRecord._id]?.trim() ||
                            `Recorded from the ${viewerLabel.toLowerCase()} SSR workspace.`,
                    }),
                });

                const data = (await response.json()) as { message?: string };
                if (!response.ok) {
                    throw new Error(data.message ?? "Unable to record the SSR review decision.");
                }

                setRemarks((current) => ({ ...current, [selectedRecord._id]: "" }));
                setMessage({
                    type: "success",
                    text: data.message ?? "SSR review decision recorded successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to record the SSR review decision.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            {message ? (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        message.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                >
                    {message.text}
                </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Total Responses" value={summary.total} helper="All SSR submissions visible in your scope." />
                <MetricCard label="Actionable" value={summary.actionableCount} helper="Records you can currently review or approve." />
                <MetricCard label="Pending" value={summary.pendingCount} helper="Still moving through workflow stages." />
                <MetricCard label="Approved" value={summary.approvedCount} helper="Completed SSR submissions." />
                <MetricCard label="Rejected" value={summary.rejectedCount} helper="Returned or closed as rejected." />
            </section>

            <Card>
                <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <CardTitle>{viewerLabel} SSR review workspace</CardTitle>
                        <CardDescription>
                            Review scoped SSR responses with the full narrative, structured values, links, and uploaded evidence in one place.
                        </CardDescription>
                    </div>
                    <div className="w-full max-w-sm">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search metric, contributor, status, or scope"
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as "actionable" | "history" | "all")
                        }
                    >
                        <TabsList>
                            <TabsTrigger value="actionable">Actionable</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                            <TabsTrigger value="all">All</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{filteredRecords.length} visible</Badge>
                        <Badge variant="secondary">{records.length} total loaded</Badge>
                    </div>
                </CardContent>
            </Card>

            <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Submission register</CardTitle>
                        <CardDescription>
                            Open a response to inspect the submission and evidence before taking a workflow action.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filteredRecords.length ? (
                            filteredRecords.map((record) => {
                                const isActive = record._id === selectedId;
                                const actionable =
                                    record.permissions.canReview || record.permissions.canApprove;

                                return (
                                    <button
                                        className={`w-full rounded-lg border p-4 text-left transition ${
                                            isActive
                                                ? "border-zinc-900 bg-zinc-100"
                                                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white"
                                        }`}
                                        key={record._id}
                                        onClick={() => setSelectedId(record._id)}
                                        type="button"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                                                    {record.metricCode}
                                                </p>
                                                <h3 className="mt-2 truncate text-base font-semibold text-zinc-950">
                                                    {record.metricTitle}
                                                </h3>
                                                <p className="mt-1 text-sm text-zinc-500">
                                                    {record.contributorName || "Contributor not mapped"} •{" "}
                                                    {record.currentStageLabel}
                                                </p>
                                            </div>
                                            {statusBadge(record.status)}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                                            <span>{record.documents.length} docs</span>
                                            <span>{record.supportingLinks.length} links</span>
                                            <span>{formatDateTime(record.updatedAt)}</span>
                                        </div>
                                        {actionable ? (
                                            <div className="mt-3">
                                                <Badge className="bg-zinc-900 text-white">Actionable</Badge>
                                            </div>
                                        ) : null}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No SSR responses matched the current filters.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {selectedRecord ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>
                                            {selectedRecord.metricCode} · {selectedRecord.metricTitle}
                                        </CardTitle>
                                        <CardDescription>
                                            {selectedRecord.cycleTitle} · {selectedRecord.criterionCode}
                                            {selectedRecord.sectionTitle
                                                ? ` · ${selectedRecord.sectionTitle}`
                                                : ""}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {statusBadge(selectedRecord.status)}
                                        <Badge variant="secondary">
                                            {selectedRecord.currentStageLabel}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <InfoCard label="Contributor" value={selectedRecord.contributorName || "-"} helper={`${selectedRecord.contributorRole} • ${selectedRecord.contributorEmail || "No email"}`} />
                                <InfoCard label="Response Type" value={selectedRecord.dataType || "-"} helper={selectedRecord.metricType || "Metric"} />
                                <InfoCard label="Ownership" value={selectedRecord.ownershipScope || "-"} helper={selectedRecord.scopeDepartmentName || selectedRecord.scopeCollegeName || selectedRecord.scopeUniversityName || "Unscoped"} />
                                <InfoCard label="Evidence Mode" value={selectedRecord.evidenceMode || "-"} helper={`${selectedRecord.documents.length} document(s) and ${selectedRecord.supportingLinks.length} link(s)`} />
                                <InfoCard label="Due Date" value={formatDate(selectedRecord.dueDate)} helper={`Assignment status: ${selectedRecord.assignmentStatus}`} />
                                <InfoCard label="Submitted" value={formatDateTime(selectedRecord.submittedAt)} helper={`Updated ${formatDateTime(selectedRecord.updatedAt)}`} />
                                <InfoCard label="Reviewed" value={formatDateTime(selectedRecord.reviewedAt)} helper={`Approved ${formatDateTime(selectedRecord.approvedAt)}`} />
                                <InfoCard label="Value Summary" value={selectedRecord.valueSummary} helper={selectedRecord.unitLabel || selectedRecord.benchmarkValue || selectedRecord.sourceModule || "Captured response value"} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Response payload</CardTitle>
                                <CardDescription>
                                    Narrative, structured values, and contributor notes exactly as submitted.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedRecord.metricDescription ? (
                                    <SectionBlock title="Metric description" body={selectedRecord.metricDescription} />
                                ) : null}
                                {selectedRecord.metricInstructions ? (
                                    <SectionBlock title="Instructions" body={selectedRecord.metricInstructions} />
                                ) : null}
                                {selectedRecord.sectionPrompt ? (
                                    <SectionBlock
                                        title="Narrative prompt"
                                        body={selectedRecord.sectionPrompt}
                                        helper={
                                            selectedRecord.wordLimitMin || selectedRecord.wordLimitMax
                                                ? `Word limit: ${selectedRecord.wordLimitMin ?? 0} to ${selectedRecord.wordLimitMax ?? "unbounded"}`
                                                : selectedRecord.sectionGuidance
                                        }
                                    />
                                ) : null}
                                {selectedRecord.narrativeResponse ? (
                                    <SectionBlock title="Narrative response" body={selectedRecord.narrativeResponse} />
                                ) : null}

                                <div className="grid gap-4 md:grid-cols-2">
                                    <InfoCard
                                        label="Numeric value"
                                        value={
                                            selectedRecord.metricValueNumeric !== undefined
                                                ? String(selectedRecord.metricValueNumeric)
                                                : "-"
                                        }
                                    />
                                    <InfoCard
                                        label="Text value"
                                        value={selectedRecord.metricValueText || "-"}
                                    />
                                    <InfoCard
                                        label="Boolean value"
                                        value={formatBoolean(selectedRecord.metricValueBoolean)}
                                    />
                                    <InfoCard
                                        label="Date value"
                                        value={formatDate(selectedRecord.metricValueDate)}
                                    />
                                </div>

                                {selectedRecord.tableData &&
                                Object.keys(selectedRecord.tableData).length ? (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                                            Structured table data
                                        </p>
                                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-zinc-700">
                                            {JSON.stringify(selectedRecord.tableData, null, 2)}
                                        </pre>
                                    </div>
                                ) : null}

                                {selectedRecord.contributorRemarks ? (
                                    <SectionBlock
                                        title="Contributor remarks"
                                        body={selectedRecord.contributorRemarks}
                                    />
                                ) : null}
                                {selectedRecord.assignmentNotes ? (
                                    <SectionBlock
                                        title="Assignment notes"
                                        body={selectedRecord.assignmentNotes}
                                    />
                                ) : null}
                            </CardContent>
                        </Card>

                        <section className="grid gap-6 xl:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Supporting links</CardTitle>
                                    <CardDescription>
                                        URLs submitted alongside the metric response.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.supportingLinks.length ? (
                                        selectedRecord.supportingLinks.map((link) => (
                                            <a
                                                className="block rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 underline"
                                                href={link}
                                                key={link}
                                                rel="noreferrer"
                                                target="_blank"
                                            >
                                                {link}
                                            </a>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No supporting links were submitted for this response.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Uploaded documents</CardTitle>
                                    <CardDescription>
                                        Evidence files linked to this SSR response, including their verification status.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.documents.length ? (
                                        selectedRecord.documents.map((document) => (
                                            <div
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                key={document.id}
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium text-zinc-950">
                                                            {document.fileName || "Document"}
                                                        </p>
                                                        <p className="mt-1 text-sm text-zinc-500">
                                                            {document.fileType || "Unknown type"} • Uploaded{" "}
                                                            {formatDateTime(document.uploadedAt)}
                                                        </p>
                                                    </div>
                                                    {statusBadge(
                                                        document.verificationStatus || "Pending"
                                                    )}
                                                </div>
                                                {document.verificationRemarks ? (
                                                    <p className="mt-3 text-sm text-zinc-600">
                                                        {document.verificationRemarks}
                                                    </p>
                                                ) : null}
                                                {document.fileUrl ? (
                                                    <a
                                                        className="mt-3 inline-flex text-sm font-medium text-zinc-900 underline"
                                                        href={document.fileUrl}
                                                        rel="noreferrer"
                                                        target="_blank"
                                                    >
                                                        Open document
                                                    </a>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No documents were attached to this response.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        <Card>
                            <CardHeader>
                                <CardTitle>Workflow action</CardTitle>
                                <CardDescription>
                                    Action buttons appear only when the current stage is assigned to your governance scope.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Add workflow remarks for the next reviewer or contributor"
                                    value={remarks[selectedRecord._id] ?? ""}
                                    onChange={(event) =>
                                        setRemarks((current) => ({
                                            ...current,
                                            [selectedRecord._id]: event.target.value,
                                        }))
                                    }
                                />
                                <div className="flex flex-wrap gap-3">
                                    {selectedRecord.availableDecisions.length &&
                                    (selectedRecord.permissions.canReview ||
                                        selectedRecord.permissions.canApprove) ? (
                                        selectedRecord.availableDecisions.map((decision) => (
                                            <Button
                                                disabled={isPending}
                                                key={decision}
                                                onClick={() => submitDecision(decision)}
                                                type="button"
                                                variant={
                                                    decision === "Reject" ? "secondary" : "default"
                                                }
                                            >
                                                {decision}
                                            </Button>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">
                                            This response is currently read-only in your governance scope.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <section className="grid gap-6 xl:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Review history</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.reviewHistory.length ? (
                                        selectedRecord.reviewHistory.map((entry, index) => (
                                            <div
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                key={`${entry.stage}-${entry.reviewedAt}-${index}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium text-zinc-950">
                                                            {entry.stage}
                                                        </p>
                                                        <p className="text-sm text-zinc-500">
                                                            {entry.reviewerName || "Reviewer"}{" "}
                                                            {entry.reviewerRole
                                                                ? `• ${entry.reviewerRole}`
                                                                : ""}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary">{entry.decision}</Badge>
                                                </div>
                                                {entry.remarks ? (
                                                    <p className="mt-3 text-sm text-zinc-600">
                                                        {entry.remarks}
                                                    </p>
                                                ) : null}
                                                <p className="mt-3 text-xs text-zinc-500">
                                                    {formatDateTime(entry.reviewedAt)}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No review actions have been recorded yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Status timeline</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.statusLogs.length ? (
                                        selectedRecord.statusLogs.map((entry, index) => (
                                            <div
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                key={`${entry.status}-${entry.changedAt}-${index}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-medium text-zinc-950">
                                                        {entry.status}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {formatDateTime(entry.changedAt)}
                                                    </p>
                                                </div>
                                                <p className="mt-2 text-sm text-zinc-500">
                                                    {entry.actorName || "System"}
                                                    {entry.actorRole ? ` • ${entry.actorRole}` : ""}
                                                </p>
                                                {entry.remarks ? (
                                                    <p className="mt-2 text-sm text-zinc-600">
                                                        {entry.remarks}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            Status changes will appear here once the workflow starts moving.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-sm text-zinc-500">
                            Select an SSR response from the register to inspect it.
                        </CardContent>
                    </Card>
                )}
            </section>
        </div>
    );
}

function MetricCard({
    label,
    value,
    helper,
}: {
    label: string;
    value: number;
    helper: string;
}) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                    {label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
                <p className="mt-2 text-sm text-zinc-500">{helper}</p>
            </CardContent>
        </Card>
    );
}

function InfoCard({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper?: string;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 font-semibold text-zinc-950">{value}</p>
            {helper ? <p className="mt-2 text-sm text-zinc-500">{helper}</p> : null}
        </div>
    );
}

function SectionBlock({
    title,
    body,
    helper,
}: {
    title: string;
    body: string;
    helper?: string;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{title}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{body}</p>
            {helper ? <p className="mt-3 text-xs text-zinc-500">{helper}</p> : null}
        </div>
    );
}
