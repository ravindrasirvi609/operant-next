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
    theme: string;
    unitLabel: string;
    planStatus: string;
    planOverview?: string;
    planStrategicPriorities?: string;
    planTargets: {
        environmentalRecords: number;
        inclusionRecords: number;
        ethicsRecords: number;
        outreachPrograms: number;
        bestPractices: number;
        distinctivenessNarratives: number;
        audits: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    environmentalSustainabilityNarrative?: string;
    inclusivenessNarrative?: string;
    humanValuesNarrative?: string;
    communityOutreachNarrative?: string;
    bestPracticesNarrative?: string;
    institutionalDistinctivenessNarrative?: string;
    sustainabilityAuditNarrative?: string;
    actionPlan?: string;
    supportingLinks: string[];
    documents: DocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    greenCampusInitiatives: Array<Record<string, any>>;
    environmentalResourceRecords: Array<Record<string, any>>;
    energyConsumptionRecords: Array<Record<string, any>>;
    waterManagementSystems: Array<Record<string, any>>;
    wasteManagementPractices: Array<Record<string, any>>;
    genderEquityPrograms: Array<Record<string, any>>;
    inclusivenessFacilities: Array<Record<string, any>>;
    ethicsPrograms: Array<Record<string, any>>;
    codeOfConductRecords: Array<Record<string, any>>;
    communityOutreachPrograms: Array<Record<string, any>>;
    outreachParticipants: Array<Record<string, any>>;
    institutionalBestPractices: Array<Record<string, any>>;
    institutionalDistinctivenessEntries: Array<Record<string, any>>;
    sustainabilityAudits: Array<Record<string, any>>;
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
    { key: "environmentalSustainabilityNarrative", label: "Environmental sustainability" },
    { key: "inclusivenessNarrative", label: "Inclusiveness" },
    { key: "humanValuesNarrative", label: "Human values and ethics" },
    { key: "communityOutreachNarrative", label: "Community outreach" },
    { key: "bestPracticesNarrative", label: "Institutional best practices" },
    { key: "institutionalDistinctivenessNarrative", label: "Institutional distinctiveness" },
    { key: "sustainabilityAuditNarrative", label: "Sustainability audits" },
    { key: "actionPlan", label: "Action plan" },
];

