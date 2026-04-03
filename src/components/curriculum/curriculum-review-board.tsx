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
    curriculumId: string;
    curriculumTitle: string;
    regulationYear: string;
    programName: string;
    courseCode: string;
    courseTitle: string;
    courseType: string;
    semesterNumber: number;
    credits: number;
    contributorName: string;
    contributorEmail: string;
    contributorRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    valueSummary: string;
    syllabusVersion: {
        versionNumber: number;
        revisionReason?: string;
        syllabusSummary?: string;
        unitOutline?: string;
        pedagogy?: string;
        assessmentStrategy?: string;
        referenceBooks: string[];
        officialDocumentId?: string;
        approvedByBosMeetingId?: string;
        approvedByBosMeetingLabel?: string;
        effectiveAcademicYearId?: string;
        status: string;
    };
    programOutcomes: Array<{
        id: string;
        outcomeType: string;
        outcomeCode: string;
        description: string;
    }>;
    courseOutcomes: Array<{
        id: string;
        coCode: string;
        description: string;
        bloomLevel?: string;
        targetAttainmentPercentage?: number;
    }>;
    mappings: Array<{
        id: string;
        courseOutcomeCode: string;
        programOutcomeCode: string;
        programOutcomeType: string;
        mappingStrength: number;
    }>;
    supportingLinks: string[];
    documents: Array<{
        id: string;
        fileName?: string;
        fileUrl?: string;
        fileType?: string;
        uploadedAt?: string;
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
        reviewedAt?: string;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: string;
    }>;
    submittedAt?: string;
    reviewedAt?: string;
    approvedAt?: string;
    updatedAt?: string;
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

    if (["Submitted", "Board Review", "Under Review", "Committee Review"].includes(status)) {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

export function CurriculumReviewBoard({
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
                record.curriculumTitle,
                record.courseCode,
                record.courseTitle,
                record.regulationYear,
                record.contributorName,
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
                await requestJson(`/api/curriculum/assignments/${selectedRecord._id}/review`, {
                    method: "POST",
                    body: JSON.stringify({
                        decision,
                        remarks:
                            remarks[selectedRecord._id]?.trim() ||
                            `Recorded from the ${viewerLabel.toLowerCase()} curriculum workspace.`,
                    }),
                });

                setRemarks((current) => ({ ...current, [selectedRecord._id]: "" }));
                setMessage({ type: "success", text: "Curriculum review decision recorded." });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to record the review.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Scoped drafts" value={summary.total} />
                <MetricCard label="Actionable now" value={summary.actionableCount} />
                <MetricCard label="Pending chain" value={summary.pendingCount} />
                <MetricCard label="Approved" value={summary.approvedCount} />
            </section>

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

            <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>{viewerLabel} Curriculum Review Workspace</CardTitle>
                        <CardDescription>
                            Browse syllabus versions, mapped outcomes, and evidence before recording governance decisions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            placeholder="Search by course, curriculum, contributor, or scope"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="actionable">Actionable</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                                <TabsTrigger value="all">All</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="space-y-3">
                            {filteredRecords.length ? (
                                filteredRecords.map((record) => (
                                    <button
                                        type="button"
                                        key={record._id}
                                        onClick={() => setSelectedId(record._id)}
                                        className={`w-full rounded-xl border p-4 text-left transition ${
                                            record._id === selectedId
                                                ? "border-zinc-950 bg-zinc-950 text-white"
                                                : "border-zinc-200 bg-white hover:border-zinc-300"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            {statusBadge(record.status)}
                                            <Badge variant={record._id === selectedId ? "secondary" : "outline"}>
                                                {record.courseCode}
                                            </Badge>
                                        </div>
                                        <p className="mt-3 font-medium">{record.courseTitle}</p>
                                        <p
                                            className={`mt-1 text-xs ${
                                                record._id === selectedId ? "text-white/75" : "text-zinc-500"
                                            }`}
                                        >
                                            {record.curriculumTitle} · {record.contributorName}
                                        </p>
                                    </button>
                                ))
                            ) : (
                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                                    No curriculum records match the selected filter.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {selectedRecord ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge>{selectedRecord.regulationYear}</Badge>
                                    {statusBadge(selectedRecord.status)}
                                    <Badge variant="outline">{selectedRecord.currentStageLabel}</Badge>
                                </div>
                                <CardTitle>
                                    {selectedRecord.courseCode} · {selectedRecord.courseTitle}
                                </CardTitle>
                                <CardDescription>
                                    {selectedRecord.curriculumTitle} · {selectedRecord.programName}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <InfoRow label="Contributor" value={selectedRecord.contributorName} />
                                <InfoRow label="Contributor Role" value={selectedRecord.contributorRole} />
                                <InfoRow label="Course Type" value={selectedRecord.courseType} />
                                <InfoRow label="Semester" value={`Semester ${selectedRecord.semesterNumber}`} />
                                <InfoRow label="Credits" value={String(selectedRecord.credits)} />
                                <InfoRow label="Due Date" value={selectedRecord.dueDate ? formatDateTime(selectedRecord.dueDate) : "-"} />
                                <InfoRow label="Draft Summary" value={selectedRecord.valueSummary} />
                                <InfoRow label="Latest Feedback" value={selectedRecord.reviewRemarks || "-"} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Syllabus Package</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <TextBlock label="Revision Reason" value={selectedRecord.syllabusVersion.revisionReason} />
                                <TextBlock label="Syllabus Summary" value={selectedRecord.syllabusVersion.syllabusSummary} />
                                <TextBlock label="Unit Outline" value={selectedRecord.syllabusVersion.unitOutline} />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <TextBlock label="Pedagogy" value={selectedRecord.syllabusVersion.pedagogy} />
                                    <TextBlock
                                        label="Assessment Strategy"
                                        value={selectedRecord.syllabusVersion.assessmentStrategy}
                                    />
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="text-sm font-medium text-zinc-950">Reference Books</p>
                                    <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                                        {selectedRecord.syllabusVersion.referenceBooks.length ? (
                                            selectedRecord.syllabusVersion.referenceBooks.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))
                                        ) : (
                                            <li>No reference books linked.</li>
                                        )}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        <section className="grid gap-6 xl:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Course Outcomes</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.courseOutcomes.length ? (
                                        selectedRecord.courseOutcomes.map((outcome) => (
                                            <div
                                                key={outcome.id}
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">{outcome.coCode}</Badge>
                                                    {outcome.bloomLevel ? (
                                                        <Badge variant="outline">{outcome.bloomLevel}</Badge>
                                                    ) : null}
                                                    {outcome.targetAttainmentPercentage !== undefined ? (
                                                        <Badge variant="outline">
                                                            {outcome.targetAttainmentPercentage}%
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="mt-3 text-sm text-zinc-700">
                                                    {outcome.description}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">No course outcomes were captured.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>CO Mapping Matrix</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedRecord.mappings.length ? (
                                        selectedRecord.mappings.map((mapping) => (
                                            <div
                                                key={mapping.id}
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">{mapping.courseOutcomeCode}</Badge>
                                                    <Badge variant="outline">
                                                        {mapping.programOutcomeType} · {mapping.programOutcomeCode}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        Strength {mapping.mappingStrength}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">No CO-PO/PSO mappings were captured.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        <Card>
                            <CardHeader>
                                <CardTitle>Evidence and Governance Trail</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <TextBlock
                                        label="Contributor Remarks"
                                        value={selectedRecord.contributorRemarks}
                                    />
                                    <TextBlock
                                        label="BoS Approval Linkage"
                                        value={selectedRecord.syllabusVersion.approvedByBosMeetingLabel}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <p className="text-sm font-medium text-zinc-950">Supporting Links</p>
                                        <div className="mt-3 space-y-2">
                                            {selectedRecord.supportingLinks.length ? (
                                                selectedRecord.supportingLinks.map((link) => (
                                                    <a
                                                        key={link}
                                                        href={link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block break-all text-sm text-blue-700 underline"
                                                    >
                                                        {link}
                                                    </a>
                                                ))
                                            ) : (
                                                <p className="text-sm text-zinc-500">No supporting links added.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <p className="text-sm font-medium text-zinc-950">Supporting Documents</p>
                                        <div className="mt-3 space-y-2">
                                            {selectedRecord.documents.length ? (
                                                selectedRecord.documents.map((document) => (
                                                    <div key={document.id} className="rounded-md bg-white p-3 text-sm">
                                                        <p className="font-medium text-zinc-950">
                                                            {document.fileName || document.id}
                                                        </p>
                                                        <p className="mt-1 text-zinc-500">
                                                            Verification: {document.verificationStatus || "Pending"}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-zinc-500">No documents linked.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <TimelineCard title="Review History" items={selectedRecord.reviewHistory.map((entry) => ({
                                        title: `${entry.stage} · ${entry.decision}`,
                                        subtitle: `${entry.reviewerName || "Reviewer"} · ${formatDateTime(entry.reviewedAt)}`,
                                        body: entry.remarks,
                                    }))} />
                                    <TimelineCard title="Status Timeline" items={selectedRecord.statusLogs.map((entry) => ({
                                        title: entry.status,
                                        subtitle: `${entry.actorName || "System"} · ${formatDateTime(entry.changedAt)}`,
                                        body: entry.remarks,
                                    }))} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Record Decision</CardTitle>
                                <CardDescription>
                                    Action buttons appear only when the current workflow stage is assigned to your account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    rows={4}
                                    placeholder="Enter governance remarks"
                                    value={remarks[selectedRecord._id] ?? ""}
                                    onChange={(event) =>
                                        setRemarks((current) => ({
                                            ...current,
                                            [selectedRecord._id]: event.target.value,
                                        }))
                                    }
                                    disabled={isPending || !selectedRecord.permissions.canReject}
                                />
                                <div className="flex flex-wrap gap-3">
                                    {selectedRecord.availableDecisions.map((decision) => {
                                        const isPrimary = decision === "Approve" || decision === "Forward";
                                        const canClick =
                                            decision === "Reject"
                                                ? selectedRecord.permissions.canReject
                                                : decision === "Approve"
                                                  ? selectedRecord.permissions.canApprove
                                                  : selectedRecord.permissions.canReview;

                                        return (
                                            <Button
                                                key={decision}
                                                onClick={() => submitDecision(decision)}
                                                disabled={isPending || !canClick}
                                                variant={isPrimary ? "default" : "secondary"}
                                            >
                                                {decision}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </section>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
        </Card>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-zinc-950">{value}</p>
        </div>
    );
}

function TextBlock({ label, value }: { label: string; value?: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-950">{label}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                {value?.trim() ? value : "Not provided."}
            </p>
        </div>
    );
}

function TimelineCard({
    title,
    items,
}: {
    title: string;
    items: Array<{ title: string; subtitle: string; body?: string }>;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-950">{title}</p>
            <div className="mt-3 space-y-3">
                {items.length ? (
                    items.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="rounded-md bg-white p-3 text-sm">
                            <p className="font-medium text-zinc-950">{item.title}</p>
                            <p className="mt-1 text-zinc-500">{item.subtitle}</p>
                            {item.body ? <p className="mt-2 text-zinc-600">{item.body}</p> : null}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-zinc-500">No entries recorded yet.</p>
                )}
            </div>
        </div>
    );
}
