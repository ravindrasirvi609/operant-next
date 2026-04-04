"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
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
};

type IqacMeetingRecord = {
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
    documentId?: string;
    document?: DocumentRecord;
};

type QualityInitiativeRecord = {
    id: string;
    initiativeType: string;
    title: string;
    startDate?: string;
    endDate?: string;
    status: string;
    ownerName?: string;
    impactSummary?: string;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type PolicyCircularRecord = {
    id: string;
    policyType: string;
    title: string;
    issueDate?: string;
    issuingAuthority?: string;
    applicabilityScope?: string;
    revisionStatus: string;
    summary?: string;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type ComplianceReviewRecord = {
    id: string;
    reviewType: string;
    title: string;
    reviewDate?: string;
    status: string;
    riskLevel: string;
    observationsSummary?: string;
    actionTakenSummary?: string;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type AssignmentRecord = {
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
    documentIds: string[];
    documents: DocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    iqacMeetings: IqacMeetingRecord[];
    qualityInitiatives: QualityInitiativeRecord[];
    policyCirculars: PolicyCircularRecord[];
    complianceReviews: ComplianceReviewRecord[];
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
    updatedAt?: string;
    currentStageLabel: string;
};

type IqacMeetingRow = {
    id?: string;
    meetingType: string;
    title: string;
    meetingDate: string;
    chairedBy: string;
    attendeeCount: string;
    agendaSummary: string;
    decisionSummary: string;
    actionTakenSummary: string;
    remarks: string;
    documentId: string;
};

type QualityInitiativeRow = {
    id?: string;
    initiativeType: string;
    title: string;
    startDate: string;
    endDate: string;
    status: string;
    ownerName: string;
    impactSummary: string;
    remarks: string;
    documentId: string;
};

type PolicyCircularRow = {
    id?: string;
    policyType: string;
    title: string;
    issueDate: string;
    issuingAuthority: string;
    applicabilityScope: string;
    revisionStatus: string;
    summary: string;
    remarks: string;
    documentId: string;
};

type ComplianceReviewRow = {
    id?: string;
    reviewType: string;
    title: string;
    reviewDate: string;
    status: string;
    riskLevel: string;
    observationsSummary: string;
    actionTakenSummary: string;
    remarks: string;
    documentId: string;
};

type FormState = {
    governanceStructureNarrative: string;
    leadershipParticipationNarrative: string;
    iqacFrameworkNarrative: string;
    qualityInitiativesNarrative: string;
    policyGovernanceNarrative: string;
    complianceMonitoringNarrative: string;
    stakeholderParticipationNarrative: string;
    institutionalBestPracticesNarrative: string;
    feedbackLoopNarrative: string;
    actionPlan: string;
    supportingLinks: string;
    documentIds: string;
    contributorRemarks: string;
    iqacMeetings: IqacMeetingRow[];
    qualityInitiatives: QualityInitiativeRow[];
    policyCirculars: PolicyCircularRow[];
    complianceReviews: ComplianceReviewRow[];
};

const narrativeFields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
    { key: "governanceStructureNarrative", label: "Governance structure", placeholder: "Summarize the institutional governance structure, delegated authorities, committee architecture, and operating model." },
    { key: "leadershipParticipationNarrative", label: "Leadership participation", placeholder: "Describe the participation of HODs, principals, directors, and office heads in planning, execution, and review." },
    { key: "iqacFrameworkNarrative", label: "IQAC framework", placeholder: "Capture IQAC constitution, mandate, meeting discipline, and internal quality assurance processes." },
    { key: "qualityInitiativesNarrative", label: "Quality initiatives", placeholder: "Explain academic audits, feedback analysis, quality reforms, digital governance, and improvement initiatives." },
    { key: "policyGovernanceNarrative", label: "Policy and circular governance", placeholder: "Record how policies, circulars, guidelines, and institutional directions are issued, communicated, and tracked." },
    { key: "complianceMonitoringNarrative", label: "Compliance monitoring", placeholder: "Describe the compliance review model, observation tracking, closures, and escalation mechanism." },
    { key: "stakeholderParticipationNarrative", label: "Stakeholder participation", placeholder: "Explain how faculty, students, alumni, and external members are involved in governance and quality processes." },
    { key: "institutionalBestPracticesNarrative", label: "Institutional best practices", placeholder: "Capture governance-led best practices, evidence of success, and their institutional impact." },
    { key: "feedbackLoopNarrative", label: "Feedback loop", placeholder: "Describe how governance feedback is collected, reviewed, acted upon, and closed with documented follow-through." },
    { key: "actionPlan", label: "Action plan", placeholder: "List unresolved gaps, next-cycle priorities, accountable owners, and measurable improvement actions." },
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

function splitLines(value: string) {
    return value
        .split(/\n+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function splitCommaValues(value: string) {
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function emptyIqacMeetingRow(): IqacMeetingRow {
    return {
        meetingType: "IQAC",
        title: "",
        meetingDate: "",
        chairedBy: "",
        attendeeCount: "",
        agendaSummary: "",
        decisionSummary: "",
        actionTakenSummary: "",
        remarks: "",
        documentId: "",
    };
}

function emptyQualityInitiativeRow(): QualityInitiativeRow {
    return {
        initiativeType: "AcademicAudit",
        title: "",
        startDate: "",
        endDate: "",
        status: "Planned",
        ownerName: "",
        impactSummary: "",
        remarks: "",
        documentId: "",
    };
}

function emptyPolicyCircularRow(): PolicyCircularRow {
    return {
        policyType: "Policy",
        title: "",
        issueDate: "",
        issuingAuthority: "",
        applicabilityScope: "",
        revisionStatus: "New",
        summary: "",
        remarks: "",
        documentId: "",
    };
}

function emptyComplianceReviewRow(): ComplianceReviewRow {
    return {
        reviewType: "InternalQualityReview",
        title: "",
        reviewDate: "",
        status: "Scheduled",
        riskLevel: "Moderate",
        observationsSummary: "",
        actionTakenSummary: "",
        remarks: "",
        documentId: "",
    };
}

function buildInitialForm(record: AssignmentRecord): FormState {
    return {
        governanceStructureNarrative: record.governanceStructureNarrative ?? "",
        leadershipParticipationNarrative: record.leadershipParticipationNarrative ?? "",
        iqacFrameworkNarrative: record.iqacFrameworkNarrative ?? "",
        qualityInitiativesNarrative: record.qualityInitiativesNarrative ?? "",
        policyGovernanceNarrative: record.policyGovernanceNarrative ?? "",
        complianceMonitoringNarrative: record.complianceMonitoringNarrative ?? "",
        stakeholderParticipationNarrative: record.stakeholderParticipationNarrative ?? "",
        institutionalBestPracticesNarrative: record.institutionalBestPracticesNarrative ?? "",
        feedbackLoopNarrative: record.feedbackLoopNarrative ?? "",
        actionPlan: record.actionPlan ?? "",
        supportingLinks: record.supportingLinks.join("\n"),
        documentIds: record.documentIds.join(", "),
        contributorRemarks: record.contributorRemarks ?? "",
        iqacMeetings: record.iqacMeetings.length
            ? record.iqacMeetings.map((row) => ({
                  id: row.id,
                  meetingType: row.meetingType,
                  title: row.title,
                  meetingDate: row.meetingDate ? row.meetingDate.slice(0, 10) : "",
                  chairedBy: row.chairedBy ?? "",
                  attendeeCount: row.attendeeCount !== undefined ? String(row.attendeeCount) : "",
                  agendaSummary: row.agendaSummary ?? "",
                  decisionSummary: row.decisionSummary ?? "",
                  actionTakenSummary: row.actionTakenSummary ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyIqacMeetingRow()],
        qualityInitiatives: record.qualityInitiatives.length
            ? record.qualityInitiatives.map((row) => ({
                  id: row.id,
                  initiativeType: row.initiativeType,
                  title: row.title,
                  startDate: row.startDate ? row.startDate.slice(0, 10) : "",
                  endDate: row.endDate ? row.endDate.slice(0, 10) : "",
                  status: row.status,
                  ownerName: row.ownerName ?? "",
                  impactSummary: row.impactSummary ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyQualityInitiativeRow()],
        policyCirculars: record.policyCirculars.length
            ? record.policyCirculars.map((row) => ({
                  id: row.id,
                  policyType: row.policyType,
                  title: row.title,
                  issueDate: row.issueDate ? row.issueDate.slice(0, 10) : "",
                  issuingAuthority: row.issuingAuthority ?? "",
                  applicabilityScope: row.applicabilityScope ?? "",
                  revisionStatus: row.revisionStatus,
                  summary: row.summary ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyPolicyCircularRow()],
        complianceReviews: record.complianceReviews.length
            ? record.complianceReviews.map((row) => ({
                  id: row.id,
                  reviewType: row.reviewType,
                  title: row.title,
                  reviewDate: row.reviewDate ? row.reviewDate.slice(0, 10) : "",
                  status: row.status,
                  riskLevel: row.riskLevel,
                  observationsSummary: row.observationsSummary ?? "",
                  actionTakenSummary: row.actionTakenSummary ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyComplianceReviewRow()],
    };
}

export function GovernanceLeadershipIqacContributorWorkspace({
    assignments,
    actorLabel,
}: {
    assignments: AssignmentRecord[];
    actorLabel: string;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [selectedId, setSelectedId] = useState(assignments[0]?._id ?? "");
    const [form, setForm] = useState<FormState>(
        assignments[0]
            ? buildInitialForm(assignments[0])
            : {
                  governanceStructureNarrative: "",
                  leadershipParticipationNarrative: "",
                  iqacFrameworkNarrative: "",
                  qualityInitiativesNarrative: "",
                  policyGovernanceNarrative: "",
                  complianceMonitoringNarrative: "",
                  stakeholderParticipationNarrative: "",
                  institutionalBestPracticesNarrative: "",
                  feedbackLoopNarrative: "",
                  actionPlan: "",
                  supportingLinks: "",
                  documentIds: "",
                  contributorRemarks: "",
                  iqacMeetings: [emptyIqacMeetingRow()],
                  qualityInitiatives: [emptyQualityInitiativeRow()],
                  policyCirculars: [emptyPolicyCircularRow()],
                  complianceReviews: [emptyComplianceReviewRow()],
              }
    );
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredAssignments = assignments.filter((assignment) => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [
            assignment.planTitle,
            assignment.academicYearLabel,
            assignment.unitLabel,
            assignment.status,
            assignment.currentStageLabel,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    useEffect(() => {
        if (!filteredAssignments.length) {
            setSelectedId("");
            return;
        }

        if (!filteredAssignments.some((item) => item._id === selectedId)) {
            setSelectedId(filteredAssignments[0]._id);
        }
    }, [filteredAssignments, selectedId]);

    const selectedAssignment =
        filteredAssignments.find((assignment) => assignment._id === selectedId) ?? null;

    useEffect(() => {
        if (!selectedAssignment) {
            return;
        }

        setForm(buildInitialForm(selectedAssignment));
    }, [selectedAssignment]);

    function updateNarrative(key: keyof FormState, value: string) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function updateFacility(index: number, key: keyof IqacMeetingRow, value: string) {
        setForm((current) => ({
            ...current,
            iqacMeetings: current.iqacMeetings.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateLibraryResource(
        index: number,
        key: keyof QualityInitiativeRow,
        value: string
    ) {
        setForm((current) => ({
            ...current,
            qualityInitiatives: current.qualityInitiatives.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateUsage(index: number, key: keyof PolicyCircularRow, value: string) {
        setForm((current) => ({
            ...current,
            policyCirculars: current.policyCirculars.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateMaintenance(index: number, key: keyof ComplianceReviewRow, value: string) {
        setForm((current) => ({
            ...current,
            complianceReviews: current.complianceReviews.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function buildDraftPayload() {
        return {
            governanceStructureNarrative: form.governanceStructureNarrative.trim(),
            leadershipParticipationNarrative: form.leadershipParticipationNarrative.trim(),
            iqacFrameworkNarrative: form.iqacFrameworkNarrative.trim(),
            qualityInitiativesNarrative: form.qualityInitiativesNarrative.trim(),
            policyGovernanceNarrative: form.policyGovernanceNarrative.trim(),
            complianceMonitoringNarrative: form.complianceMonitoringNarrative.trim(),
            stakeholderParticipationNarrative: form.stakeholderParticipationNarrative.trim(),
            institutionalBestPracticesNarrative: form.institutionalBestPracticesNarrative.trim(),
            feedbackLoopNarrative: form.feedbackLoopNarrative.trim(),
            actionPlan: form.actionPlan.trim(),
            supportingLinks: splitLines(form.supportingLinks),
            documentIds: splitCommaValues(form.documentIds),
            contributorRemarks: form.contributorRemarks.trim(),
            iqacMeetings: form.iqacMeetings
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    meetingType: row.meetingType,
                    title: row.title.trim(),
                    meetingDate: row.meetingDate || undefined,
                    chairedBy: row.chairedBy.trim(),
                    attendeeCount:
                        row.attendeeCount.trim() === "" ? undefined : Number(row.attendeeCount),
                    agendaSummary: row.agendaSummary.trim(),
                    decisionSummary: row.decisionSummary.trim(),
                    actionTakenSummary: row.actionTakenSummary.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            qualityInitiatives: form.qualityInitiatives
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    initiativeType: row.initiativeType,
                    title: row.title.trim(),
                    startDate: row.startDate || undefined,
                    endDate: row.endDate || undefined,
                    status: row.status,
                    ownerName: row.ownerName.trim(),
                    impactSummary: row.impactSummary.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            policyCirculars: form.policyCirculars
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    policyType: row.policyType,
                    title: row.title.trim(),
                    issueDate: row.issueDate || undefined,
                    issuingAuthority: row.issuingAuthority.trim(),
                    applicabilityScope: row.applicabilityScope.trim(),
                    revisionStatus: row.revisionStatus,
                    summary: row.summary.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            complianceReviews: form.complianceReviews
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    reviewType: row.reviewType,
                    title: row.title.trim(),
                    reviewDate: row.reviewDate || undefined,
                    status: row.status,
                    riskLevel: row.riskLevel,
                    observationsSummary: row.observationsSummary.trim(),
                    actionTakenSummary: row.actionTakenSummary.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
        };
    }

    async function persistDraft(assignmentId: string) {
        return requestJson<{ message?: string }>(
            `/api/governance-leadership-iqac/assignments/${assignmentId}/contribution`,
            {
                method: "PUT",
                body: JSON.stringify(buildDraftPayload()),
            }
        );
    }

    function saveDraft() {
        if (!selectedAssignment) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const data = await persistDraft(selectedAssignment._id);
                setMessage({
                    type: "success",
                    text: data.message ?? "Governance Leadership / IQAC draft saved successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the governance leadership / IQAC draft.",
                });
            }
        });
    }

    function submitAssignment() {
        if (!selectedAssignment) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                await persistDraft(selectedAssignment._id);
                const data = await requestJson<{ message?: string }>(
                    `/api/governance-leadership-iqac/assignments/${selectedAssignment._id}/submit`,
                    { method: "POST" }
                );
                setMessage({
                    type: "success",
                    text:
                        data.message ??
                        "Governance Leadership / IQAC assignment submitted successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to submit the governance leadership / IQAC assignment.",
                });
            }
        });
    }

    if (!assignments.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Governance Leadership & IQAC Workspace</CardTitle>
                    <CardDescription>
                        No governance leadership / IQAC assignments are mapped to this account yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const canEdit = selectedAssignment
        ? ["Draft", "Rejected"].includes(selectedAssignment.status)
        : false;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{actorLabel} Governance Leadership & IQAC workspace</CardTitle>
                    <CardDescription>
                        Complete the governed portfolio with IQAC meetings, quality initiatives, policy records, and compliance evidence before sending it into review.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        className="max-w-sm"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by plan, unit, or status"
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
                            {filteredAssignments.map((assignment) => {
                                const active = assignment._id === selectedId;

                                return (
                                    <button
                                        className={`w-full rounded-xl border p-4 text-left transition ${
                                            active
                                                ? "border-zinc-900 bg-zinc-900 text-white"
                                                : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100"
                                        }`}
                                        key={assignment._id}
                                        onClick={() => setSelectedId(assignment._id)}
                                        type="button"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">
                                                    {assignment.focusArea}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold">
                                                    {assignment.planTitle}
                                                </p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    {assignment.unitLabel} · {assignment.academicYearLabel}
                                                </p>
                                            </div>
                                            <div>{statusBadge(assignment.status)}</div>
                                        </div>
                                        <p className="mt-3 text-xs opacity-80">
                                            {assignment.currentStageLabel} · {assignment.valueSummary}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedAssignment ? (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {statusBadge(selectedAssignment.status)}
                                                <Badge variant="secondary">
                                                    {selectedAssignment.currentStageLabel}
                                                </Badge>
                                                <Badge variant="outline">{selectedAssignment.scopeType}</Badge>
                                                <Badge variant="outline">{selectedAssignment.focusArea}</Badge>
                                            </div>
                                            <h3 className="mt-3 text-2xl font-semibold text-zinc-950">
                                                {selectedAssignment.planTitle}
                                            </h3>
                                            <p className="mt-2 text-sm text-zinc-600">
                                                {selectedAssignment.unitLabel} · {selectedAssignment.academicYearLabel}
                                            </p>
                                            <p className="mt-2 text-sm text-zinc-500">
                                                Due {formatDate(selectedAssignment.dueDate)} · Plan status{" "}
                                                {selectedAssignment.planStatus}
                                            </p>
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                            <p>IQAC meetings: {selectedAssignment.iqacMeetings.length}</p>
                                            <p>Quality initiatives: {selectedAssignment.qualityInitiatives.length}</p>
                                            <p>Policy circular rows: {selectedAssignment.policyCirculars.length}</p>
                                            <p>Compliance review rows: {selectedAssignment.complianceReviews.length}</p>
                                            <p>Updated: {formatDate(selectedAssignment.updatedAt)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <MetricCard label="Meeting target" value={selectedAssignment.planTargets.meetings} />
                                        <MetricCard label="Initiative target" value={selectedAssignment.planTargets.initiatives} />
                                        <MetricCard label="Policy target" value={selectedAssignment.planTargets.policies} />
                                        <MetricCard label="Compliance target" value={selectedAssignment.planTargets.complianceReviews} />
                                    </div>

                                    <div className="mt-5 space-y-3 text-sm text-zinc-600">
                                        <p>{selectedAssignment.planSummary?.trim() || "No plan summary provided."}</p>
                                        <p>{selectedAssignment.planStrategicPriorities?.trim() || "No strategic priorities defined on the plan."}</p>
                                        {selectedAssignment.notes ? (
                                            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-600">
                                                {selectedAssignment.notes}
                                            </p>
                                        ) : null}
                                        {selectedAssignment.reviewRemarks ? (
                                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                                                Latest review note: {selectedAssignment.reviewRemarks}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Narrative and evidence</CardTitle>
                                        <CardDescription>
                                            Capture the qualitative governance and IQAC story behind the structured records.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {narrativeFields.map((field) => (
                                            <div className="space-y-2" key={field.key}>
                                                <Label>{field.label}</Label>
                                                <Textarea
                                                    disabled={!canEdit}
                                                    onChange={(event) =>
                                                        updateNarrative(field.key, event.target.value)
                                                    }
                                                    placeholder={field.placeholder}
                                                    rows={4}
                                                    value={String(form[field.key] ?? "")}
                                                />
                                            </div>
                                        ))}

                                        <div className="space-y-2">
                                            <Label>Supporting links</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        supportingLinks: event.target.value,
                                                    }))
                                                }
                                                placeholder="One URL per line"
                                                rows={4}
                                                value={form.supportingLinks}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Manual evidence document IDs</Label>
                                            <Input
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        documentIds: event.target.value,
                                                    }))
                                                }
                                                placeholder="Comma separated document IDs"
                                                value={form.documentIds}
                                            />
                                        </div>

                                        {selectedAssignment.documents.length ? (
                                            <div className="grid gap-3 md:grid-cols-2">
                                                {selectedAssignment.documents.map((document) => (
                                                    <EvidenceCard document={document} key={document.id} />
                                                ))}
                                            </div>
                                        ) : null}

                                        <div className="space-y-2">
                                            <Label>Contributor remarks</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        contributorRemarks: event.target.value,
                                                    }))
                                                }
                                                rows={4}
                                                value={form.contributorRemarks}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <StructuredRowSection
                                    description="Track IQAC, governing body, academic council, and strategic planning meetings with agenda, decisions, and action taken."
                                    title="IQAC Meetings"
                                >
                                    {form.iqacMeetings.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "iqac-meeting"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Meeting type" onValueChange={(value) => updateFacility(index, "meetingType", value)} options={["IQAC","GoverningBody","AcademicCouncil","DepartmentReview","QualityCircle","StrategicPlanning","Other"]} value={row.meetingType} />
                                                <TextField disabled={!canEdit} label="Title" onChange={(value) => updateFacility(index, "title", value)} value={row.title} />
                                                <TextField disabled={!canEdit} label="Meeting date" onChange={(value) => updateFacility(index, "meetingDate", value)} type="date" value={row.meetingDate} />
                                                <TextField disabled={!canEdit} label="Chaired by" onChange={(value) => updateFacility(index, "chairedBy", value)} value={row.chairedBy} />
                                                <TextField disabled={!canEdit} label="Attendee count" onChange={(value) => updateFacility(index, "attendeeCount", value)} type="number" value={row.attendeeCount} />
                                                <TextField disabled={!canEdit} label="Action taken summary" onChange={(value) => updateFacility(index, "actionTakenSummary", value)} value={row.actionTakenSummary} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateFacility(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Agenda summary</Label>
                                                    <Textarea disabled={!canEdit} onChange={(event) => updateFacility(index, "agendaSummary", event.target.value)} rows={3} value={row.agendaSummary} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Decision summary</Label>
                                                    <Textarea disabled={!canEdit} onChange={(event) => updateFacility(index, "decisionSummary", event.target.value)} rows={3} value={row.decisionSummary} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateFacility(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, iqacMeetings: [...current.iqacMeetings, emptyIqacMeetingRow()] }))} onRemove={() => setForm((current) => ({ ...current, iqacMeetings: current.iqacMeetings.length > 1 ? current.iqacMeetings.filter((_, rowIndex) => rowIndex !== index) : [emptyIqacMeetingRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Capture quality initiatives such as audits, feedback reforms, capacity building, digital governance, and accreditation readiness."
                                    title="Quality Initiatives"
                                >
                                    {form.qualityInitiatives.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "quality-initiative"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Initiative type" onValueChange={(value) => updateLibraryResource(index, "initiativeType", value)} options={["AcademicAudit","FeedbackAnalysis","BestPractice","CapacityBuilding","GreenCampus","DigitalGovernance","AccreditationReadiness","StakeholderOutreach","Other"]} value={row.initiativeType} />
                                                <TextField disabled={!canEdit} label="Title" onChange={(value) => updateLibraryResource(index, "title", value)} value={row.title} />
                                                <TextField disabled={!canEdit} label="Start date" onChange={(value) => updateLibraryResource(index, "startDate", value)} type="date" value={row.startDate} />
                                                <TextField disabled={!canEdit} label="End date" onChange={(value) => updateLibraryResource(index, "endDate", value)} type="date" value={row.endDate} />
                                                <SelectField disabled={!canEdit} label="Status" onValueChange={(value) => updateLibraryResource(index, "status", value)} options={["Planned","InProgress","Completed","OnHold","Continuous"]} value={row.status} />
                                                <TextField disabled={!canEdit} label="Owner name" onChange={(value) => updateLibraryResource(index, "ownerName", value)} value={row.ownerName} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateLibraryResource(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Impact summary</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateLibraryResource(index, "impactSummary", event.target.value)} rows={3} value={row.impactSummary} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateLibraryResource(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, qualityInitiatives: [...current.qualityInitiatives, emptyQualityInitiativeRow()] }))} onRemove={() => setForm((current) => ({ ...current, qualityInitiatives: current.qualityInitiatives.length > 1 ? current.qualityInitiatives.filter((_, rowIndex) => rowIndex !== index) : [emptyQualityInitiativeRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Maintain policy, circular, SOP, code-of-conduct, and strategic-plan records with revision tracking."
                                    title="Policy & Circular Tracking"
                                >
                                    {form.policyCirculars.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "policy-circular"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Policy type" onValueChange={(value) => updateUsage(index, "policyType", value)} options={["Policy","Circular","SOP","Guidelines","Manual","CodeOfConduct","StrategicPlan","Other"]} value={row.policyType} />
                                                <TextField disabled={!canEdit} label="Title" onChange={(value) => updateUsage(index, "title", value)} value={row.title} />
                                                <TextField disabled={!canEdit} label="Issue date" onChange={(value) => updateUsage(index, "issueDate", value)} type="date" value={row.issueDate} />
                                                <TextField disabled={!canEdit} label="Issuing authority" onChange={(value) => updateUsage(index, "issuingAuthority", value)} value={row.issuingAuthority} />
                                                <TextField disabled={!canEdit} label="Applicability scope" onChange={(value) => updateUsage(index, "applicabilityScope", value)} value={row.applicabilityScope} />
                                                <SelectField disabled={!canEdit} label="Revision status" onValueChange={(value) => updateUsage(index, "revisionStatus", value)} options={["New","Reviewed","Revised","Active","Archived"]} value={row.revisionStatus} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateUsage(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Summary</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateUsage(index, "summary", event.target.value)} rows={3} value={row.summary} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateUsage(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, policyCirculars: [...current.policyCirculars, emptyPolicyCircularRow()] }))} onRemove={() => setForm((current) => ({ ...current, policyCirculars: current.policyCirculars.length > 1 ? current.policyCirculars.filter((_, rowIndex) => rowIndex !== index) : [emptyPolicyCircularRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Track audit and compliance reviews with risk levels, observations, action taken, and closure status."
                                    title="Compliance Reviews"
                                >
                                    {form.complianceReviews.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "compliance-review"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Review type" onValueChange={(value) => updateMaintenance(index, "reviewType", value)} options={["AcademicAudit","AdministrativeAudit","NAACReadiness","NIRFReview","StatutoryCompliance","InternalQualityReview","ISOReview","Other"]} value={row.reviewType} />
                                                <TextField disabled={!canEdit} label="Title" onChange={(value) => updateMaintenance(index, "title", value)} value={row.title} />
                                                <TextField disabled={!canEdit} label="Review date" onChange={(value) => updateMaintenance(index, "reviewDate", value)} type="date" value={row.reviewDate} />
                                                <SelectField disabled={!canEdit} label="Status" onValueChange={(value) => updateMaintenance(index, "status", value)} options={["Scheduled","Completed","ActionTaken","Closed","Escalated"]} value={row.status} />
                                                <SelectField disabled={!canEdit} label="Risk level" onValueChange={(value) => updateMaintenance(index, "riskLevel", value)} options={["Low","Moderate","High","Critical"]} value={row.riskLevel} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateMaintenance(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Observations summary</Label>
                                                    <Textarea disabled={!canEdit} onChange={(event) => updateMaintenance(index, "observationsSummary", event.target.value)} rows={3} value={row.observationsSummary} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Action taken summary</Label>
                                                    <Textarea disabled={!canEdit} onChange={(event) => updateMaintenance(index, "actionTakenSummary", event.target.value)} rows={3} value={row.actionTakenSummary} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateMaintenance(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, complianceReviews: [...current.complianceReviews, emptyComplianceReviewRow()] }))} onRemove={() => setForm((current) => ({ ...current, complianceReviews: current.complianceReviews.length > 1 ? current.complianceReviews.filter((_, rowIndex) => rowIndex !== index) : [emptyComplianceReviewRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Workflow history</CardTitle>
                                        <CardDescription>
                                            Past review and workflow movements on this governed portfolio file.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-zinc-950">Review history</p>
                                            {selectedAssignment.reviewHistory.length ? (
                                                selectedAssignment.reviewHistory.map((entry, index) => (
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
                                            {selectedAssignment.statusLogs.length ? (
                                                selectedAssignment.statusLogs.map((entry, index) => (
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

                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={!canEdit || isPending} onClick={saveDraft} type="button">
                                        Save draft
                                    </Button>
                                    <Button disabled={!canEdit || isPending} onClick={submitAssignment} type="button">
                                        Submit for review
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function StructuredRowSection({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
        </Card>
    );
}

function TextField({
    label,
    value,
    onChange,
    type = "text",
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input disabled={disabled} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
        </div>
    );
}

function SelectField({
    label,
    value,
    onValueChange,
    options,
    disabled,
}: {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select disabled={disabled} onValueChange={onValueChange} value={value}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function RowActions({
    canEdit,
    onAdd,
    onRemove,
}: {
    canEdit: boolean;
    onAdd: () => void;
    onRemove: () => void;
}) {
    if (!canEdit) {
        return null;
    }

    return (
        <div className="flex gap-3">
            <Button onClick={onAdd} type="button" variant="secondary">
                Add row
            </Button>
            <Button onClick={onRemove} type="button" variant="outline">
                Remove row
            </Button>
        </div>
    );
}

function EvidenceCard({ document }: { document: DocumentRecord }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
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
                <p className="text-sm font-semibold text-zinc-950">{document.fileName || document.id}</p>
            )}
            <p className="mt-1 text-xs text-zinc-500">
                {document.verificationStatus || "Verification pending"}
            </p>
        </div>
    );
}
