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

type MentorGroupRecord = {
    id: string;
    groupName: string;
    programName?: string;
    batchLabel?: string;
    mentorName?: string;
    menteeCount?: number;
    meetingCount?: number;
    supportThemes?: string;
    escalatedCount?: number;
    actionTaken?: string;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type GrievanceRecord = {
    id: string;
    category: string;
    referenceNumber?: string;
    lodgedByType: string;
    receivedDate?: string;
    resolvedDate?: string;
    status: string;
    resolutionDays?: number;
    committeeName?: string;
    resolutionSummary?: string;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type ProgressionRecord = {
    id: string;
    progressionType: string;
    title: string;
    batchLabel?: string;
    programName?: string;
    destinationName?: string;
    studentCount?: number;
    medianPackageLpa?: number;
    status: string;
    remarks?: string;
    documentId?: string;
    document?: DocumentRecord;
};

type RepresentationRecord = {
    id: string;
    representationType: string;
    bodyName: string;
    roleTitle?: string;
    studentCount?: number;
    meetingCount?: number;
    outcomeSummary?: string;
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
    planStrategyGoals?: string;
    planTargets: {
        mentorGroups: number;
        grievanceClosures: number;
        scholarshipBeneficiaries: number;
        placements: number;
        higherStudies: number;
        representationBodies: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    mentoringFramework?: string;
    grievanceRedressalSystem?: string;
    scholarshipSupport?: string;
    progressionTracking?: string;
    placementReadiness?: string;
    studentRepresentation?: string;
    wellbeingSupport?: string;
    inclusionSupport?: string;
    feedbackMechanism?: string;
    actionPlan?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: DocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    mentorGroups: MentorGroupRecord[];
    grievances: GrievanceRecord[];
    progressionRows: ProgressionRecord[];
    representationRows: RepresentationRecord[];
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

type MentorGroupRow = {
    id?: string;
    groupName: string;
    programName: string;
    batchLabel: string;
    mentorName: string;
    menteeCount: string;
    meetingCount: string;
    supportThemes: string;
    escalatedCount: string;
    actionTaken: string;
    remarks: string;
    documentId: string;
};

type GrievanceRow = {
    id?: string;
    category: string;
    referenceNumber: string;
    lodgedByType: string;
    receivedDate: string;
    resolvedDate: string;
    status: string;
    resolutionDays: string;
    committeeName: string;
    resolutionSummary: string;
    remarks: string;
    documentId: string;
};

type ProgressionRow = {
    id?: string;
    progressionType: string;
    title: string;
    batchLabel: string;
    programName: string;
    destinationName: string;
    studentCount: string;
    medianPackageLpa: string;
    status: string;
    remarks: string;
    documentId: string;
};

type RepresentationRow = {
    id?: string;
    representationType: string;
    bodyName: string;
    roleTitle: string;
    studentCount: string;
    meetingCount: string;
    outcomeSummary: string;
    remarks: string;
    documentId: string;
};

type FormState = {
    mentoringFramework: string;
    grievanceRedressalSystem: string;
    scholarshipSupport: string;
    progressionTracking: string;
    placementReadiness: string;
    studentRepresentation: string;
    wellbeingSupport: string;
    inclusionSupport: string;
    feedbackMechanism: string;
    actionPlan: string;
    supportingLinks: string;
    documentIds: string;
    contributorRemarks: string;
    mentorGroups: MentorGroupRow[];
    grievances: GrievanceRow[];
    progressionRows: ProgressionRow[];
    representationRows: RepresentationRow[];
};

const narrativeFields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
    { key: "mentoringFramework", label: "Mentoring framework", placeholder: "Summarize mentor-mentee coverage, meeting cadence, escalation paths, and academic/personal support expectations." },
    { key: "grievanceRedressalSystem", label: "Grievance redressal system", placeholder: "Describe grievance intake channels, escalation stages, response ownership, timelines, and closure governance." },
    { key: "scholarshipSupport", label: "Scholarship support", placeholder: "Capture scholarship awareness, application support, beneficiary tracking, concessions, and inclusion-focused financial aid support." },
    { key: "progressionTracking", label: "Progression tracking", placeholder: "Explain how placements, higher studies, entrepreneurship, internships, and exam outcomes are tracked and validated." },
    { key: "placementReadiness", label: "Placement readiness", placeholder: "Record training readiness, employability interventions, placement preparation, and industry engagement support." },
    { key: "studentRepresentation", label: "Student representation", placeholder: "Describe student council structures, committee representation, feedback forums, and participative governance channels." },
    { key: "wellbeingSupport", label: "Wellbeing support", placeholder: "Capture counselling, anti-ragging, wellbeing, safety, and responsive student-care mechanisms." },
    { key: "inclusionSupport", label: "Inclusion support", placeholder: "Explain support for disadvantaged learners, first-generation students, disability inclusion, and equitable access." },
    { key: "feedbackMechanism", label: "Feedback mechanism", placeholder: "Describe how student feedback is collected, reviewed, acted on, and communicated back to the student body." },
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

    if (["Submitted", "Student Support Review", "Under Review", "Governance Review"].includes(status)) {
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

function emptyMentorGroupRow(): MentorGroupRow {
    return {
        groupName: "",
        programName: "",
        batchLabel: "",
        mentorName: "",
        menteeCount: "",
        meetingCount: "",
        supportThemes: "",
        escalatedCount: "",
        actionTaken: "",
        remarks: "",
        documentId: "",
    };
}

function emptyGrievanceRow(): GrievanceRow {
    return {
        category: "Academic",
        referenceNumber: "",
        lodgedByType: "Student",
        receivedDate: "",
        resolvedDate: "",
        status: "Open",
        resolutionDays: "",
        committeeName: "",
        resolutionSummary: "",
        remarks: "",
        documentId: "",
    };
}

function emptyProgressionRow(): ProgressionRow {
    return {
        progressionType: "Placement",
        title: "",
        batchLabel: "",
        programName: "",
        destinationName: "",
        studentCount: "",
        medianPackageLpa: "",
        status: "Placed",
        remarks: "",
        documentId: "",
    };
}

function emptyRepresentationRow(): RepresentationRow {
    return {
        representationType: "StudentCouncil",
        bodyName: "",
        roleTitle: "",
        studentCount: "",
        meetingCount: "",
        outcomeSummary: "",
        remarks: "",
        documentId: "",
    };
}

function buildInitialForm(record: AssignmentRecord): FormState {
    return {
        mentoringFramework: record.mentoringFramework ?? "",
        grievanceRedressalSystem: record.grievanceRedressalSystem ?? "",
        scholarshipSupport: record.scholarshipSupport ?? "",
        progressionTracking: record.progressionTracking ?? "",
        placementReadiness: record.placementReadiness ?? "",
        studentRepresentation: record.studentRepresentation ?? "",
        wellbeingSupport: record.wellbeingSupport ?? "",
        inclusionSupport: record.inclusionSupport ?? "",
        feedbackMechanism: record.feedbackMechanism ?? "",
        actionPlan: record.actionPlan ?? "",
        supportingLinks: record.supportingLinks.join("\n"),
        documentIds: record.documentIds.join(", "),
        contributorRemarks: record.contributorRemarks ?? "",
        mentorGroups: record.mentorGroups.length
            ? record.mentorGroups.map((row) => ({
                  id: row.id,
                  groupName: row.groupName,
                  programName: row.programName ?? "",
                  batchLabel: row.batchLabel ?? "",
                  mentorName: row.mentorName ?? "",
                  menteeCount: row.menteeCount !== undefined ? String(row.menteeCount) : "",
                  meetingCount: row.meetingCount !== undefined ? String(row.meetingCount) : "",
                  supportThemes: row.supportThemes ?? "",
                  escalatedCount:
                      row.escalatedCount !== undefined ? String(row.escalatedCount) : "",
                  actionTaken: row.actionTaken ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyMentorGroupRow()],
        grievances: record.grievances.length
            ? record.grievances.map((row) => ({
                  id: row.id,
                  category: row.category,
                  referenceNumber: row.referenceNumber ?? "",
                  lodgedByType: row.lodgedByType,
                  receivedDate: row.receivedDate ? row.receivedDate.slice(0, 10) : "",
                  resolvedDate: row.resolvedDate ? row.resolvedDate.slice(0, 10) : "",
                  status: row.status,
                  resolutionDays:
                      row.resolutionDays !== undefined ? String(row.resolutionDays) : "",
                  committeeName: row.committeeName ?? "",
                  resolutionSummary: row.resolutionSummary ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyGrievanceRow()],
        progressionRows: record.progressionRows.length
            ? record.progressionRows.map((row) => ({
                  id: row.id,
                  progressionType: row.progressionType,
                  title: row.title,
                  batchLabel: row.batchLabel ?? "",
                  programName: row.programName ?? "",
                  destinationName: row.destinationName ?? "",
                  studentCount: row.studentCount !== undefined ? String(row.studentCount) : "",
                  medianPackageLpa:
                      row.medianPackageLpa !== undefined ? String(row.medianPackageLpa) : "",
                  status: row.status,
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyProgressionRow()],
        representationRows: record.representationRows.length
            ? record.representationRows.map((row) => ({
                  id: row.id,
                  representationType: row.representationType,
                  bodyName: row.bodyName,
                  roleTitle: row.roleTitle ?? "",
                  studentCount: row.studentCount !== undefined ? String(row.studentCount) : "",
                  meetingCount: row.meetingCount !== undefined ? String(row.meetingCount) : "",
                  outcomeSummary: row.outcomeSummary ?? "",
                  remarks: row.remarks ?? "",
                  documentId: row.documentId ?? "",
              }))
            : [emptyRepresentationRow()],
    };
}

export function StudentSupportGovernanceContributorWorkspace({
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
                  mentoringFramework: "",
                  grievanceRedressalSystem: "",
                  scholarshipSupport: "",
                  progressionTracking: "",
                  placementReadiness: "",
                  studentRepresentation: "",
                  wellbeingSupport: "",
                  inclusionSupport: "",
                  feedbackMechanism: "",
                  actionPlan: "",
                  supportingLinks: "",
                  documentIds: "",
                  contributorRemarks: "",
                  mentorGroups: [emptyMentorGroupRow()],
                  grievances: [emptyGrievanceRow()],
                  progressionRows: [emptyProgressionRow()],
                  representationRows: [emptyRepresentationRow()],
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

    function updateFacility(index: number, key: keyof MentorGroupRow, value: string) {
        setForm((current) => ({
            ...current,
            mentorGroups: current.mentorGroups.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateLibraryResource(
        index: number,
        key: keyof GrievanceRow,
        value: string
    ) {
        setForm((current) => ({
            ...current,
            grievances: current.grievances.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateUsage(index: number, key: keyof ProgressionRow, value: string) {
        setForm((current) => ({
            ...current,
            progressionRows: current.progressionRows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function updateMaintenance(index: number, key: keyof RepresentationRow, value: string) {
        setForm((current) => ({
            ...current,
            representationRows: current.representationRows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row
            ),
        }));
    }

    function buildDraftPayload() {
        return {
            mentoringFramework: form.mentoringFramework.trim(),
            grievanceRedressalSystem: form.grievanceRedressalSystem.trim(),
            scholarshipSupport: form.scholarshipSupport.trim(),
            progressionTracking: form.progressionTracking.trim(),
            placementReadiness: form.placementReadiness.trim(),
            studentRepresentation: form.studentRepresentation.trim(),
            wellbeingSupport: form.wellbeingSupport.trim(),
            inclusionSupport: form.inclusionSupport.trim(),
            feedbackMechanism: form.feedbackMechanism.trim(),
            actionPlan: form.actionPlan.trim(),
            supportingLinks: splitLines(form.supportingLinks),
            documentIds: splitCommaValues(form.documentIds),
            contributorRemarks: form.contributorRemarks.trim(),
            mentorGroups: form.mentorGroups
                .filter((row) => row.groupName.trim())
                .map((row, index) => ({
                    _id: row.id,
                    groupName: row.groupName.trim(),
                    programName: row.programName.trim(),
                    batchLabel: row.batchLabel.trim(),
                    mentorName: row.mentorName.trim(),
                    menteeCount: row.menteeCount.trim() === "" ? undefined : Number(row.menteeCount),
                    meetingCount:
                        row.meetingCount.trim() === "" ? undefined : Number(row.meetingCount),
                    supportThemes: row.supportThemes.trim(),
                    escalatedCount:
                        row.escalatedCount.trim() === ""
                            ? undefined
                            : Number(row.escalatedCount),
                    actionTaken: row.actionTaken.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            grievances: form.grievances
                .filter((row) => row.category.trim())
                .map((row, index) => ({
                    _id: row.id,
                    category: row.category,
                    referenceNumber: row.referenceNumber.trim(),
                    lodgedByType: row.lodgedByType,
                    receivedDate: row.receivedDate || undefined,
                    resolvedDate: row.resolvedDate || undefined,
                    status: row.status,
                    resolutionDays:
                        row.resolutionDays.trim() === ""
                            ? undefined
                            : Number(row.resolutionDays),
                    committeeName: row.committeeName.trim(),
                    resolutionSummary: row.resolutionSummary.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            progressionRows: form.progressionRows
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    progressionType: row.progressionType,
                    title: row.title.trim(),
                    batchLabel: row.batchLabel.trim(),
                    programName: row.programName.trim(),
                    destinationName: row.destinationName.trim(),
                    studentCount:
                        row.studentCount.trim() === "" ? undefined : Number(row.studentCount),
                    medianPackageLpa:
                        row.medianPackageLpa.trim() === ""
                            ? undefined
                            : Number(row.medianPackageLpa),
                    status: row.status,
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
            representationRows: form.representationRows
                .filter((row) => row.bodyName.trim())
                .map((row, index) => ({
                    _id: row.id,
                    representationType: row.representationType,
                    bodyName: row.bodyName.trim(),
                    roleTitle: row.roleTitle.trim(),
                    studentCount:
                        row.studentCount.trim() === "" ? undefined : Number(row.studentCount),
                    meetingCount:
                        row.meetingCount.trim() === "" ? undefined : Number(row.meetingCount),
                    outcomeSummary: row.outcomeSummary.trim(),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
        };
    }

    async function persistDraft(assignmentId: string) {
        return requestJson<{ message?: string }>(
            `/api/student-support-governance/assignments/${assignmentId}/contribution`,
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
                    text: data.message ?? "Student support & governance draft saved successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the student support & governance draft.",
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
                    `/api/student-support-governance/assignments/${selectedAssignment._id}/submit`,
                    { method: "POST" }
                );
                setMessage({
                    type: "success",
                    text:
                        data.message ??
                        "Student support & governance assignment submitted successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to submit the student support & governance assignment.",
                });
            }
        });
    }

    if (!assignments.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Student Support & Governance Workspace</CardTitle>
                    <CardDescription>
                        No student support & governance assignments are mapped to this account yet.
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
                    <CardTitle>{actorLabel} Student Support & Governance workspace</CardTitle>
                    <CardDescription>
                        Complete the governed portfolio with structured mentoring, grievance, progression, and representation records before sending it into review.
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
                                            <p>Mentor groups: {selectedAssignment.mentorGroups.length}</p>
                                            <p>Grievances: {selectedAssignment.grievances.length}</p>
                                            <p>Progression rows: {selectedAssignment.progressionRows.length}</p>
                                            <p>Representation rows: {selectedAssignment.representationRows.length}</p>
                                            <p>Updated: {formatDate(selectedAssignment.updatedAt)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                                        <MetricCard label="Mentor groups target" value={selectedAssignment.planTargets.mentorGroups} />
                                        <MetricCard label="Closure target" value={selectedAssignment.planTargets.grievanceClosures} />
                                        <MetricCard label="Scholarship target" value={selectedAssignment.planTargets.scholarshipBeneficiaries} />
                                        <MetricCard label="Placement target" value={selectedAssignment.planTargets.placements} />
                                        <MetricCard label="Higher studies target" value={selectedAssignment.planTargets.higherStudies} />
                                        <MetricCard label="Representation target" value={selectedAssignment.planTargets.representationBodies} />
                                    </div>

                                    <div className="mt-5 space-y-3 text-sm text-zinc-600">
                                        <p>{selectedAssignment.planSummary?.trim() || "No plan summary provided."}</p>
                                        <p>{selectedAssignment.planStrategyGoals?.trim() || "No strategy goals defined on the plan."}</p>
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
                                            Capture the qualitative student-support story behind the structured records.
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
                                    description="Track mentor groups, mentee batches, meetings, escalations, and actions taken."
                                    title="Mentor Groups"
                                >
                                    {form.mentorGroups.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "mentor-group"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <TextField disabled={!canEdit} label="Group name" onChange={(value) => updateFacility(index, "groupName", value)} value={row.groupName} />
                                                <TextField disabled={!canEdit} label="Program" onChange={(value) => updateFacility(index, "programName", value)} value={row.programName} />
                                                <TextField disabled={!canEdit} label="Batch label" onChange={(value) => updateFacility(index, "batchLabel", value)} value={row.batchLabel} />
                                                <TextField disabled={!canEdit} label="Mentor name" onChange={(value) => updateFacility(index, "mentorName", value)} value={row.mentorName} />
                                                <TextField disabled={!canEdit} label="Mentee count" onChange={(value) => updateFacility(index, "menteeCount", value)} type="number" value={row.menteeCount} />
                                                <TextField disabled={!canEdit} label="Meeting count" onChange={(value) => updateFacility(index, "meetingCount", value)} type="number" value={row.meetingCount} />
                                                <TextField disabled={!canEdit} label="Support themes" onChange={(value) => updateFacility(index, "supportThemes", value)} value={row.supportThemes} />
                                                <TextField disabled={!canEdit} label="Escalated cases" onChange={(value) => updateFacility(index, "escalatedCount", value)} type="number" value={row.escalatedCount} />
                                                <TextField disabled={!canEdit} label="Action taken" onChange={(value) => updateFacility(index, "actionTaken", value)} value={row.actionTaken} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateFacility(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateFacility(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, mentorGroups: [...current.mentorGroups, emptyMentorGroupRow()] }))} onRemove={() => setForm((current) => ({ ...current, mentorGroups: current.mentorGroups.length > 1 ? current.mentorGroups.filter((_, rowIndex) => rowIndex !== index) : [emptyMentorGroupRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Track grievance category, intake source, timelines, closure, and responsible committee."
                                    title="Grievances"
                                >
                                    {form.grievances.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "grievance"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Category" onValueChange={(value) => updateLibraryResource(index, "category", value)} options={["Academic","Administrative","Scholarship","Examination","Hostel","Infrastructure","AntiRagging","Harassment","Wellbeing","Other"]} value={row.category} />
                                                <TextField disabled={!canEdit} label="Reference number" onChange={(value) => updateLibraryResource(index, "referenceNumber", value)} value={row.referenceNumber} />
                                                <SelectField disabled={!canEdit} label="Lodged by" onValueChange={(value) => updateLibraryResource(index, "lodgedByType", value)} options={["Student","Parent","Group","Anonymous"]} value={row.lodgedByType} />
                                                <TextField disabled={!canEdit} label="Received date" onChange={(value) => updateLibraryResource(index, "receivedDate", value)} type="date" value={row.receivedDate} />
                                                <TextField disabled={!canEdit} label="Resolved date" onChange={(value) => updateLibraryResource(index, "resolvedDate", value)} type="date" value={row.resolvedDate} />
                                                <SelectField disabled={!canEdit} label="Status" onValueChange={(value) => updateLibraryResource(index, "status", value)} options={["Open","InProgress","Resolved","Escalated","Closed"]} value={row.status} />
                                                <TextField disabled={!canEdit} label="Resolution days" onChange={(value) => updateLibraryResource(index, "resolutionDays", value)} type="number" value={row.resolutionDays} />
                                                <TextField disabled={!canEdit} label="Committee / cell" onChange={(value) => updateLibraryResource(index, "committeeName", value)} value={row.committeeName} />
                                                <TextField disabled={!canEdit} label="Resolution summary" onChange={(value) => updateLibraryResource(index, "resolutionSummary", value)} value={row.resolutionSummary} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateLibraryResource(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateLibraryResource(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, grievances: [...current.grievances, emptyGrievanceRow()] }))} onRemove={() => setForm((current) => ({ ...current, grievances: current.grievances.length > 1 ? current.grievances.filter((_, rowIndex) => rowIndex !== index) : [emptyGrievanceRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Capture placement, higher-studies, internship, entrepreneurship, and exam progression outcomes."
                                    title="Progression Tracking"
                                >
                                    {form.progressionRows.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "progression"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Progression type" onValueChange={(value) => updateUsage(index, "progressionType", value)} options={["Placement","HigherStudies","Entrepreneurship","CompetitiveExam","Internship","Other"]} value={row.progressionType} />
                                                <TextField disabled={!canEdit} label="Title" onChange={(value) => updateUsage(index, "title", value)} value={row.title} />
                                                <TextField disabled={!canEdit} label="Batch label" onChange={(value) => updateUsage(index, "batchLabel", value)} value={row.batchLabel} />
                                                <TextField disabled={!canEdit} label="Program" onChange={(value) => updateUsage(index, "programName", value)} value={row.programName} />
                                                <TextField disabled={!canEdit} label="Destination / employer" onChange={(value) => updateUsage(index, "destinationName", value)} value={row.destinationName} />
                                                <TextField disabled={!canEdit} label="Student count" onChange={(value) => updateUsage(index, "studentCount", value)} type="number" value={row.studentCount} />
                                                <TextField disabled={!canEdit} label="Median package (LPA)" onChange={(value) => updateUsage(index, "medianPackageLpa", value)} type="number" value={row.medianPackageLpa} />
                                                <SelectField disabled={!canEdit} label="Status" onValueChange={(value) => updateUsage(index, "status", value)} options={["Placed","Admitted","Qualified","Progressing","Completed","Other"]} value={row.status} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateUsage(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateUsage(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, progressionRows: [...current.progressionRows, emptyProgressionRow()] }))} onRemove={() => setForm((current) => ({ ...current, progressionRows: current.progressionRows.length > 1 ? current.progressionRows.filter((_, rowIndex) => rowIndex !== index) : [emptyProgressionRow()] }))} />
                                        </div>
                                    ))}
                                </StructuredRowSection>

                                <StructuredRowSection
                                    description="Track student councils, committees, clubs, class representation, and participative-governance outcomes."
                                    title="Student Representation"
                                >
                                    {form.representationRows.map((row, index) => (
                                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={`${row.id ?? "representation"}-${index}`}>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <SelectField disabled={!canEdit} label="Representation type" onValueChange={(value) => updateMaintenance(index, "representationType", value)} options={["StudentCouncil","ClassRepresentative","Committee","Club","QualityCircle","FeedbackForum","AntiRaggingCell","Other"]} value={row.representationType} />
                                                <TextField disabled={!canEdit} label="Body name" onChange={(value) => updateMaintenance(index, "bodyName", value)} value={row.bodyName} />
                                                <TextField disabled={!canEdit} label="Role title" onChange={(value) => updateMaintenance(index, "roleTitle", value)} value={row.roleTitle} />
                                                <TextField disabled={!canEdit} label="Student count" onChange={(value) => updateMaintenance(index, "studentCount", value)} type="number" value={row.studentCount} />
                                                <TextField disabled={!canEdit} label="Meeting count" onChange={(value) => updateMaintenance(index, "meetingCount", value)} type="number" value={row.meetingCount} />
                                                <TextField disabled={!canEdit} label="Outcome summary" onChange={(value) => updateMaintenance(index, "outcomeSummary", value)} value={row.outcomeSummary} />
                                                <TextField disabled={!canEdit} label="Document ID" onChange={(value) => updateMaintenance(index, "documentId", value)} value={row.documentId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Remarks</Label>
                                                <Textarea disabled={!canEdit} onChange={(event) => updateMaintenance(index, "remarks", event.target.value)} rows={3} value={row.remarks} />
                                            </div>
                                            <RowActions canEdit={canEdit} onAdd={() => setForm((current) => ({ ...current, representationRows: [...current.representationRows, emptyRepresentationRow()] }))} onRemove={() => setForm((current) => ({ ...current, representationRows: current.representationRows.length > 1 ? current.representationRows.filter((_, rowIndex) => rowIndex !== index) : [emptyRepresentationRow()] }))} />
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
