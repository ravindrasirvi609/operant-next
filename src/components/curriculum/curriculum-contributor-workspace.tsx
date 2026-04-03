"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AssignmentRecord = {
    _id: string;
    curriculumId: string;
    curriculumTitle: string;
    regulationYear: string;
    planStatus: string;
    programName: string;
    curriculumCourseId: string;
    courseCode: string;
    courseTitle: string;
    courseType: string;
    semesterNumber: number;
    credits: number;
    lectureHours: number;
    tutorialHours: number;
    practicalHours: number;
    assigneeName: string;
    assigneeEmail: string;
    status: string;
    dueDate?: string;
    notes?: string;
    currentStageLabel: string;
    syllabusVersion: {
        _id: string;
        versionNumber: number;
        revisionReason?: string;
        syllabusSummary?: string;
        unitOutline?: string;
        pedagogy?: string;
        assessmentStrategy?: string;
        referenceBooks: string[];
        officialDocumentId?: string;
        approvedByBosMeetingId?: string;
        effectiveAcademicYearId?: string;
        status: string;
        valueSummary: string;
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
        programOutcomeId: string;
        programOutcomeCode: string;
        programOutcomeType: string;
        mappingStrength: number;
    }>;
    supportingLinks: string[];
    documentIds: string[];
    documents: Array<{
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
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
    bosMeetings: Array<{
        id: string;
        title: string;
        meetingDate?: string;
    }>;
};

type AcademicYearOption = {
    id: string;
    label: string;
    isActive: boolean;
};

type FormState = {
    revisionReason: string;
    syllabusSummary: string;
    unitOutline: string;
    pedagogy: string;
    assessmentStrategy: string;
    referenceBooks: string;
    officialDocumentId: string;
    approvedByBosMeetingId: string;
    effectiveAcademicYearId: string;
    outcomes: string;
    mappings: string;
    supportingLinks: string;
    documentIds: string;
    contributorRemarks: string;
};

