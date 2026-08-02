"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { InlineAlert } from "@/components/ui/inline-alert";
import { StatCard } from "@/components/ui/stat-card";

type ReviewRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    programName: string;
    courseTitle: string;
    courseCode?: string;
    semesterNumber?: number;
    sectionName?: string;
    deliveryType: string;
    plannedSessions: number;
    plannedContactHours: number;
    classStrength?: number;
    planSummary?: string;
    planStatus: string;
    sourceTeachingLoadId?: string;
    teachingLoadSnapshot?: {
        subjectCode?: string;
        lectureHours: number;
        tutorialHours: number;
        practicalHours: number;
        totalHours: number;
        innovativePedagogy?: string;
    } | null;
    teachingSummarySnapshot?: {
        classesTaken: number;
        coursePreparationHours: number;
        coursesTaught: string[];
        mentoringCount: number;
        labSupervisionCount: number;
        feedbackSummary?: string;
    } | null;
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    pedagogicalApproach?: string;
    learnerCentricPractices?: string;
    digitalResources?: string;
    attendanceStrategy?: string;
    feedbackAnalysis?: string;
    attainmentSummary?: string;
    actionTaken?: string;
    innovationHighlights?: string;
    supportingLinks: string[];
    lessonPlanDocumentId?: string;
    questionPaperDocumentId?: string;
    resultAnalysisDocumentId?: string;
    lessonPlanDocument?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        fileType?: string;
        uploadedAt?: string;
        verificationStatus?: string;
        verificationRemarks?: string;
    };
    questionPaperDocument?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        fileType?: string;
        uploadedAt?: string;
        verificationStatus?: string;
        verificationRemarks?: string;
    };
    resultAnalysisDocument?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        fileType?: string;
        uploadedAt?: string;
        verificationStatus?: string;
        verificationRemarks?: string;
    };
    documentIds: string[];
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
    sessions: Array<{
        id: string;
        sessionNumber: number;
        moduleTitle?: string;
        topic: string;
        plannedDate?: string;
        deliveredDate?: string;
        teachingMethod: string;
        ictTool?: string;
        attendancePercent?: number;
        learningOutcome?: string;
        reflectionNotes?: string;
        isDelivered: boolean;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    assessments: Array<{
        id: string;
        title: string;
        assessmentType: string;
        weightage: number;
        scheduledDate?: string;
        evaluatedDate?: string;
        coMappingCodes: string[];
        maxMarks?: number;
        averageMarks?: number;
        attainmentPercentage?: number;
        remarks?: string;
        isCompleted: boolean;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    supports: Array<{
        id: string;
        title: string;
        supportType: string;
        targetGroup?: string;
        interventionDate?: string;
        participantCount?: number;
        outcomeSummary?: string;
        followUpAction?: string;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
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

function renderNarrativeSection(title: string, value?: string) {
    return (
        <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {value?.trim() || "Not provided."}
            </p>
        </div>
    );
}

function countEvidenceDocuments(record: ReviewRecord) {
    return new Set(
        [
            record.lessonPlanDocumentId,
            record.questionPaperDocumentId,
            record.resultAnalysisDocumentId,
            ...record.documentIds,
            ...record.sessions.map((item) => item.documentId),
            ...record.assessments.map((item) => item.documentId),
            ...record.supports.map((item) => item.documentId),
        ].filter(Boolean)
    ).size;
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
    return <StatCard label={label} value={value} helper={helper} />;
}

export function TeachingLearningReviewBoard({
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

    const filteredRecords = records.filter((record) => {
        const actionable = record.permissions.canReview || record.permissions.canApprove;
        if (activeTab === "actionable" && !actionable) {
            return false;
        }

        if (activeTab === "history" && actionable) {
            return false;
        }

        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [
            record.planTitle,
            record.courseCode,
            record.courseTitle,
            record.assigneeName,
            record.status,
            record.currentStageLabel,
            record.scopeDepartmentName,
            record.scopeCollegeName,
            record.scopeUniversityName,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    useEffect(() => {
        if (!filteredRecords.length) {
            setSelectedId("");
            return;
        }

        if (!filteredRecords.some((record) => record._id === selectedId)) {
            setSelectedId(filteredRecords[0]._id);
        }
    }, [filteredRecords, selectedId]);

    const selectedRecord =
        filteredRecords.find((record) => record._id === selectedId) ?? null;

    function submitDecision(decision: string) {
        if (!selectedRecord) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const data = await requestJson<{ message?: string }>(
                    `/api/teaching-learning/assignments/${selectedRecord._id}/review`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            decision,
                            remarks:
                                remarks[selectedRecord._id]?.trim() ||
                                `Recorded from the ${viewerLabel.toLowerCase()} teaching learning workspace.`,
                        }),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Teaching learning review recorded successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to record the teaching learning review decision.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <MetricCard
                    label="Total Records"
                    value={summary.total}
                    helper="All scoped teaching-learning records."
                />
                <MetricCard
                    label="Actionable"
                    value={summary.actionableCount}
                    helper="Records where this account can act now."
                />
                <MetricCard
                    label="Pending"
                    value={summary.pendingCount}
                    helper="Records moving through review."
                />
                <MetricCard
                    label="Approved"
                    value={summary.approvedCount}
                    helper="Records cleared through final approval."
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{viewerLabel} Teaching Learning review workspace</CardTitle>
                    <CardDescription>
                        Review course-delivery plans, lesson execution logs, assessment evidence, learner-support actions, and workflow history from one governed screen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <Input
                            className="lg:max-w-sm"
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by plan, course, contributor, or scope"
                            value={search}
                        />
                        <Tabs
                            onValueChange={(value) =>
                                setActiveTab(value as "actionable" | "history" | "all")
                            }
                            value={activeTab}
                        >
                            <TabsList>
                                <TabsTrigger value="actionable">Actionable</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                                <TabsTrigger value="all">All</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <InlineAlert message={message} />

                    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
                        <div className="space-y-3">
                            {filteredRecords.length ? (
                                filteredRecords.map((record) => {
                                    const isActive = record._id === selectedId;
                                    return (
                                        <button
                                            className={`w-full rounded-xl border p-4 text-left transition ${
                                                isActive
                                                    ? "border-border bg-primary text-primary-foreground"
                                                    : "border-border bg-muted/50 text-foreground hover:border-border hover:bg-muted"
                                            }`}
                                            key={record._id}
                                            onClick={() => setSelectedId(record._id)}
                                            type="button"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">
                                                        {record.courseCode || "Course"}
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold">
                                                        {record.planTitle}
                                                    </p>
                                                    <p className="mt-1 text-xs opacity-80">
                                                        {record.courseTitle} · {record.assigneeName}
                                                    </p>
                                                </div>
                                                <div><StatusBadge status={record.status} /></div>
                                            </div>
                                            <p className="mt-3 text-xs opacity-80">
                                                {record.currentStageLabel} · {record.valueSummary}
                                            </p>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                                    No teaching-learning records matched the current filters.
                                </div>
                            )}
                        </div>

                        {selectedRecord ? (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-border bg-muted/50 p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusBadge status={selectedRecord.status} />
                                                <Badge variant="secondary">
                                                    {selectedRecord.currentStageLabel}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {selectedRecord.deliveryType}
                                                </Badge>
                                            </div>
                                            <h3 className="mt-3 text-2xl font-semibold text-foreground">
                                                {selectedRecord.planTitle}
                                            </h3>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {selectedRecord.courseTitle}
                                                {selectedRecord.courseCode
                                                    ? ` (${selectedRecord.courseCode})`
                                                    : ""}
                                                {" · "}
                                                {selectedRecord.programName}
                                                {selectedRecord.semesterNumber
                                                    ? ` · Semester ${selectedRecord.semesterNumber}`
                                                    : ""}
                                                {selectedRecord.sectionName
                                                    ? ` · Section ${selectedRecord.sectionName}`
                                                    : ""}
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Academic year: {selectedRecord.academicYearLabel || "-"} · Contributor:{" "}
                                                {selectedRecord.assigneeName} ({selectedRecord.assigneeEmail})
                                            </p>
                                        </div>
                                        <div className="grid gap-2 text-sm text-muted-foreground">
                                            <span>Due: {formatDate(selectedRecord.dueDate)}</span>
                                            <span>Submitted: {formatDateTime(selectedRecord.submittedAt)}</span>
                                            <span>Updated: {formatDateTime(selectedRecord.updatedAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card>
                                        <CardContent className="p-5">
                                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                Plan Capacity
                                            </p>
                                            <p className="mt-2 text-3xl font-semibold text-foreground">
                                                {selectedRecord.plannedSessions}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Planned sessions with {selectedRecord.plannedContactHours} contact hour(s).
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-5">
                                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                Delivery Register
                                            </p>
                                            <p className="mt-2 text-3xl font-semibold text-foreground">
                                                {selectedRecord.sessions.filter((item) => item.isDelivered).length}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Delivered session(s) recorded out of {selectedRecord.sessions.length}.
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-5">
                                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                Evidence Pack
                                            </p>
                                            <p className="mt-2 text-3xl font-semibold text-foreground">
                                                {countEvidenceDocuments(selectedRecord)}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Course-file and register evidence files linked directly to this record.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {selectedRecord.planSummary ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Plan Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-sm leading-7 text-muted-foreground">
                                            {selectedRecord.planSummary}
                                        </CardContent>
                                    </Card>
                                ) : null}

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderNarrativeSection(
                                        "Pedagogical Approach",
                                        selectedRecord.pedagogicalApproach
                                    )}
                                    {renderNarrativeSection(
                                        "Learner-Centric Practices",
                                        selectedRecord.learnerCentricPractices
                                    )}
                                    {renderNarrativeSection(
                                        "Digital Resources",
                                        selectedRecord.digitalResources
                                    )}
                                    {renderNarrativeSection(
                                        "Attendance Strategy",
                                        selectedRecord.attendanceStrategy
                                    )}
                                    {renderNarrativeSection(
                                        "Feedback Analysis",
                                        selectedRecord.feedbackAnalysis
                                    )}
                                    {renderNarrativeSection(
                                        "Attainment Summary",
                                        selectedRecord.attainmentSummary
                                    )}
                                    {renderNarrativeSection(
                                        "Action Taken",
                                        selectedRecord.actionTaken
                                    )}
                                    {renderNarrativeSection(
                                        "Innovation Highlights",
                                        selectedRecord.innovationHighlights
                                    )}
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Source Teaching Load</CardTitle>
                                            <CardDescription>
                                                Auto-linked workload context from the faculty profile module.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                                            {selectedRecord.teachingLoadSnapshot ? (
                                                <>
                                                    <p>
                                                        Subject Code:{" "}
                                                        {selectedRecord.teachingLoadSnapshot.subjectCode || "-"}
                                                    </p>
                                                    <p>
                                                        L-T-P: {selectedRecord.teachingLoadSnapshot.lectureHours}-
                                                        {selectedRecord.teachingLoadSnapshot.tutorialHours}-
                                                        {selectedRecord.teachingLoadSnapshot.practicalHours}
                                                    </p>
                                                    <p>
                                                        Total Hours:{" "}
                                                        {selectedRecord.teachingLoadSnapshot.totalHours}
                                                    </p>
                                                    <p>
                                                        Pedagogy Signal:{" "}
                                                        {selectedRecord.teachingLoadSnapshot.innovativePedagogy || "-"}
                                                    </p>
                                                </>
                                            ) : (
                                                <p>No linked teaching load was resolved for this record.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Annual Teaching Snapshot</CardTitle>
                                            <CardDescription>
                                                Faculty-level teaching summary available to reviewers for context.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                                            {selectedRecord.teachingSummarySnapshot ? (
                                                <>
                                                    <p>
                                                        Classes Taken:{" "}
                                                        {selectedRecord.teachingSummarySnapshot.classesTaken}
                                                    </p>
                                                    <p>
                                                        Preparation Hours:{" "}
                                                        {selectedRecord.teachingSummarySnapshot.coursePreparationHours}
                                                    </p>
                                                    <p>
                                                        Mentoring:{" "}
                                                        {selectedRecord.teachingSummarySnapshot.mentoringCount}
                                                    </p>
                                                    <p>
                                                        Lab Supervision:{" "}
                                                        {selectedRecord.teachingSummarySnapshot.labSupervisionCount}
                                                    </p>
                                                    <p>
                                                        Feedback Summary:{" "}
                                                        {selectedRecord.teachingSummarySnapshot.feedbackSummary || "-"}
                                                    </p>
                                                </>
                                            ) : (
                                                <p>No teaching summary snapshot was resolved for this contributor.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Lesson Delivery Register</CardTitle>
                                        <CardDescription>
                                            Planned and delivered sessions, pedagogy signals, and evidence links.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {selectedRecord.sessions.length ? (
                                            selectedRecord.sessions.map((session) => (
                                                <div
                                                    className="rounded-lg border border-border bg-muted/50 p-4"
                                                    key={session.id}
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="secondary">
                                                            Session {session.sessionNumber}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {session.teachingMethod}
                                                        </Badge>
                                                        {session.isDelivered ? (
                                                            <Badge className="bg-success-muted text-success-muted-foreground">
                                                                Delivered
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-warning-muted text-warning-muted-foreground">
                                                                Planned
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="mt-3 text-sm font-semibold text-foreground">
                                                        {session.topic}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {session.moduleTitle || "Module not tagged"} · Planned{" "}
                                                        {formatDate(session.plannedDate)} · Delivered{" "}
                                                        {formatDate(session.deliveredDate)}
                                                    </p>
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        Attendance {session.attendancePercent ?? "-"}% · Outcome{" "}
                                                        {session.learningOutcome || "-"} · ICT{" "}
                                                        {session.ictTool || "-"}
                                                    </p>
                                                    {session.reflectionNotes ? (
                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                            Reflection: {session.reflectionNotes}
                                                        </p>
                                                    ) : null}
                                                    {session.document ? (
                                                        <a
                                                            className="mt-3 inline-flex text-sm font-medium text-foreground underline"
                                                            href={session.document.fileUrl}
                                                            rel="noreferrer"
                                                            target="_blank"
                                                        >
                                                            Evidence: {session.document.fileName || "Open document"}
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                                                No session records were submitted.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Assessment and Attainment</CardTitle>
                                        <CardDescription>
                                            Internal evaluation checkpoints, CO mapping, and attainment indicators.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {selectedRecord.assessments.length ? (
                                            selectedRecord.assessments.map((assessment) => (
                                                <div
                                                    className="rounded-lg border border-border bg-muted/50 p-4"
                                                    key={assessment.id}
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="secondary">
                                                            {assessment.assessmentType}
                                                        </Badge>
                                                        {assessment.isCompleted ? (
                                                            <Badge className="bg-success-muted text-success-muted-foreground">
                                                                Completed
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-warning-muted text-warning-muted-foreground">
                                                                Scheduled
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="mt-3 text-sm font-semibold text-foreground">
                                                        {assessment.title}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Weightage {assessment.weightage}% · Scheduled{" "}
                                                        {formatDate(assessment.scheduledDate)} · Evaluated{" "}
                                                        {formatDate(assessment.evaluatedDate)}
                                                    </p>
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        CO Mapping:{" "}
                                                        {assessment.coMappingCodes.length
                                                            ? assessment.coMappingCodes.join(", ")
                                                            : "-"}
                                                    </p>
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        Max Marks {assessment.maxMarks ?? "-"} · Average{" "}
                                                        {assessment.averageMarks ?? "-"} · Attainment{" "}
                                                        {assessment.attainmentPercentage ?? "-"}%
                                                    </p>
                                                    {assessment.remarks ? (
                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                            Remarks: {assessment.remarks}
                                                        </p>
                                                    ) : null}
                                                    {assessment.document ? (
                                                        <a
                                                            className="mt-3 inline-flex text-sm font-medium text-foreground underline"
                                                            href={assessment.document.fileUrl}
                                                            rel="noreferrer"
                                                            target="_blank"
                                                        >
                                                            Evidence:{" "}
                                                            {assessment.document.fileName || "Open document"}
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                                                No assessment records were submitted.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Learner Support Register</CardTitle>
                                        <CardDescription>
                                            Remedial, mentoring, and learner-support interventions captured for the course.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {selectedRecord.supports.length ? (
                                            selectedRecord.supports.map((support) => (
                                                <div
                                                    className="rounded-lg border border-border bg-muted/50 p-4"
                                                    key={support.id}
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="secondary">
                                                            {support.supportType}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {formatDate(support.interventionDate)}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-3 text-sm font-semibold text-foreground">
                                                        {support.title}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Target Group {support.targetGroup || "-"} · Participants{" "}
                                                        {support.participantCount ?? "-"}
                                                    </p>
                                                    {support.outcomeSummary ? (
                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                            Outcome: {support.outcomeSummary}
                                                        </p>
                                                    ) : null}
                                                    {support.followUpAction ? (
                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                            Follow-up: {support.followUpAction}
                                                        </p>
                                                    ) : null}
                                                    {support.document ? (
                                                        <a
                                                            className="mt-3 inline-flex text-sm font-medium text-foreground underline"
                                                            href={support.document.fileUrl}
                                                            rel="noreferrer"
                                                            target="_blank"
                                                        >
                                                            Evidence: {support.document.fileName || "Open document"}
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                                                No learner-support entries were submitted.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Evidence and Workflow Trail</CardTitle>
                                        <CardDescription>
                                            Linked documents, supporting URLs, review decisions, and status movement.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Course file artefacts
                                            </p>
                                            <div className="mt-2 grid gap-3 md:grid-cols-3">
                                                {[
                                                    {
                                                        label: "Lesson Plan",
                                                        document: selectedRecord.lessonPlanDocument,
                                                    },
                                                    {
                                                        label: "Question Paper / Assessment Instrument",
                                                        document: selectedRecord.questionPaperDocument,
                                                    },
                                                    {
                                                        label: "Result Analysis",
                                                        document: selectedRecord.resultAnalysisDocument,
                                                    },
                                                ].map((item) => (
                                                    <div
                                                        className="rounded-lg border border-border bg-muted/50 p-3"
                                                        key={item.label}
                                                    >
                                                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                            {item.label}
                                                        </p>
                                                        {item.document ? (
                                                            <>
                                                                <a
                                                                    className="mt-2 block text-sm font-medium text-foreground underline"
                                                                    href={item.document.fileUrl}
                                                                    rel="noreferrer"
                                                                    target="_blank"
                                                                >
                                                                    {item.document.fileName || "Open document"}
                                                                </a>
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {item.document.verificationStatus || "Pending"} · Uploaded{" "}
                                                                    {formatDateTime(item.document.uploadedAt)}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className="mt-2 text-sm text-muted-foreground">
                                                                Not attached.
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Supporting links</p>
                                            <div className="mt-2 space-y-2">
                                                {selectedRecord.supportingLinks.length ? (
                                                    selectedRecord.supportingLinks.map((link) => (
                                                        <a
                                                            className="block text-sm text-foreground underline"
                                                            href={link}
                                                            key={link}
                                                            rel="noreferrer"
                                                            target="_blank"
                                                        >
                                                            {link}
                                                        </a>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">No supporting links attached.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Evidence documents</p>
                                            <div className="mt-2 space-y-2">
                                                {selectedRecord.documents.length ? (
                                                    selectedRecord.documents.map((document) => (
                                                        <div
                                                            className="rounded-lg border border-border bg-muted/50 p-3"
                                                            key={document.id}
                                                        >
                                                            <a
                                                                className="text-sm font-medium text-foreground underline"
                                                                href={document.fileUrl}
                                                                rel="noreferrer"
                                                                target="_blank"
                                                            >
                                                                {document.fileName || "Open document"}
                                                            </a>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {document.verificationStatus || "Pending"} · Uploaded{" "}
                                                                {formatDateTime(document.uploadedAt)}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        No assignment-level evidence files attached.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Review history</p>
                                                <div className="mt-2 space-y-2">
                                                    {selectedRecord.reviewHistory.length ? (
                                                        selectedRecord.reviewHistory.map((entry, index) => (
                                                            <div
                                                                className="rounded-lg border border-border bg-muted/50 p-3"
                                                                key={`${entry.stage}-${index}`}
                                                            >
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {entry.stage} · {entry.decision}
                                                                </p>
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {entry.reviewerName || "Reviewer"} ·{" "}
                                                                    {entry.reviewerRole || "-"} ·{" "}
                                                                    {formatDateTime(entry.reviewedAt)}
                                                                </p>
                                                                {entry.remarks ? (
                                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                                        {entry.remarks}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">
                                                            No review actions recorded yet.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Status logs</p>
                                                <div className="mt-2 space-y-2">
                                                    {selectedRecord.statusLogs.length ? (
                                                        selectedRecord.statusLogs.map((entry, index) => (
                                                            <div
                                                                className="rounded-lg border border-border bg-muted/50 p-3"
                                                                key={`${entry.status}-${index}`}
                                                            >
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {entry.status}
                                                                </p>
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {entry.actorName || "System"} ·{" "}
                                                                    {entry.actorRole || "-"} ·{" "}
                                                                    {formatDateTime(entry.changedAt)}
                                                                </p>
                                                                {entry.remarks ? (
                                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                                        {entry.remarks}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">
                                                            No status history recorded yet.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Reviewer Decision</CardTitle>
                                        <CardDescription>
                                            Remarks are required. Action buttons appear only when this stage is mapped to your account.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Textarea
                                            onChange={(event) =>
                                                setRemarks((current) => ({
                                                    ...current,
                                                    [selectedRecord._id]: event.target.value,
                                                }))
                                            }
                                            placeholder="Record review comments, deficiencies, or approval rationale"
                                            value={remarks[selectedRecord._id] ?? ""}
                                        />
                                        <div className="flex flex-wrap gap-3">
                                            {selectedRecord.availableDecisions.map((decision) => (
                                                <Button
                                                    disabled={
                                                        isPending ||
                                                        !selectedRecord.permissions.canReview ||
                                                        !(remarks[selectedRecord._id] ?? "").trim()
                                                    }
                                                    key={decision}
                                                    onClick={() => submitDecision(decision)}
                                                    variant={
                                                        decision === "Reject" ? "destructive" : "default"
                                                    }
                                                >
                                                    {isPending ? "Saving..." : decision}
                                                </Button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-border bg-muted/50 p-8 text-sm text-muted-foreground">
                                Select a teaching-learning record from the register to inspect it.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