const sectionLabels: Array<{ key: keyof ReviewRecord; label: string }> = [
    { key: "greenCampusInitiatives", label: "Green campus initiatives" },
    { key: "energyConsumptionRecords", label: "Energy consumption records" },
    { key: "waterManagementSystems", label: "Water management systems" },
    { key: "wasteManagementPractices", label: "Waste management practices" },
    { key: "genderEquityPrograms", label: "Gender equity programs" },
    { key: "inclusivenessFacilities", label: "Facilities for Divyangjan" },
    { key: "ethicsPrograms", label: "Human values and ethics programs" },
    { key: "codeOfConductRecords", label: "Code of conduct records" },
    { key: "communityOutreachPrograms", label: "Community outreach programs" },
    { key: "outreachParticipants", label: "Outreach participants" },
    { key: "institutionalBestPractices", label: "Institutional best practices rows" },
    { key: "institutionalDistinctivenessEntries", label: "Distinctiveness rows" },
    { key: "sustainabilityAudits", label: "Sustainability audits" },
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

export function InstitutionalValuesBestPracticesReviewBoard({
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
    const [decision, setDecision] = useState(records[0]?.availableDecisions[0] ?? "");
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
        setDecision(selectedRecord?.availableDecisions[0] ?? "");
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
                    `/api/institutional-values-best-practices/assignments/${selectedRecord._id}/review`,
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
                    text: data.message ?? "Review recorded successfully.",
                });
                setRemarks("");
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error ? error.message : "Unable to record the review.",
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
                                                {record.theme}
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
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No records matched your search.
                        </div>
                    )}
                </div>

                {selectedRecord ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>{selectedRecord.planTitle}</CardTitle>
                                        <CardDescription>
                                            {selectedRecord.unitLabel} · {selectedRecord.academicYearLabel} ·{" "}
                                            {viewerLabel}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {statusBadge(selectedRecord.status)}
                                        <Badge variant="secondary">{selectedRecord.currentStageLabel}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-zinc-600">
                                {selectedRecord.planOverview ? <p>{selectedRecord.planOverview}</p> : null}
                                {selectedRecord.planStrategicPriorities ? (
                                    <p>{selectedRecord.planStrategicPriorities}</p>
                                ) : null}
                                <p>
                                    Targets: Env {selectedRecord.planTargets.environmentalRecords} · Inclusion{" "}
                                    {selectedRecord.planTargets.inclusionRecords} · Ethics{" "}
                                    {selectedRecord.planTargets.ethicsRecords} · Outreach{" "}
                                    {selectedRecord.planTargets.outreachPrograms} · Best Practices{" "}
                                    {selectedRecord.planTargets.bestPractices} · Distinctiveness{" "}
                                    {selectedRecord.planTargets.distinctivenessNarratives} · Audits{" "}
                                    {selectedRecord.planTargets.audits}
                                </p>
                                <p>
                                    Assignee: {selectedRecord.assigneeName} · {selectedRecord.assigneeEmail} · Due{" "}
                                    {formatDate(selectedRecord.dueDate)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Narrative sections</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {narrativeSections.map((section) =>
                                    renderNarrative(section.label, selectedRecord[section.key] as string | undefined)
                                )}
                            </CardContent>
                        </Card>

                        {sectionLabels.map((section) => {
                            const rows = (selectedRecord[section.key] as Array<Record<string, any>>) ?? [];

                            return (
                                <Card key={section.key}>
                                    <CardHeader>
                                        <CardTitle>{section.label}</CardTitle>
                                        <CardDescription>{rows.length} structured row(s)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {rows.length ? (
                                            rows.map((row, index) => (
                                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${section.key}-${index}`}>
                                                    <div className="grid gap-2 md:grid-cols-2">
                                                        {Object.entries(row)
                                                            .filter(
                                                                ([key, value]) =>
                                                                    !["id", "documentId", "document"].includes(key) &&
                                                                    value !== undefined &&
                                                                    value !== null &&
                                                                    String(value).trim() !== ""
                                                            )
                                                            .map(([key, value]) => (
                                                                <div key={key}>
                                                                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                                                                        {key}
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-zinc-700">
                                                                        {typeof value === "string" &&
                                                                        /^\d{4}-\d{2}-\d{2}T/.test(value)
                                                                            ? formatDate(value)
                                                                            : String(value)}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                    </div>
                                                    <EvidenceLink
                                                        document={row.document as DocumentRecord | undefined}
                                                        label="Open evidence"
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                                No rows recorded in this section.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        <Card>
                            <CardHeader>
                                <CardTitle>Supporting evidence</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {selectedRecord.documents.length ? (
                                    selectedRecord.documents.map((document) => (
                                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={document.id}>
                                            <p className="text-sm font-medium text-zinc-950">
                                                {document.fileName || document.id}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                {document.verificationStatus || "Unverified"}
                                            </p>
                                            {document.verificationRemarks ? (
                                                <p className="mt-2 text-xs text-zinc-500">
                                                    {document.verificationRemarks}
                                                </p>
                                            ) : null}
                                            <EvidenceLink label="Manual evidence" document={document} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                        No manual evidence files are linked.
                                    </div>
                                )}

                                {selectedRecord.supportingLinks.length ? (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <p className="text-sm font-medium text-zinc-950">Supporting links</p>
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

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workflow trail</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.statusLogs.length ? (
                                        selectedRecord.statusLogs.map((entry, index) => (
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.status}-${index}`}>
                                                <p className="text-sm font-medium text-zinc-950">{entry.status}</p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {entry.actorName || "System"} · {entry.actorRole || "Workflow"} ·{" "}
                                                    {formatDateTime(entry.changedAt)}
                                                </p>
                                                {entry.remarks ? (
                                                    <p className="mt-2 text-sm text-zinc-600">{entry.remarks}</p>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No workflow history available.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Review history</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.reviewHistory.length ? (
                                        selectedRecord.reviewHistory.map((entry, index) => (
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${entry.stage}-${index}`}>
                                                <p className="text-sm font-medium text-zinc-950">
                                                    {entry.stage} · {entry.decision}
                                                </p>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {entry.reviewerName || "Reviewer"} · {entry.reviewerRole || "Leadership"} ·{" "}
                                                    {formatDateTime(entry.reviewedAt)}
                                                </p>
                                                {entry.remarks ? (
                                                    <p className="mt-2 text-sm text-zinc-600">{entry.remarks}</p>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                            No review actions recorded yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {selectedRecord.permissions.canReview ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Review action</CardTitle>
                                    <CardDescription>
                                        Current stage: {selectedRecord.currentStageLabel}. Only stage-safe decisions are available.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
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
                                        <Label>Remarks</Label>
                                        <Textarea
                                            className="min-h-28"
                                            onChange={(event) => setRemarks(event.target.value)}
                                            placeholder="Record observations, decision rationale, required changes, or approval comments."
                                            value={remarks}
                                        />
                                    </div>
                                    <Button
                                        disabled={isPending || !decision || remarks.trim().length < 2}
                                        onClick={submitReview}
                                        type="button"
                                    >
                                        Submit review
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
