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
    planStrategyGoals?: string;
    planTargets: {
        classrooms: number;
        laboratories: number;
        books: number;
        journals: number;
        eResources: number;
        bandwidthMbps: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    infrastructureOverview?: string;
    libraryOverview?: string;
    digitalAccessStrategy?: string;
    maintenanceProtocol?: string;
    utilizationInsights?: string;
    accessibilitySupport?: string;
    greenPractices?: string;
    safetyCompliance?: string;
    studentSupportServices?: string;
    resourceGapActionPlan?: string;
    supportingLinks: string[];
    documents: DocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    facilities: Array<{
        id: string;
        facilityType: string;
        name: string;
        identifier?: string;
        buildingName?: string;
        quantity?: number;
        capacity?: number;
        areaSqFt?: number;
        ictEnabled: boolean;
        status: string;
        utilizationPercent?: number;
        remarks?: string;
        document?: DocumentRecord;
    }>;
    libraryResources: Array<{
        id: string;
        resourceType: string;
        title: string;
        category?: string;
        vendorPublisher?: string;
        accessionNumber?: string;
        isbnIssn?: string;
        copiesCount?: number;
        subscriptionStartDate?: string;
        subscriptionEndDate?: string;
        accessMode: string;
        availabilityStatus: string;
        usageCount?: number;
        remarks?: string;
        document?: DocumentRecord;
    }>;
    usageRows: Array<{
        id: string;
        usageType: string;
        title: string;
        periodLabel?: string;
        usageCount?: number;
        satisfactionScore?: number;
        targetGroup?: string;
        remarks?: string;
        document?: DocumentRecord;
    }>;
    maintenanceRows: Array<{
        id: string;
        assetCategory: string;
        assetName: string;
        maintenanceType: string;
        vendorName?: string;
        serviceDate?: string;
        nextDueDate?: string;
        status: string;
        costAmount?: number;
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
    { key: "infrastructureOverview", label: "Infrastructure overview" },
    { key: "libraryOverview", label: "Library overview" },
    { key: "digitalAccessStrategy", label: "Digital access strategy" },
    { key: "maintenanceProtocol", label: "Maintenance protocol" },
    { key: "utilizationInsights", label: "Utilization insights" },
    { key: "accessibilitySupport", label: "Accessibility support" },
    { key: "greenPractices", label: "Green practices" },
    { key: "safetyCompliance", label: "Safety compliance" },
    { key: "studentSupportServices", label: "Student support services" },
    { key: "resourceGapActionPlan", label: "Resource gap action plan" },
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

    if (["Submitted", "Infrastructure Review", "Under Review", "Committee Review"].includes(status)) {
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

export function InfrastructureLibraryReviewBoard({
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
                    `/api/infrastructure-library/assignments/${selectedRecord._id}/review`,
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
                        "Infrastructure & library review recorded successfully.",
                });
                setRemarks("");
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to record the infrastructure/library review.",
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
                                No infrastructure/library records match the current filter.
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
                                    <p>{selectedRecord.facilities.length} facility row(s)</p>
                                    <p>{selectedRecord.libraryResources.length} library row(s)</p>
                                    <p>{selectedRecord.usageRows.length} usage row(s)</p>
                                    <p>{selectedRecord.maintenanceRows.length} maintenance row(s)</p>
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
                                    <MetricCard label="Classrooms target" value={selectedRecord.planTargets.classrooms} />
                                    <MetricCard label="Laboratories target" value={selectedRecord.planTargets.laboratories} />
                                    <MetricCard label="Books target" value={selectedRecord.planTargets.books} />
                                    <MetricCard label="Journals target" value={selectedRecord.planTargets.journals} />
                                    <MetricCard label="E-resources target" value={selectedRecord.planTargets.eResources} />
                                    <MetricCard label="Bandwidth target" value={selectedRecord.planTargets.bandwidthMbps} />
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    {selectedRecord.planSummary?.trim() || "No plan summary provided."}
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    {selectedRecord.planStrategyGoals?.trim() || "No plan strategy goals provided."}
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
                                    Review the contributor’s infrastructure and library narrative before evaluating evidence rows.
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
                            title="Facilities"
                            emptyLabel="No facilities were added."
                            rows={selectedRecord.facilities.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.name}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.facilityType, row.buildingName, row.identifier, row.status]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Qty {row.quantity ?? "-"} · Capacity {row.capacity ?? "-"} · Area {row.areaSqFt ?? "-"} · ICT {row.ictEnabled ? "Yes" : "No"} · Utilization {row.utilizationPercent ?? "-"}%
                                    </p>
                                    {row.remarks ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.remarks}</p>
                                    ) : null}
                                    <EvidenceLink document={row.document} label="Evidence" />
                                </div>
                            ))}
                        />

                        <RowCard
                            title="Library Resources"
                            emptyLabel="No library resources were added."
                            rows={selectedRecord.libraryResources.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.title}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.resourceType, row.category, row.vendorPublisher, row.availabilityStatus]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Copies {row.copiesCount ?? "-"} · Mode {row.accessMode} · Usage {row.usageCount ?? "-"} · Subscription {formatDate(row.subscriptionStartDate)} to {formatDate(row.subscriptionEndDate)}
                                    </p>
                                    {row.remarks ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.remarks}</p>
                                    ) : null}
                                    <EvidenceLink document={row.document} label="Evidence" />
                                </div>
                            ))}
                        />

                        <RowCard
                            title="Usage Analytics"
                            emptyLabel="No usage analytics rows were added."
                            rows={selectedRecord.usageRows.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.title}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.usageType, row.periodLabel, row.targetGroup].filter(Boolean).join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Usage {row.usageCount ?? "-"} · Satisfaction {row.satisfactionScore ?? "-"} / 5
                                    </p>
                                    {row.remarks ? (
                                        <p className="mt-2 text-sm text-zinc-600">{row.remarks}</p>
                                    ) : null}
                                    <EvidenceLink document={row.document} label="Evidence" />
                                </div>
                            ))}
                        />

                        <RowCard
                            title="Maintenance Records"
                            emptyLabel="No maintenance records were added."
                            rows={selectedRecord.maintenanceRows.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.id}>
                                    <p className="text-sm font-semibold text-zinc-950">{row.assetName}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {[row.assetCategory, row.maintenanceType, row.vendorName, row.status]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Service {formatDate(row.serviceDate)} · Next due {formatDate(row.nextDueDate)} · Cost {row.costAmount ?? "-"}
                                    </p>
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
                                        Capture your governed review decision for this infrastructure/library portfolio.
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
