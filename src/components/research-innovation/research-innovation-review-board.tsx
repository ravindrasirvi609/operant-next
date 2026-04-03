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

type SourceCategory =
    | "facultyPublications"
    | "facultyPatents"
    | "facultyProjects"
    | "facultyConsultancies"
    | "researchPublications"
    | "researchProjects"
    | "intellectualProperties"
    | "researchActivities"
    | "studentPublications"
    | "studentProjects";

type SourceOption = {
    id: string;
    title: string;
    subtitle?: string;
    summary?: string;
    ownerLabel?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
    link?: string;
    sourceType: string;
};

type SourceCatalog = Record<SourceCategory, SourceOption[]>;

type ActivityRecord = {
    id: string;
    activityType: string;
    title: string;
    leadName?: string;
    partnerName?: string;
    startDate?: string;
    endDate?: string;
    participantCount?: number;
    fundingAmount?: number;
    stage: string;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
};

type GrantRecord = {
    id: string;
    grantType: string;
    title: string;
    schemeName?: string;
    sponsorName?: string;
    beneficiaryName?: string;
    sanctionedAmount?: number;
    releasedAmount?: number;
    awardDate?: string;
    stage: string;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
};

type StartupRecord = {
    id: string;
    startupName: string;
    supportType: string;
    stage: string;
    founderNames?: string;
    sector?: string;
    incubationCell?: string;
    registrationNumber?: string;
    supportStartDate?: string;
    supportEndDate?: string;
    fundingAmount?: number;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
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
        publications: number;
        projects: number;
        patents: number;
        consultancies: number;
        studentResearch: number;
        innovationActivities: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    researchStrategy?: string;
    fundingPipeline?: string;
    publicationQualityPractices?: string;
    innovationEcosystem?: string;
    incubationSupport?: string;
    consultancyTranslation?: string;
    iprCommercialization?: string;
    studentResearchEngagement?: string;
    collaborationHighlights?: string;
    ethicsAndCompliance?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: Array<{
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
        verificationRemarks?: string;
    }>;
    contributorRemarks?: string;
    reviewRemarks?: string;
    linkedSources: SourceCatalog;
    sourceMetrics: {
        linked: Record<SourceCategory, number>;
        linkedTotal: number;
    };
    activities: ActivityRecord[];
    grants: GrantRecord[];
    startups: StartupRecord[];
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
    actionableCount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
};

const sourceSections: Array<{ key: SourceCategory; label: string }> = [
    { key: "facultyPublications", label: "Faculty Publications" },
    { key: "facultyPatents", label: "Faculty Patents" },
    { key: "facultyProjects", label: "Faculty Projects" },
    { key: "facultyConsultancies", label: "Faculty Consultancy" },
    { key: "researchPublications", label: "Institutional Publications" },
    { key: "researchProjects", label: "Institutional Projects" },
    { key: "intellectualProperties", label: "Institutional IP" },
    { key: "researchActivities", label: "Research Activities" },
    { key: "studentPublications", label: "Student Publications" },
    { key: "studentProjects", label: "Student Research Projects" },
];