const emptyForm: FormState = {
    revisionReason: "",
    syllabusSummary: "",
    unitOutline: "",
    pedagogy: "",
    assessmentStrategy: "",
    referenceBooks: "",
    officialDocumentId: "",
    approvedByBosMeetingId: "",
    effectiveAcademicYearId: "",
    outcomes: "",
    mappings: "",
    supportingLinks: "",
    documentIds: "",
    contributorRemarks: "",
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

function toPrettyDateTime(value?: string) {
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

function toOutcomeLines(record: AssignmentRecord) {
    return record.courseOutcomes
        .map(
            (outcome) =>
                `${outcome.coCode} | ${outcome.description} | ${outcome.bloomLevel ?? ""} | ${
                    outcome.targetAttainmentPercentage ?? ""
                }`
        )
        .join("\n");
}

function toMappingLines(record: AssignmentRecord) {
    return record.mappings
        .map(
            (mapping) =>
                `${mapping.courseOutcomeCode} | ${mapping.programOutcomeCode} | ${mapping.mappingStrength}`
        )
        .join("\n");
}

function buildInitialForm(record: AssignmentRecord): FormState {
    return {
        revisionReason: record.syllabusVersion.revisionReason ?? "",
        syllabusSummary: record.syllabusVersion.syllabusSummary ?? "",
        unitOutline: record.syllabusVersion.unitOutline ?? "",
        pedagogy: record.syllabusVersion.pedagogy ?? "",
        assessmentStrategy: record.syllabusVersion.assessmentStrategy ?? "",
        referenceBooks: (record.syllabusVersion.referenceBooks ?? []).join("\n"),
        officialDocumentId: record.syllabusVersion.officialDocumentId ?? "",
        approvedByBosMeetingId: record.syllabusVersion.approvedByBosMeetingId ?? "",
        effectiveAcademicYearId: record.syllabusVersion.effectiveAcademicYearId ?? "",
        outcomes: toOutcomeLines(record),
        mappings: toMappingLines(record),
        supportingLinks: (record.supportingLinks ?? []).join("\n"),
        documentIds: (record.documentIds ?? []).join(", "),
        contributorRemarks: record.contributorRemarks ?? "",
    };
}

function parseLineEntries(value: string) {
    return value
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function isObjectId(value: string) {
    return /^[a-fA-F0-9]{24}$/.test(value.trim());
}

export function CurriculumContributorWorkspace({
    assignments,
    academicYearOptions,
    actorLabel,
}: {
    assignments: AssignmentRecord[];
    academicYearOptions: AcademicYearOption[];
    actorLabel: string;
}) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState(assignments[0]?._id ?? "");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState<FormState>(assignments[0] ? buildInitialForm(assignments[0]) : emptyForm);

    const selectedAssignment = useMemo(
        () => assignments.find((item) => item._id === selectedId) ?? assignments[0] ?? null,
        [assignments, selectedId]
    );

    useEffect(() => {
        if (!selectedAssignment) {
            setForm(emptyForm);
            return;
        }

        setForm(buildInitialForm(selectedAssignment));
    }, [selectedAssignment]);

    if (!selectedAssignment) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Curriculum Workspace</CardTitle>
                    <CardDescription>
                        No curriculum authoring assignments are mapped to this account yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const isEditable =
        selectedAssignment.planStatus !== "Archived" &&
        ["Draft", "Rejected"].includes(selectedAssignment.status);

    function buildPayload() {
        const outcomes = parseLineEntries(form.outcomes).map((line) => {
            const [coCode, description, bloomLevel, targetAttainmentPercentage] = line
                .split("|")
                .map((value) => value.trim());

            if (!coCode || !description) {
                throw new Error("Each course outcome line must include `CO code | description`.");
            }

            return {
                coCode,
                description,
                bloomLevel: bloomLevel || undefined,
                targetAttainmentPercentage:
                    targetAttainmentPercentage !== "" ? Number(targetAttainmentPercentage) : undefined,
            };
        });

        const mappings = parseLineEntries(form.mappings).map((line) => {
            const [courseOutcomeCode, programOutcomeCodeOrId, mappingStrength] = line
                .split("|")
                .map((value) => value.trim());

            if (!courseOutcomeCode || !programOutcomeCodeOrId || !mappingStrength) {
                throw new Error(
                    "Each mapping line must include `CO code | PO/PSO code or id | strength`."
                );
            }

            return {
                courseOutcomeCode,
                programOutcomeId: isObjectId(programOutcomeCodeOrId)
                    ? programOutcomeCodeOrId
                    : undefined,
                programOutcomeCode: isObjectId(programOutcomeCodeOrId)
                    ? undefined
                    : programOutcomeCodeOrId,
                mappingStrength: Number(mappingStrength),
            };
        });

        return {
            revisionReason: form.revisionReason || undefined,
            syllabusSummary: form.syllabusSummary || undefined,
            unitOutline: form.unitOutline || undefined,
            pedagogy: form.pedagogy || undefined,
            assessmentStrategy: form.assessmentStrategy || undefined,
            referenceBooks: parseLineEntries(form.referenceBooks),
            officialDocumentId: form.officialDocumentId || undefined,
            approvedByBosMeetingId:
                form.approvedByBosMeetingId && form.approvedByBosMeetingId !== "none"
                    ? form.approvedByBosMeetingId
                    : undefined,
            effectiveAcademicYearId:
                form.effectiveAcademicYearId && form.effectiveAcademicYearId !== "none"
                    ? form.effectiveAcademicYearId
                    : undefined,
            outcomes,
            mappings,
            supportingLinks: parseLineEntries(form.supportingLinks),
            documentIds: form.documentIds
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            contributorRemarks: form.contributorRemarks || undefined,
        };
    }

    function saveDraft() {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson(`/api/curriculum/assignments/${selectedAssignment._id}/contribution`, {
                    method: "PUT",
                    body: JSON.stringify(buildPayload()),
                });

                setMessage({ type: "success", text: "Curriculum draft saved." });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save the draft.",
                });
            }
        });
    }

    function submitDraft() {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson(`/api/curriculum/assignments/${selectedAssignment._id}/contribution`, {
                    method: "PUT",
                    body: JSON.stringify(buildPayload()),
                });
                await requestJson(`/api/curriculum/assignments/${selectedAssignment._id}/submit`, {
                    method: "POST",
                });

                setMessage({ type: "success", text: "Curriculum contribution submitted." });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to submit the contribution.",
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

            <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>{actorLabel} Curriculum Assignments</CardTitle>
                        <CardDescription>
                            Only mapped course-owner syllabus work appears in this workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {assignments.map((item) => (
                            <button
                                key={item._id}
                                type="button"
                                onClick={() => setSelectedId(item._id)}
                                className={`w-full rounded-xl border p-4 text-left transition ${
                                    item._id === selectedAssignment._id
                                        ? "border-zinc-950 bg-zinc-950 text-white"
                                        : "border-zinc-200 bg-white hover:border-zinc-300"
                                }`}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={item._id === selectedAssignment._id ? "secondary" : "outline"}>
                                        {item.status}
                                    </Badge>
                                    <Badge variant={item._id === selectedAssignment._id ? "secondary" : "outline"}>
                                        v{item.syllabusVersion.versionNumber}
                                    </Badge>
                                </div>
                                <p className="mt-3 font-medium">
                                    {item.courseCode} · {item.courseTitle}
                                </p>
                                <p
                                    className={`mt-1 text-xs ${
                                        item._id === selectedAssignment._id ? "text-white/75" : "text-zinc-500"
                                    }`}
                                >
                                    {item.curriculumTitle} · Semester {item.semesterNumber}
                                </p>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge>{selectedAssignment.regulationYear}</Badge>
                                <Badge variant="outline">{selectedAssignment.status}</Badge>
                                <Badge variant="outline">{selectedAssignment.currentStageLabel}</Badge>
                            </div>
                            <CardTitle>
                                {selectedAssignment.courseCode} · {selectedAssignment.courseTitle}
                            </CardTitle>
                            <CardDescription>
                                {selectedAssignment.curriculumTitle} · {selectedAssignment.programName}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <InfoRow label="Course Type" value={selectedAssignment.courseType} />
                            <InfoRow label="Version" value={`v${selectedAssignment.syllabusVersion.versionNumber}`} />
                            <InfoRow label="Credits" value={String(selectedAssignment.credits)} />
                            <InfoRow label="Semester" value={`Semester ${selectedAssignment.semesterNumber}`} />
                            <InfoRow
                                label="Teaching Load"
                                value={`${selectedAssignment.lectureHours}L / ${selectedAssignment.tutorialHours}T / ${selectedAssignment.practicalHours}P`}
                            />
                            <InfoRow label="Due Date" value={selectedAssignment.dueDate ? toPrettyDateTime(selectedAssignment.dueDate) : "-"} />
                            <InfoRow label="Draft Health" value={selectedAssignment.syllabusVersion.valueSummary} />
                            <InfoRow label="Reviewer Feedback" value={selectedAssignment.reviewRemarks || "-"} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Syllabus Draft</CardTitle>
                            <CardDescription>
                                Capture the official syllabus narrative, course outcomes, and CO-PO/PSO mapping in a consistent format.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <Field
                                label="Revision Reason"
                                value={form.revisionReason}
                                onChange={(value) => setForm((current) => ({ ...current, revisionReason: value }))}
                                multiline
                                disabled={!isEditable || isPending}
                            />
                            <Field
                                label="Syllabus Summary"
                                value={form.syllabusSummary}
                                onChange={(value) => setForm((current) => ({ ...current, syllabusSummary: value }))}
                                multiline
                                disabled={!isEditable || isPending}
                                rows={5}
                            />
                            <Field
                                label="Unit Outline"
                                value={form.unitOutline}
                                onChange={(value) => setForm((current) => ({ ...current, unitOutline: value }))}
                                multiline
                                disabled={!isEditable || isPending}
                                rows={6}
                            />
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field
                                    label="Pedagogy / Teaching-Learning Strategy"
                                    value={form.pedagogy}
                                    onChange={(value) => setForm((current) => ({ ...current, pedagogy: value }))}
                                    multiline
                                    disabled={!isEditable || isPending}
                                    rows={4}
                                />
                                <Field
                                    label="Assessment Strategy"
                                    value={form.assessmentStrategy}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, assessmentStrategy: value }))
                                    }
                                    multiline
                                    disabled={!isEditable || isPending}
                                    rows={4}
                                />
                            </div>
                            <Field
                                label="Reference Books"
                                hint="One entry per line."
                                value={form.referenceBooks}
                                onChange={(value) => setForm((current) => ({ ...current, referenceBooks: value }))}
                                multiline
                                disabled={!isEditable || isPending}
                                rows={4}
                            />
                            <div className="grid gap-4 md:grid-cols-3">
                                <Field
                                    label="Official Syllabus Document ID"
                                    value={form.officialDocumentId}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, officialDocumentId: value }))
                                    }
                                    disabled={!isEditable || isPending}
                                />
                                <div className="space-y-2">
                                    <Label>Effective Academic Year</Label>
                                    <Select
                                        disabled={!isEditable || isPending}
                                        value={form.effectiveAcademicYearId || "none"}
                                        onValueChange={(value) =>
                                            setForm((current) => ({
                                                ...current,
                                                effectiveAcademicYearId: value === "none" ? "" : value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not linked</SelectItem>
                                            {academicYearOptions.map((option) => (
                                                <SelectItem key={option.id} value={option.id}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Approved BoS Meeting</Label>
                                    <Select
                                        disabled={!isEditable || isPending}
                                        value={form.approvedByBosMeetingId || "none"}
                                        onValueChange={(value) =>
                                            setForm((current) => ({
                                                ...current,
                                                approvedByBosMeetingId: value === "none" ? "" : value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select BoS meeting" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not linked</SelectItem>
                                            {selectedAssignment.bosMeetings.map((meeting) => (
                                                <SelectItem key={meeting.id} value={meeting.id}>
                                                    {meeting.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Field
                                label="Course Outcomes"
                                hint="One per line: `CO1 | Outcome description | Bloom Level | Target %`"
                                value={form.outcomes}
                                onChange={(value) => setForm((current) => ({ ...current, outcomes: value }))}
                                multiline
                                disabled={!isEditable || isPending}
                                rows={6}
                            />
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-sm font-medium text-zinc-950">Available Program Outcomes</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedAssignment.programOutcomes.map((outcome) => (
                                        <Badge key={outcome.id} variant="outline">
                                            {outcome.outcomeType} · {outcome.outcomeCode}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <Field
                                label="CO-PO / CO-PSO Mapping"
                                hint="One per line: `CO1 | PO1 | 3` or use the program outcome id in place of the code."
                                value={form.mappings}
                                onChange={(value) => setForm((current) => ({ ...current, mappings: value }))}
                                multiline
                                disabled={!isEditable || isPending}
                                rows={5}
                            />
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field
                                    label="Supporting Links"
                                    hint="One URL per line."
                                    value={form.supportingLinks}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, supportingLinks: value }))
                                    }
                                    multiline
                                    disabled={!isEditable || isPending}
                                    rows={4}
                                />
                                <Field
                                    label="Supporting Document IDs"
                                    hint="Comma-separated document ids from the evidence repository."
                                    value={form.documentIds}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, documentIds: value }))
                                    }
                                    multiline
                                    disabled={!isEditable || isPending}
                                    rows={4}
                                />
                            </div>
                            <Field
                                label="Contributor Remarks"
                                value={form.contributorRemarks}
                                onChange={(value) =>
                                    setForm((current) => ({ ...current, contributorRemarks: value }))
                                }
                                multiline
                                disabled={!isEditable || isPending}
                                rows={3}
                            />
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={saveDraft} disabled={!isEditable || isPending}>
                                    Save Draft
                                </Button>
                                <Button
                                    onClick={submitDraft}
                                    disabled={!isEditable || isPending || selectedAssignment.planStatus !== "Active"}
                                    variant="secondary"
                                >
                                    Submit for Review
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Evidence and Review Trail</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <p className="text-sm font-medium text-zinc-950">Linked Documents</p>
                                <div className="mt-3 space-y-2">
                                    {selectedAssignment.documents.length ? (
                                        selectedAssignment.documents.map((document) => (
                                            <div
                                                key={document.id}
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"
                                            >
                                                <p className="font-medium text-zinc-950">
                                                    {document.fileName || document.id}
                                                </p>
                                                <p className="mt-1 text-zinc-500">
                                                    Verification: {document.verificationStatus || "Pending"}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">No supporting documents linked yet.</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-zinc-950">Review History</p>
                                <div className="mt-3 space-y-2">
                                    {selectedAssignment.reviewHistory.length ? (
                                        selectedAssignment.reviewHistory.map((entry, index) => (
                                            <div
                                                key={`${entry.stage}-${index}`}
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"
                                            >
                                                <p className="font-medium text-zinc-950">
                                                    {entry.stage} · {entry.decision}
                                                </p>
                                                <p className="mt-1 text-zinc-500">
                                                    {entry.reviewerName || "Reviewer"} · {toPrettyDateTime(entry.reviewedAt)}
                                                </p>
                                                {entry.remarks ? (
                                                    <p className="mt-2 text-zinc-600">{entry.remarks}</p>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">No review actions have been recorded yet.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    multiline = false,
    disabled,
    rows = 3,
    hint,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    disabled?: boolean;
    rows?: number;
    hint?: string;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {multiline ? (
                <Textarea
                    rows={rows}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                />
            ) : (
                <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
            )}
            {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
        </div>
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