const narrativeSections: Array<{ key: keyof ReviewRecord; label: string }> = [
    { key: "researchStrategy", label: "Research strategy" },
    { key: "fundingPipeline", label: "Funding pipeline" },
    { key: "publicationQualityPractices", label: "Publication quality practices" },
    { key: "innovationEcosystem", label: "Innovation ecosystem" },
    { key: "incubationSupport", label: "Incubation support" },
    { key: "consultancyTranslation", label: "Consultancy translation" },
    { key: "iprCommercialization", label: "IPR and commercialization" },
    { key: "studentResearchEngagement", label: "Student research engagement" },
    { key: "collaborationHighlights", label: "Collaboration highlights" },
    { key: "ethicsAndCompliance", label: "Ethics and compliance" },
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

    if (["Submitted", "Research Review", "Under Review", "Committee Review"].includes(status)) {
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
    document?: { fileName?: string; fileUrl?: string; verificationStatus?: string } | null;
}) {
    if (!document?.fileUrl) {
        return (
            <p className="mt-2 text-xs text-zinc-500">
                {label}: no linked file available.
            </p>
        );
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

export function ResearchInnovationReviewBoard({
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

    const totalLinkedEvidence = selectedRecord
        ? sourceSections.reduce(
              (sum, section) => sum + selectedRecord.linkedSources[section.key].length,
              0
          )
        : 0;

    useEffect(() => {
        setDecision(selectedRecord?.availableDecisions[0] ?? "Forward");
        setRemarks("");
    }, [
        selectedRecord?._id,
        selectedRecord?.availableDecisions,
    ]);

    function submitReview() {
        if (!selectedRecord) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const data = await requestJson<{ message?: string }>(
                    `/api/research-innovation/assignments/${selectedRecord._id}/review`,
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
                    text: data.message ?? "Research & innovation review recorded successfully.",
                });
                setRemarks("");
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to record the research & innovation review.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
                <SummaryCard label="Total" value={summary.total} />
                <SummaryCard label="Actionable" value={summary.actionableCount} />
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
                                    onClick={() => {
                                        setSelectedId(record._id);
                                    }}
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
                                No research & innovation records match the current filter.
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
                                    <p>{totalLinkedEvidence} linked source record(s)</p>
                                    <p>{selectedRecord.activities.length} innovation activity row(s)</p>
                                    <p>{selectedRecord.grants.length} grant row(s)</p>
                                    <p>{selectedRecord.startups.length} startup row(s)</p>
                                    <p>{selectedRecord.documents.length} manual document(s)</p>
                                    <p>Updated {formatDate(selectedRecord.updatedAt)}</p>
                                </div>
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Targets and Reviewer Context</CardTitle>
                                <CardDescription>
                                    Plan targets, contributor note, and portfolio positioning for {viewerLabel.toLowerCase()} review.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <MetricCard label="Publication target" value={selectedRecord.planTargets.publications} />
                                    <MetricCard label="Project target" value={selectedRecord.planTargets.projects} />
                                    <MetricCard label="Patent target" value={selectedRecord.planTargets.patents} />
                                    <MetricCard label="Consultancy target" value={selectedRecord.planTargets.consultancies} />
                                    <MetricCard label="Student research target" value={selectedRecord.planTargets.studentResearch} />
                                    <MetricCard label="Innovation activity target" value={selectedRecord.planTargets.innovationActivities} />
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
                                    Review the contributor’s research and innovation narrative before evaluating supporting records.
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

                        <Card>
                            <CardHeader>
                                <CardTitle>Linked Source Records</CardTitle>
                                <CardDescription>
                                    Each group below shows the actual institutional records that were pulled into this governed portfolio file.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {sourceSections.map((section) => {
                                    const rows = selectedRecord.linkedSources[section.key];
                                    if (!rows.length) {
                                        return null;
                                    }

                                    return (
                                        <div className="space-y-3" key={section.key}>
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-zinc-950">
                                                    {section.label}
                                                </p>
                                                <Badge variant="secondary">{rows.length}</Badge>
                                            </div>
                                            <div className="space-y-3">
                                                {rows.map((row) => (
                                                    <div
                                                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                        key={row.id}
                                                    >
                                                        <p className="text-sm font-semibold text-zinc-950">
                                                            {row.title}
                                                        </p>
                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {[row.subtitle, row.ownerLabel, row.summary]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                        {row.document?.fileUrl ? (
                                                            <EvidenceLink
                                                                document={row.document}
                                                                label="Evidence"
                                                            />
                                                        ) : row.link ? (
                                                            <a
                                                                className="mt-2 inline-block text-xs font-medium text-zinc-900 underline"
                                                                href={row.link}
                                                                rel="noreferrer"
                                                                target="_blank"
                                                            >
                                                                Open linked evidence
                                                            </a>
                                                        ) : (
                                                            <p className="mt-2 text-xs text-zinc-500">
                                                                No direct evidence link captured on the source record.
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {!totalLinkedEvidence ? (
                                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                        No source records were linked in this portfolio.
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Innovation Activities and Manual Evidence</CardTitle>
                                <CardDescription>
                                    Manual ecosystem rows and non-source evidence added by the contributor.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedRecord.activities.length ? (
                                    selectedRecord.activities.map((activity) => (
                                        <div
                                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                            key={activity.id}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-950">
                                                        {activity.title}
                                                    </p>
                                                    <p className="mt-1 text-xs text-zinc-500">
                                                        {[
                                                            activity.activityType,
                                                            activity.stage,
                                                            activity.leadName,
                                                            activity.partnerName,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary">{activity.stage}</Badge>
                                            </div>
                                            <p className="mt-3 text-sm text-zinc-600">
                                                {activity.outcomeSummary?.trim() || "No outcome summary provided."}
                                            </p>
                                            {activity.followUpAction ? (
                                                <p className="mt-2 text-xs text-zinc-500">
                                                    Follow-up: {activity.followUpAction}
                                                </p>
                                            ) : null}
                                            {activity.document?.fileUrl ? (
                                                <EvidenceLink document={activity.document} label="Evidence" />
                                            ) : null}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                        No manual innovation activities were added.
                                    </div>
                                )}

                                {selectedRecord.grants.length ? (
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-zinc-950">
                                            Seed funding and innovation grants
                                        </p>
                                        {selectedRecord.grants.map((grant) => (
                                            <div
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                key={grant.id}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-zinc-950">
                                                            {grant.title}
                                                        </p>
                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {[
                                                                grant.grantType,
                                                                grant.stage,
                                                                grant.schemeName,
                                                                grant.sponsorName,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary">{grant.stage}</Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-zinc-600">
                                                    Beneficiary {grant.beneficiaryName || "-"} · Sanctioned{" "}
                                                    {grant.sanctionedAmount ?? "-"} · Released {grant.releasedAmount ?? "-"} · Awarded{" "}
                                                    {formatDate(grant.awardDate)}
                                                </p>
                                                {grant.outcomeSummary ? (
                                                    <p className="mt-2 text-sm text-zinc-600">
                                                        {grant.outcomeSummary}
                                                    </p>
                                                ) : null}
                                                {grant.followUpAction ? (
                                                    <p className="mt-2 text-xs text-zinc-500">
                                                        Follow-up: {grant.followUpAction}
                                                    </p>
                                                ) : null}
                                                {grant.document?.fileUrl ? (
                                                    <EvidenceLink document={grant.document} label="Evidence" />
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                {selectedRecord.startups.length ? (
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-zinc-950">
                                            Startups and incubation outcomes
                                        </p>
                                        {selectedRecord.startups.map((startup) => (
                                            <div
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                key={startup.id}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-zinc-950">
                                                            {startup.startupName}
                                                        </p>
                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {[
                                                                startup.supportType,
                                                                startup.stage,
                                                                startup.sector,
                                                                startup.incubationCell,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary">{startup.stage}</Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-zinc-600">
                                                    Founders {startup.founderNames || "-"} · Registration{" "}
                                                    {startup.registrationNumber || "-"} · Funding {startup.fundingAmount ?? "-"}
                                                </p>
                                                {startup.outcomeSummary ? (
                                                    <p className="mt-2 text-sm text-zinc-600">
                                                        {startup.outcomeSummary}
                                                    </p>
                                                ) : null}
                                                {startup.followUpAction ? (
                                                    <p className="mt-2 text-xs text-zinc-500">
                                                        Follow-up: {startup.followUpAction}
                                                    </p>
                                                ) : null}
                                                {startup.document?.fileUrl ? (
                                                    <EvidenceLink document={startup.document} label="Evidence" />
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <div className="grid gap-3 md:grid-cols-2">
                                    {selectedRecord.documents.map((document) => (
                                        <div
                                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                            key={document.id}
                                        >
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
                                <CardDescription>
                                    Review-stage actions and status movements recorded on this portfolio file.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-zinc-950">Review history</p>
                                    {selectedRecord.reviewHistory.length ? (
                                        selectedRecord.reviewHistory.map((entry, index) => (
                                            <div
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                key={`${entry.stage}-${index}`}
                                            >
                                                <p className="text-sm font-semibold text-zinc-950">
                                                    {entry.stage}
                                                </p>
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
                                            <div
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                                key={`${entry.status}-${index}`}
                                            >
                                                <p className="text-sm font-semibold text-zinc-950">
                                                    {entry.status}
                                                </p>
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
                                        Capture your governed review decision for this portfolio record.
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
                                            placeholder="Record the scrutiny outcome, gaps found, and next-stage recommendation."
                                            rows={4}
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
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
