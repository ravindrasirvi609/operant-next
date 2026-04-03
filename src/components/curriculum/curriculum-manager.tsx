"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Option = {
    id: string;
    label: string;
    [key: string]: unknown;
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

function normalizeDateInput(value?: string) {
    return value ? String(value).slice(0, 10) : "";
}

function noValue(value?: string) {
    return value?.trim() ? value : "none";
}

export function CurriculumManager({
    calendars,
    calendarEvents,
    plans,
    curriculumCourses,
    syllabusVersions,
    programOutcomes,
    bosMeetings,
    bosDecisions,
    valueAddedCourses,
    assignments,
    institutionOptions,
    academicYearOptions,
    programOptions,
    courseMasterOptions,
    userOptions,
    departmentOptions,
}: {
    calendars: Record<string, any>[];
    calendarEvents: Record<string, any>[];
    plans: Record<string, any>[];
    curriculumCourses: Record<string, any>[];
    syllabusVersions: Record<string, any>[];
    programOutcomes: Record<string, any>[];
    bosMeetings: Record<string, any>[];
    bosDecisions: Record<string, any>[];
    valueAddedCourses: Record<string, any>[];
    assignments: Record<string, any>[];
    institutionOptions: Option[];
    academicYearOptions: Option[];
    programOptions: Option[];
    courseMasterOptions: Option[];
    userOptions: Option[];
    departmentOptions: Option[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
    const [calendarForm, setCalendarForm] = useState({
        institutionId: institutionOptions[0]?.id ?? "",
        academicYearId: academicYearOptions[0]?.id ?? "",
        title: "",
        startDate: "",
        endDate: "",
        status: "Draft",
    });

    const [editingCalendarEventId, setEditingCalendarEventId] = useState<string | null>(null);
    const [calendarEventForm, setCalendarEventForm] = useState({
        calendarId: calendars[0]?._id ?? "",
        eventTitle: "",
        eventType: "Other",
        startDate: "",
        endDate: "",
        description: "",
    });

    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planForm, setPlanForm] = useState({
        programId: programOptions[0]?.id ?? "",
        effectiveFromAcademicYearId: "",
        title: "",
        regulationYear: "",
        totalCredits: "0",
        status: "Draft",
        summary: "",
    });

    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [courseForm, setCourseForm] = useState({
        curriculumId: plans[0]?._id ?? "",
        courseId: "",
        courseCode: "",
        courseTitle: "",
        courseType: "Core",
        credits: "0",
        lectureHours: "0",
        tutorialHours: "0",
        practicalHours: "0",
        semesterNumber: "1",
        displayOrder: "1",
        facultyOwnerUserId: "",
        isActive: true,
    });

    const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
    const [versionForm, setVersionForm] = useState({
        curriculumId: plans[0]?._id ?? "",
        curriculumCourseId: curriculumCourses[0]?._id ?? "",
        versionNumber: "1",
        revisionReason: "",
        syllabusSummary: "",
        unitOutline: "",
        pedagogy: "",
        assessmentStrategy: "",
        referenceBooks: "",
        officialDocumentId: "",
        approvedByBosMeetingId: "",
        effectiveAcademicYearId: "",
    });

    const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
    const [outcomeForm, setOutcomeForm] = useState({
        curriculumId: plans[0]?._id ?? "",
        outcomeType: "PO",
        outcomeCode: "",
        description: "",
        isActive: true,
    });

    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
    const [meetingForm, setMeetingForm] = useState({
        departmentId: departmentOptions[0]?.id ?? "",
        academicYearId: "",
        title: "",
        meetingDate: "",
        agenda: "",
        minutesDocumentId: "",
    });

    const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
    const [decisionForm, setDecisionForm] = useState({
        meetingId: bosMeetings[0]?._id ?? "",
        curriculumId: "",
        curriculumCourseId: "",
        decisionTitle: "",
        decisionType: "Other",
        description: "",
        status: "Proposed",
        implementedAcademicYearId: "",
    });

    const [editingValueAddedId, setEditingValueAddedId] = useState<string | null>(null);
    const [valueAddedForm, setValueAddedForm] = useState({
        departmentId: departmentOptions[0]?.id ?? "",
        academicYearId: "",
        title: "",
        courseCode: "",
        credits: "0",
        contactHours: "0",
        coordinatorUserId: "",
        startDate: "",
        endDate: "",
        status: "Draft",
        description: "",
        documentId: "",
    });

    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
    const [assignmentForm, setAssignmentForm] = useState({
        curriculumId: plans[0]?._id ?? "",
        curriculumCourseId: curriculumCourses[0]?._id ?? "",
        syllabusVersionId: syllabusVersions[0]?._id ?? "",
        assigneeUserId: userOptions[0]?.id ?? "",
        dueDate: "",
        notes: "",
        isActive: true,
    });

    const planById = useMemo(
        () => new Map(plans.map((item) => [item._id, item])),
        [plans]
    );
    const coursesByCurriculum = useMemo(
        () =>
            curriculumCourses.reduce<Record<string, Record<string, any>[]>>((accumulator, item) => {
                const bucket = accumulator[item.curriculumId] ?? [];
                bucket.push(item);
                accumulator[item.curriculumId] = bucket;
                return accumulator;
            }, {}),
        [curriculumCourses]
    );
    const versionsByCourse = useMemo(
        () =>
            syllabusVersions.reduce<Record<string, Record<string, any>[]>>((accumulator, item) => {
                const bucket = accumulator[item.curriculumCourseId] ?? [];
                bucket.push(item);
                accumulator[item.curriculumCourseId] = bucket;
                return accumulator;
            }, {}),
        [syllabusVersions]
    );

    const currentPlanForOutcome = planById.get(outcomeForm.curriculumId);

    async function submitForm(
        url: string,
        method: "POST" | "PATCH",
        payload: Record<string, unknown>,
        successText: string,
        onSuccess: () => void
    ) {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson(url, {
                    method,
                    body: JSON.stringify(payload),
                });
                setMessage({ type: "success", text: successText });
                onSuccess();
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save this record.",
                });
            }
        });
    }

    function resetCalendarForm() {
        setEditingCalendarId(null);
        setCalendarForm({
            institutionId: institutionOptions[0]?.id ?? "",
            academicYearId: academicYearOptions[0]?.id ?? "",
            title: "",
            startDate: "",
            endDate: "",
            status: "Draft",
        });
    }

    function resetCalendarEventForm() {
        setEditingCalendarEventId(null);
        setCalendarEventForm({
            calendarId: calendars[0]?._id ?? "",
            eventTitle: "",
            eventType: "Other",
            startDate: "",
            endDate: "",
            description: "",
        });
    }

    function resetPlanForm() {
        setEditingPlanId(null);
        setPlanForm({
            programId: programOptions[0]?.id ?? "",
            effectiveFromAcademicYearId: "",
            title: "",
            regulationYear: "",
            totalCredits: "0",
            status: "Draft",
            summary: "",
        });
    }

    function resetCourseForm() {
        setEditingCourseId(null);
        setCourseForm({
            curriculumId: plans[0]?._id ?? "",
            courseId: "",
            courseCode: "",
            courseTitle: "",
            courseType: "Core",
            credits: "0",
            lectureHours: "0",
            tutorialHours: "0",
            practicalHours: "0",
            semesterNumber: "1",
            displayOrder: "1",
            facultyOwnerUserId: "",
            isActive: true,
        });
    }

    function resetVersionForm() {
        setEditingVersionId(null);
        setVersionForm({
            curriculumId: plans[0]?._id ?? "",
            curriculumCourseId: curriculumCourses[0]?._id ?? "",
            versionNumber: "1",
            revisionReason: "",
            syllabusSummary: "",
            unitOutline: "",
            pedagogy: "",
            assessmentStrategy: "",
            referenceBooks: "",
            officialDocumentId: "",
            approvedByBosMeetingId: "",
            effectiveAcademicYearId: "",
        });
    }

    function resetOutcomeForm() {
        setEditingOutcomeId(null);
        setOutcomeForm({
            curriculumId: plans[0]?._id ?? "",
            outcomeType: "PO",
            outcomeCode: "",
            description: "",
            isActive: true,
        });
    }

    function resetMeetingForm() {
        setEditingMeetingId(null);
        setMeetingForm({
            departmentId: departmentOptions[0]?.id ?? "",
            academicYearId: "",
            title: "",
            meetingDate: "",
            agenda: "",
            minutesDocumentId: "",
        });
    }

    function resetDecisionForm() {
        setEditingDecisionId(null);
        setDecisionForm({
            meetingId: bosMeetings[0]?._id ?? "",
            curriculumId: "",
            curriculumCourseId: "",
            decisionTitle: "",
            decisionType: "Other",
            description: "",
            status: "Proposed",
            implementedAcademicYearId: "",
        });
    }

    function resetValueAddedForm() {
        setEditingValueAddedId(null);
        setValueAddedForm({
            departmentId: departmentOptions[0]?.id ?? "",
            academicYearId: "",
            title: "",
            courseCode: "",
            credits: "0",
            contactHours: "0",
            coordinatorUserId: "",
            startDate: "",
            endDate: "",
            status: "Draft",
            description: "",
            documentId: "",
        });
    }

    function resetAssignmentForm() {
        setEditingAssignmentId(null);
        setAssignmentForm({
            curriculumId: plans[0]?._id ?? "",
            curriculumCourseId: curriculumCourses[0]?._id ?? "",
            syllabusVersionId: syllabusVersions[0]?._id ?? "",
            assigneeUserId: userOptions[0]?.id ?? "",
            dueDate: "",
            notes: "",
            isActive: true,
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

            <Tabs defaultValue="planning" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="planning">Planning</TabsTrigger>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    <TabsTrigger value="governance">Governance</TabsTrigger>
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="planning" className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Academic Calendars</CardTitle>
                                <CardDescription>Manage yearly calendar publication by institution and academic year.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectField
                                        label="Institution"
                                        value={calendarForm.institutionId}
                                        options={institutionOptions}
                                        onValueChange={(value) => setCalendarForm((current) => ({ ...current, institutionId: value }))}
                                    />
                                    <SelectField
                                        label="Academic Year"
                                        value={calendarForm.academicYearId}
                                        options={academicYearOptions}
                                        onValueChange={(value) => setCalendarForm((current) => ({ ...current, academicYearId: value }))}
                                    />
                                </div>
                                <TextField label="Title" value={calendarForm.title} onChange={(value) => setCalendarForm((current) => ({ ...current, title: value }))} />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <DateField label="Start Date" value={calendarForm.startDate} onChange={(value) => setCalendarForm((current) => ({ ...current, startDate: value }))} />
                                    <DateField label="End Date" value={calendarForm.endDate} onChange={(value) => setCalendarForm((current) => ({ ...current, endDate: value }))} />
                                    <SelectField
                                        label="Status"
                                        value={calendarForm.status}
                                        options={[
                                            { id: "Draft", label: "Draft" },
                                            { id: "Published", label: "Published" },
                                            { id: "Archived", label: "Archived" },
                                        ]}
                                        onValueChange={(value) => setCalendarForm((current) => ({ ...current, status: value }))}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        disabled={isPending}
                                        onClick={() =>
                                            submitForm(
                                                editingCalendarId
                                                    ? `/api/admin/curriculum/calendars/${editingCalendarId}`
                                                    : "/api/admin/curriculum/calendars",
                                                editingCalendarId ? "PATCH" : "POST",
                                                calendarForm,
                                                editingCalendarId
                                                    ? "Academic calendar updated."
                                                    : "Academic calendar created.",
                                                resetCalendarForm
                                            )
                                        }
                                    >
                                        {editingCalendarId ? "Update Calendar" : "Create Calendar"}
                                    </Button>
                                    {editingCalendarId ? (
                                        <Button variant="secondary" onClick={resetCalendarForm}>
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>

                                <div className="space-y-3 border-t pt-4">
                                    {calendars.map((calendar) => (
                                        <ListRow
                                            key={calendar._id}
                                            title={calendar.title}
                                            subtitle={`${calendar.institutionName} · ${calendar.academicYearLabel}`}
                                            meta={`${calendar.status} · ${normalizeDateInput(calendar.startDate)} to ${normalizeDateInput(calendar.endDate)}`}
                                            onEdit={() => {
                                                setEditingCalendarId(calendar._id);
                                                setCalendarForm({
                                                    institutionId: calendar.institutionId,
                                                    academicYearId: calendar.academicYearId,
                                                    title: calendar.title,
                                                    startDate: normalizeDateInput(calendar.startDate),
                                                    endDate: normalizeDateInput(calendar.endDate),
                                                    status: calendar.status,
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Academic Calendar Events</CardTitle>
                                <CardDescription>Add exam, holiday, semester start, and activity milestones under each calendar.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <SelectField
                                    label="Calendar"
                                    value={calendarEventForm.calendarId}
                                    options={calendars.map((item) => ({
                                        id: item._id,
                                        label: `${item.title} · ${item.academicYearLabel}`,
                                    }))}
                                    onValueChange={(value) => setCalendarEventForm((current) => ({ ...current, calendarId: value }))}
                                />
                                <TextField label="Event Title" value={calendarEventForm.eventTitle} onChange={(value) => setCalendarEventForm((current) => ({ ...current, eventTitle: value }))} />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <SelectField
                                        label="Event Type"
                                        value={calendarEventForm.eventType}
                                        options={[
                                            { id: "Exam", label: "Exam" },
                                            { id: "Holiday", label: "Holiday" },
                                            { id: "Semester Start", label: "Semester Start" },
                                            { id: "Activity", label: "Activity" },
                                            { id: "Other", label: "Other" },
                                        ]}
                                        onValueChange={(value) => setCalendarEventForm((current) => ({ ...current, eventType: value }))}
                                    />
                                    <DateField label="Start Date" value={calendarEventForm.startDate} onChange={(value) => setCalendarEventForm((current) => ({ ...current, startDate: value }))} />
                                    <DateField label="End Date" value={calendarEventForm.endDate} onChange={(value) => setCalendarEventForm((current) => ({ ...current, endDate: value }))} />
                                </div>
                                <TextAreaField label="Description" value={calendarEventForm.description} onChange={(value) => setCalendarEventForm((current) => ({ ...current, description: value }))} rows={3} />
                                <div className="flex gap-3">
                                    <Button
                                        disabled={isPending}
                                        onClick={() =>
                                            submitForm(
                                                editingCalendarEventId
                                                    ? `/api/admin/curriculum/calendar-events/${editingCalendarEventId}`
                                                    : "/api/admin/curriculum/calendar-events",
                                                editingCalendarEventId ? "PATCH" : "POST",
                                                {
                                                    ...calendarEventForm,
                                                    endDate: calendarEventForm.endDate || undefined,
                                                },
                                                editingCalendarEventId
                                                    ? "Calendar event updated."
                                                    : "Calendar event created.",
                                                resetCalendarEventForm
                                            )
                                        }
                                    >
                                        {editingCalendarEventId ? "Update Event" : "Create Event"}
                                    </Button>
                                    {editingCalendarEventId ? (
                                        <Button variant="secondary" onClick={resetCalendarEventForm}>
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>
                                <div className="space-y-3 border-t pt-4">
                                    {calendarEvents.map((event) => (
                                        <ListRow
                                            key={event._id}
                                            title={event.eventTitle}
                                            subtitle={`${event.eventType} · ${normalizeDateInput(event.startDate)}`}
                                            meta={event.description || "No description"}
                                            onEdit={() => {
                                                setEditingCalendarEventId(event._id);
                                                setCalendarEventForm({
                                                    calendarId: event.calendarId,
                                                    eventTitle: event.eventTitle,
                                                    eventType: event.eventType,
                                                    startDate: normalizeDateInput(event.startDate),
                                                    endDate: normalizeDateInput(event.endDate),
                                                    description: event.description || "",
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Curriculum Plans</CardTitle>
                            <CardDescription>Create versioned curriculum plans per program and regulation year.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <SelectField
                                    label="Program"
                                    value={planForm.programId}
                                    options={programOptions}
                                    onValueChange={(value) => setPlanForm((current) => ({ ...current, programId: value }))}
                                />
                                <SelectField
                                    label="Effective Academic Year"
                                    value={noValue(planForm.effectiveFromAcademicYearId)}
                                    options={[{ id: "none", label: "Not linked" }, ...academicYearOptions]}
                                    onValueChange={(value) => setPlanForm((current) => ({ ...current, effectiveFromAcademicYearId: value === "none" ? "" : value }))}
                                />
                                <TextField label="Regulation Year" value={planForm.regulationYear} onChange={(value) => setPlanForm((current) => ({ ...current, regulationYear: value }))} />
                                <TextField label="Total Credits" value={planForm.totalCredits} onChange={(value) => setPlanForm((current) => ({ ...current, totalCredits: value }))} />
                            </div>
                            <TextField label="Curriculum Title" value={planForm.title} onChange={(value) => setPlanForm((current) => ({ ...current, title: value }))} />
                            <div className="grid gap-4 md:grid-cols-2">
                                <SelectField
                                    label="Status"
                                    value={planForm.status}
                                    options={[
                                        { id: "Draft", label: "Draft" },
                                        { id: "Active", label: "Active" },
                                        { id: "Archived", label: "Archived" },
                                    ]}
                                    onValueChange={(value) => setPlanForm((current) => ({ ...current, status: value }))}
                                />
                                <TextAreaField label="Summary" value={planForm.summary} onChange={(value) => setPlanForm((current) => ({ ...current, summary: value }))} rows={3} />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    disabled={isPending}
                                    onClick={() =>
                                        submitForm(
                                            editingPlanId ? `/api/admin/curriculum/plans/${editingPlanId}` : "/api/admin/curriculum/plans",
                                            editingPlanId ? "PATCH" : "POST",
                                            {
                                                ...planForm,
                                                totalCredits: Number(planForm.totalCredits),
                                                effectiveFromAcademicYearId: planForm.effectiveFromAcademicYearId || undefined,
                                            },
                                            editingPlanId ? "Curriculum plan updated." : "Curriculum plan created.",
                                            resetPlanForm
                                        )
                                    }
                                >
                                    {editingPlanId ? "Update Plan" : "Create Plan"}
                                </Button>
                                {editingPlanId ? <Button variant="secondary" onClick={resetPlanForm}>Cancel</Button> : null}
                            </div>
                            <div className="space-y-3 border-t pt-4">
                                {plans.map((plan) => (
                                    <ListRow
                                        key={plan._id}
                                        title={`${plan.title} · ${plan.regulationYear}`}
                                        subtitle={`${plan.programName} · ${plan.totalCredits} credits`}
                                        meta={`${plan.status} · ${plan.effectiveFromAcademicYearLabel || "No effective year"}`}
                                        onEdit={() => {
                                            setEditingPlanId(plan._id);
                                            setPlanForm({
                                                programId: plan.programId,
                                                effectiveFromAcademicYearId: plan.effectiveFromAcademicYearId || "",
                                                title: plan.title,
                                                regulationYear: plan.regulationYear,
                                                totalCredits: String(plan.totalCredits),
                                                status: plan.status,
                                                summary: plan.summary || "",
                                            });
                                        }}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="structure" className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Curriculum Courses</CardTitle>
                                <CardDescription>Map course structure, teaching hours, and faculty ownership inside a curriculum version.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectField
                                        label="Curriculum Plan"
                                        value={courseForm.curriculumId}
                                        options={plans.map((item) => ({ id: item._id, label: `${item.title} · ${item.regulationYear}` }))}
                                        onValueChange={(value) => setCourseForm((current) => ({ ...current, curriculumId: value }))}
                                    />
                                    <SelectField
                                        label="Master Course"
                                        value={noValue(courseForm.courseId)}
                                        options={[{ id: "none", label: "Snapshot only" }, ...courseMasterOptions]}
                                        onValueChange={(value) =>
                                            setCourseForm((current) => ({ ...current, courseId: value === "none" ? "" : value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <TextField label="Course Code" value={courseForm.courseCode} onChange={(value) => setCourseForm((current) => ({ ...current, courseCode: value }))} />
                                    <TextField label="Course Title" value={courseForm.courseTitle} onChange={(value) => setCourseForm((current) => ({ ...current, courseTitle: value }))} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <SelectField
                                        label="Course Type"
                                        value={courseForm.courseType}
                                        options={[
                                            { id: "Core", label: "Core" },
                                            { id: "Elective", label: "Elective" },
                                            { id: "Value Added", label: "Value Added" },
                                            { id: "Open Elective", label: "Open Elective" },
                                            { id: "Ability Enhancement", label: "Ability Enhancement" },
                                            { id: "Skill Enhancement", label: "Skill Enhancement" },
                                            { id: "Lab", label: "Lab" },
                                            { id: "Project", label: "Project" },
                                            { id: "Other", label: "Other" },
                                        ]}
                                        onValueChange={(value) => setCourseForm((current) => ({ ...current, courseType: value }))}
                                    />
                                    <TextField label="Credits" value={courseForm.credits} onChange={(value) => setCourseForm((current) => ({ ...current, credits: value }))} />
                                    <TextField label="Semester Number" value={courseForm.semesterNumber} onChange={(value) => setCourseForm((current) => ({ ...current, semesterNumber: value }))} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <TextField label="Lecture Hours" value={courseForm.lectureHours} onChange={(value) => setCourseForm((current) => ({ ...current, lectureHours: value }))} />
                                    <TextField label="Tutorial Hours" value={courseForm.tutorialHours} onChange={(value) => setCourseForm((current) => ({ ...current, tutorialHours: value }))} />
                                    <TextField label="Practical Hours" value={courseForm.practicalHours} onChange={(value) => setCourseForm((current) => ({ ...current, practicalHours: value }))} />
                                    <TextField label="Display Order" value={courseForm.displayOrder} onChange={(value) => setCourseForm((current) => ({ ...current, displayOrder: value }))} />
                                </div>
                                <SelectField
                                    label="Faculty Owner"
                                    value={noValue(courseForm.facultyOwnerUserId)}
                                    options={[{ id: "none", label: "Unassigned" }, ...userOptions.map((item) => ({ id: item.id, label: `${item.name} · ${item.email}` }))]}
                                    onValueChange={(value) =>
                                        setCourseForm((current) => ({ ...current, facultyOwnerUserId: value === "none" ? "" : value }))
                                    }
                                />
                                <div className="flex gap-3">
                                    <Button
                                        disabled={isPending}
                                        onClick={() =>
                                            submitForm(
                                                editingCourseId ? `/api/admin/curriculum/courses/${editingCourseId}` : "/api/admin/curriculum/courses",
                                                editingCourseId ? "PATCH" : "POST",
                                                {
                                                    ...courseForm,
                                                    courseId: courseForm.courseId || undefined,
                                                    credits: Number(courseForm.credits),
                                                    lectureHours: Number(courseForm.lectureHours),
                                                    tutorialHours: Number(courseForm.tutorialHours),
                                                    practicalHours: Number(courseForm.practicalHours),
                                                    semesterNumber: Number(courseForm.semesterNumber),
                                                    displayOrder: Number(courseForm.displayOrder),
                                                    facultyOwnerUserId: courseForm.facultyOwnerUserId || undefined,
                                                },
                                                editingCourseId ? "Curriculum course updated." : "Curriculum course created.",
                                                resetCourseForm
                                            )
                                        }
                                    >
                                        {editingCourseId ? "Update Course" : "Create Course"}
                                    </Button>
                                    {editingCourseId ? <Button variant="secondary" onClick={resetCourseForm}>Cancel</Button> : null}
                                </div>
                                <div className="space-y-3 border-t pt-4">
                                    {curriculumCourses.map((item) => (
                                        <ListRow
                                            key={item._id}
                                            title={`${item.courseCode} · ${item.courseTitle}`}
                                            subtitle={`${planById.get(item.curriculumId)?.title || "Curriculum"} · Semester ${item.semesterNumber}`}
                                            meta={`${item.courseType} · ${item.credits} credits`}
                                            onEdit={() => {
                                                setEditingCourseId(item._id);
                                                setCourseForm({
                                                    curriculumId: item.curriculumId,
                                                    courseId: item.courseId || "",
                                                    courseCode: item.courseCode,
                                                    courseTitle: item.courseTitle,
                                                    courseType: item.courseType,
                                                    credits: String(item.credits),
                                                    lectureHours: String(item.lectureHours),
                                                    tutorialHours: String(item.tutorialHours),
                                                    practicalHours: String(item.practicalHours),
                                                    semesterNumber: String(item.semesterNumber),
                                                    displayOrder: String(item.displayOrder),
                                                    facultyOwnerUserId: item.facultyOwnerUserId || "",
                                                    isActive: Boolean(item.isActive),
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Syllabus Versions and Program Outcomes</CardTitle>
                                <CardDescription>Create versioned syllabus records and curriculum-specific PO / PSO / PEO definitions.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
                                    <p className="text-sm font-medium text-zinc-950">Syllabus Version</p>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <SelectField
                                            label="Curriculum Plan"
                                            value={versionForm.curriculumId}
                                            options={plans.map((item) => ({ id: item._id, label: `${item.title} · ${item.regulationYear}` }))}
                                            onValueChange={(value) =>
                                                setVersionForm((current) => ({
                                                    ...current,
                                                    curriculumId: value,
                                                    curriculumCourseId: coursesByCurriculum[value]?.[0]?._id ?? "",
                                                }))
                                            }
                                        />
                                        <SelectField
                                            label="Curriculum Course"
                                            value={versionForm.curriculumCourseId}
                                            options={(coursesByCurriculum[versionForm.curriculumId] ?? []).map((item) => ({
                                                id: item._id,
                                                label: `${item.courseCode} · ${item.courseTitle}`,
                                            }))}
                                            onValueChange={(value) => setVersionForm((current) => ({ ...current, curriculumCourseId: value }))}
                                        />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <TextField label="Version Number" value={versionForm.versionNumber} onChange={(value) => setVersionForm((current) => ({ ...current, versionNumber: value }))} />
                                        <SelectField
                                            label="Effective Academic Year"
                                            value={noValue(versionForm.effectiveAcademicYearId)}
                                            options={[{ id: "none", label: "Not linked" }, ...academicYearOptions]}
                                            onValueChange={(value) => setVersionForm((current) => ({ ...current, effectiveAcademicYearId: value === "none" ? "" : value }))}
                                        />
                                    </div>
                                    <TextAreaField label="Revision Reason" value={versionForm.revisionReason} onChange={(value) => setVersionForm((current) => ({ ...current, revisionReason: value }))} rows={2} />
                                    <TextAreaField label="Syllabus Summary" value={versionForm.syllabusSummary} onChange={(value) => setVersionForm((current) => ({ ...current, syllabusSummary: value }))} rows={3} />
                                    <TextAreaField label="Unit Outline" value={versionForm.unitOutline} onChange={(value) => setVersionForm((current) => ({ ...current, unitOutline: value }))} rows={3} />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <TextAreaField label="Pedagogy" value={versionForm.pedagogy} onChange={(value) => setVersionForm((current) => ({ ...current, pedagogy: value }))} rows={3} />
                                        <TextAreaField label="Assessment Strategy" value={versionForm.assessmentStrategy} onChange={(value) => setVersionForm((current) => ({ ...current, assessmentStrategy: value }))} rows={3} />
                                    </div>
                                    <TextAreaField label="Reference Books" description="One entry per line." value={versionForm.referenceBooks} onChange={(value) => setVersionForm((current) => ({ ...current, referenceBooks: value }))} rows={3} />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <TextField label="Official Document ID" value={versionForm.officialDocumentId} onChange={(value) => setVersionForm((current) => ({ ...current, officialDocumentId: value }))} />
                                        <SelectField
                                            label="Approved BoS Meeting"
                                            value={noValue(versionForm.approvedByBosMeetingId)}
                                            options={[{ id: "none", label: "Not linked" }, ...bosMeetings.map((item) => ({ id: item._id, label: item.title }))]}
                                            onValueChange={(value) => setVersionForm((current) => ({ ...current, approvedByBosMeetingId: value === "none" ? "" : value }))}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            disabled={isPending}
                                            onClick={() =>
                                                submitForm(
                                                    editingVersionId ? `/api/admin/curriculum/syllabus-versions/${editingVersionId}` : "/api/admin/curriculum/syllabus-versions",
                                                    editingVersionId ? "PATCH" : "POST",
                                                    {
                                                        ...versionForm,
                                                        versionNumber: Number(versionForm.versionNumber),
                                                        referenceBooks: versionForm.referenceBooks
                                                            .split(/\n+/)
                                                            .map((value) => value.trim())
                                                            .filter(Boolean),
                                                        officialDocumentId: versionForm.officialDocumentId || undefined,
                                                        approvedByBosMeetingId: versionForm.approvedByBosMeetingId || undefined,
                                                        effectiveAcademicYearId: versionForm.effectiveAcademicYearId || undefined,
                                                    },
                                                    editingVersionId ? "Syllabus version updated." : "Syllabus version created.",
                                                    resetVersionForm
                                                )
                                            }
                                        >
                                            {editingVersionId ? "Update Version" : "Create Version"}
                                        </Button>
                                        {editingVersionId ? <Button variant="secondary" onClick={resetVersionForm}>Cancel</Button> : null}
                                    </div>
                                    <div className="space-y-3 border-t pt-4">
                                        {syllabusVersions.map((item) => (
                                            <ListRow
                                                key={item._id}
                                                title={`v${item.versionNumber} · ${curriculumCourses.find((course) => course._id === item.curriculumCourseId)?.courseCode || "Course"}`}
                                                subtitle={item.revisionReason || "No revision reason"}
                                                meta={item.status}
                                                onEdit={() => {
                                                    setEditingVersionId(item._id);
                                                    setVersionForm({
                                                        curriculumId: item.curriculumId,
                                                        curriculumCourseId: item.curriculumCourseId,
                                                        versionNumber: String(item.versionNumber),
                                                        revisionReason: item.revisionReason || "",
                                                        syllabusSummary: item.syllabusSummary || "",
                                                        unitOutline: item.unitOutline || "",
                                                        pedagogy: item.pedagogy || "",
                                                        assessmentStrategy: item.assessmentStrategy || "",
                                                        referenceBooks: (item.referenceBooks || []).join("\n"),
                                                        officialDocumentId: item.officialDocumentId || "",
                                                        approvedByBosMeetingId: item.approvedByBosMeetingId || "",
                                                        effectiveAcademicYearId: item.effectiveAcademicYearId || "",
                                                    });
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
                                    <p className="text-sm font-medium text-zinc-950">Program Outcomes</p>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <SelectField
                                            label="Curriculum Plan"
                                            value={outcomeForm.curriculumId}
                                            options={plans.map((item) => ({ id: item._id, label: `${item.title} · ${item.regulationYear}` }))}
                                            onValueChange={(value) => setOutcomeForm((current) => ({ ...current, curriculumId: value }))}
                                        />
                                        <SelectField
                                            label="Outcome Type"
                                            value={outcomeForm.outcomeType}
                                            options={[
                                                { id: "PO", label: "PO" },
                                                { id: "PSO", label: "PSO" },
                                                { id: "PEO", label: "PEO" },
                                            ]}
                                            onValueChange={(value) => setOutcomeForm((current) => ({ ...current, outcomeType: value }))}
                                        />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <TextField label="Outcome Code" value={outcomeForm.outcomeCode} onChange={(value) => setOutcomeForm((current) => ({ ...current, outcomeCode: value }))} />
                                        <Badge className="h-fit w-fit">
                                            Program: {currentPlanForOutcome?.programName || "Select a curriculum"}
                                        </Badge>
                                    </div>
                                    <TextAreaField label="Description" value={outcomeForm.description} onChange={(value) => setOutcomeForm((current) => ({ ...current, description: value }))} rows={3} />
                                    <div className="flex gap-3">
                                        <Button
                                            disabled={isPending || !currentPlanForOutcome?.programId}
                                            onClick={() =>
                                                submitForm(
                                                    editingOutcomeId ? `/api/admin/curriculum/program-outcomes/${editingOutcomeId}` : "/api/admin/curriculum/program-outcomes",
                                                    editingOutcomeId ? "PATCH" : "POST",
                                                    {
                                                        ...outcomeForm,
                                                        programId: currentPlanForOutcome?.programId,
                                                    },
                                                    editingOutcomeId ? "Program outcome updated." : "Program outcome created.",
                                                    resetOutcomeForm
                                                )
                                            }
                                        >
                                            {editingOutcomeId ? "Update Outcome" : "Create Outcome"}
                                        </Button>
                                        {editingOutcomeId ? <Button variant="secondary" onClick={resetOutcomeForm}>Cancel</Button> : null}
                                    </div>
                                    <div className="space-y-3 border-t pt-4">
                                        {programOutcomes.map((item) => (
                                            <ListRow
                                                key={item._id}
                                                title={`${item.outcomeType} · ${item.outcomeCode}`}
                                                subtitle={item.description}
                                                meta={planById.get(item.curriculumId)?.title || "Curriculum"}
                                                onEdit={() => {
                                                    setEditingOutcomeId(item._id);
                                                    setOutcomeForm({
                                                        curriculumId: item.curriculumId,
                                                        outcomeType: item.outcomeType,
                                                        outcomeCode: item.outcomeCode,
                                                        description: item.description,
                                                        isActive: Boolean(item.isActive),
                                                    });
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="governance" className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>BoS Meetings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <SelectField label="Department" value={meetingForm.departmentId} options={departmentOptions} onValueChange={(value) => setMeetingForm((current) => ({ ...current, departmentId: value }))} />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectField
                                        label="Academic Year"
                                        value={noValue(meetingForm.academicYearId)}
                                        options={[{ id: "none", label: "Not linked" }, ...academicYearOptions]}
                                        onValueChange={(value) => setMeetingForm((current) => ({ ...current, academicYearId: value === "none" ? "" : value }))}
                                    />
                                    <DateField label="Meeting Date" value={meetingForm.meetingDate} onChange={(value) => setMeetingForm((current) => ({ ...current, meetingDate: value }))} />
                                </div>
                                <TextField label="Title" value={meetingForm.title} onChange={(value) => setMeetingForm((current) => ({ ...current, title: value }))} />
                                <TextAreaField label="Agenda" value={meetingForm.agenda} onChange={(value) => setMeetingForm((current) => ({ ...current, agenda: value }))} rows={3} />
                                <TextField label="Minutes Document ID" value={meetingForm.minutesDocumentId} onChange={(value) => setMeetingForm((current) => ({ ...current, minutesDocumentId: value }))} />
                                <div className="flex gap-3">
                                    <Button
                                        disabled={isPending}
                                        onClick={() =>
                                            submitForm(
                                                editingMeetingId ? `/api/admin/curriculum/bos-meetings/${editingMeetingId}` : "/api/admin/curriculum/bos-meetings",
                                                editingMeetingId ? "PATCH" : "POST",
                                                {
                                                    ...meetingForm,
                                                    academicYearId: meetingForm.academicYearId || undefined,
                                                    minutesDocumentId: meetingForm.minutesDocumentId || undefined,
                                                },
                                                editingMeetingId ? "BoS meeting updated." : "BoS meeting created.",
                                                resetMeetingForm
                                            )
                                        }
                                    >
                                        {editingMeetingId ? "Update Meeting" : "Create Meeting"}
                                    </Button>
                                    {editingMeetingId ? <Button variant="secondary" onClick={resetMeetingForm}>Cancel</Button> : null}
                                </div>
                                <div className="space-y-3 border-t pt-4">
                                    {bosMeetings.map((item) => (
                                        <ListRow
                                            key={item._id}
                                            title={item.title}
                                            subtitle={`${item.departmentName} · ${normalizeDateInput(item.meetingDate)}`}
                                            meta={item.academicYearLabel || "No academic year"}
                                            onEdit={() => {
                                                setEditingMeetingId(item._id);
                                                setMeetingForm({
                                                    departmentId: item.departmentId,
                                                    academicYearId: item.academicYearId || "",
                                                    title: item.title,
                                                    meetingDate: normalizeDateInput(item.meetingDate),
                                                    agenda: item.agenda || "",
                                                    minutesDocumentId: item.minutesDocumentId || "",
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>BoS Decisions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <SelectField label="Meeting" value={decisionForm.meetingId} options={bosMeetings.map((item) => ({ id: item._id, label: item.title }))} onValueChange={(value) => setDecisionForm((current) => ({ ...current, meetingId: value }))} />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectField label="Curriculum Plan" value={noValue(decisionForm.curriculumId)} options={[{ id: "none", label: "Not linked" }, ...plans.map((item) => ({ id: item._id, label: item.title }))]} onValueChange={(value) => setDecisionForm((current) => ({ ...current, curriculumId: value === "none" ? "" : value }))} />
                                    <SelectField label="Curriculum Course" value={noValue(decisionForm.curriculumCourseId)} options={[{ id: "none", label: "Not linked" }, ...(coursesByCurriculum[decisionForm.curriculumId] ?? []).map((item) => ({ id: item._id, label: `${item.courseCode} · ${item.courseTitle}` }))]} onValueChange={(value) => setDecisionForm((current) => ({ ...current, curriculumCourseId: value === "none" ? "" : value }))} />
                                </div>
                                <TextField label="Decision Title" value={decisionForm.decisionTitle} onChange={(value) => setDecisionForm((current) => ({ ...current, decisionTitle: value }))} />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectField label="Decision Type" value={decisionForm.decisionType} options={[{ id: "Syllabus Revision", label: "Syllabus Revision" }, { id: "New Course", label: "New Course" }, { id: "Change Credit", label: "Change Credit" }, { id: "Outcome Update", label: "Outcome Update" }, { id: "Value Added Course", label: "Value Added Course" }, { id: "Other", label: "Other" }]} onValueChange={(value) => setDecisionForm((current) => ({ ...current, decisionType: value }))} />
                                    <SelectField label="Status" value={decisionForm.status} options={[{ id: "Proposed", label: "Proposed" }, { id: "Approved", label: "Approved" }, { id: "Implemented", label: "Implemented" }, { id: "Deferred", label: "Deferred" }]} onValueChange={(value) => setDecisionForm((current) => ({ ...current, status: value }))} />
                                </div>
                                <SelectField label="Implemented Academic Year" value={noValue(decisionForm.implementedAcademicYearId)} options={[{ id: "none", label: "Not linked" }, ...academicYearOptions]} onValueChange={(value) => setDecisionForm((current) => ({ ...current, implementedAcademicYearId: value === "none" ? "" : value }))} />
                                <TextAreaField label="Description" value={decisionForm.description} onChange={(value) => setDecisionForm((current) => ({ ...current, description: value }))} rows={3} />
                                <div className="flex gap-3">
                                    <Button
                                        disabled={isPending}
                                        onClick={() =>
                                            submitForm(
                                                editingDecisionId ? `/api/admin/curriculum/bos-decisions/${editingDecisionId}` : "/api/admin/curriculum/bos-decisions",
                                                editingDecisionId ? "PATCH" : "POST",
                                                {
                                                    ...decisionForm,
                                                    curriculumId: decisionForm.curriculumId || undefined,
                                                    curriculumCourseId: decisionForm.curriculumCourseId || undefined,
                                                    implementedAcademicYearId: decisionForm.implementedAcademicYearId || undefined,
                                                },
                                                editingDecisionId ? "BoS decision updated." : "BoS decision created.",
                                                resetDecisionForm
                                            )
                                        }
                                    >
                                        {editingDecisionId ? "Update Decision" : "Create Decision"}
                                    </Button>
                                    {editingDecisionId ? <Button variant="secondary" onClick={resetDecisionForm}>Cancel</Button> : null}
                                </div>
                                <div className="space-y-3 border-t pt-4">
                                    {bosDecisions.map((item) => (
                                        <ListRow
                                            key={item._id}
                                            title={item.decisionTitle}
                                            subtitle={`${item.decisionType} · ${item.meetingTitle}`}
                                            meta={item.status}
                                            onEdit={() => {
                                                setEditingDecisionId(item._id);
                                                setDecisionForm({
                                                    meetingId: item.meetingId,
                                                    curriculumId: item.curriculumId || "",
                                                    curriculumCourseId: item.curriculumCourseId || "",
                                                    decisionTitle: item.decisionTitle,
                                                    decisionType: item.decisionType,
                                                    description: item.description || "",
                                                    status: item.status,
                                                    implementedAcademicYearId: item.implementedAcademicYearId || "",
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Value Added Courses</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <SelectField label="Department" value={valueAddedForm.departmentId} options={departmentOptions} onValueChange={(value) => setValueAddedForm((current) => ({ ...current, departmentId: value }))} />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectField label="Academic Year" value={noValue(valueAddedForm.academicYearId)} options={[{ id: "none", label: "Not linked" }, ...academicYearOptions]} onValueChange={(value) => setValueAddedForm((current) => ({ ...current, academicYearId: value === "none" ? "" : value }))} />
                                    <SelectField label="Coordinator" value={noValue(valueAddedForm.coordinatorUserId)} options={[{ id: "none", label: "Unassigned" }, ...userOptions.map((item) => ({ id: item.id, label: `${item.name} · ${item.email}` }))]} onValueChange={(value) => setValueAddedForm((current) => ({ ...current, coordinatorUserId: value === "none" ? "" : value }))} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <TextField label="Title" value={valueAddedForm.title} onChange={(value) => setValueAddedForm((current) => ({ ...current, title: value }))} />
                                    <TextField label="Course Code" value={valueAddedForm.courseCode} onChange={(value) => setValueAddedForm((current) => ({ ...current, courseCode: value }))} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <TextField label="Credits" value={valueAddedForm.credits} onChange={(value) => setValueAddedForm((current) => ({ ...current, credits: value }))} />
                                    <TextField label="Contact Hours" value={valueAddedForm.contactHours} onChange={(value) => setValueAddedForm((current) => ({ ...current, contactHours: value }))} />
                                    <DateField label="Start Date" value={valueAddedForm.startDate} onChange={(value) => setValueAddedForm((current) => ({ ...current, startDate: value }))} />
                                    <DateField label="End Date" value={valueAddedForm.endDate} onChange={(value) => setValueAddedForm((current) => ({ ...current, endDate: value }))} />
                                </div>
                                <SelectField label="Status" value={valueAddedForm.status} options={[{ id: "Draft", label: "Draft" }, { id: "Active", label: "Active" }, { id: "Completed", label: "Completed" }, { id: "Archived", label: "Archived" }]} onValueChange={(value) => setValueAddedForm((current) => ({ ...current, status: value }))} />
                                <TextField label="Document ID" value={valueAddedForm.documentId} onChange={(value) => setValueAddedForm((current) => ({ ...current, documentId: value }))} />
                                <TextAreaField label="Description" value={valueAddedForm.description} onChange={(value) => setValueAddedForm((current) => ({ ...current, description: value }))} rows={3} />
                                <div className="flex gap-3">
                                    <Button
                                        disabled={isPending}
                                        onClick={() =>
                                            submitForm(
                                                editingValueAddedId ? `/api/admin/curriculum/value-added/${editingValueAddedId}` : "/api/admin/curriculum/value-added",
                                                editingValueAddedId ? "PATCH" : "POST",
                                                {
                                                    ...valueAddedForm,
                                                    academicYearId: valueAddedForm.academicYearId || undefined,
                                                    credits: Number(valueAddedForm.credits),
                                                    contactHours: Number(valueAddedForm.contactHours),
                                                    coordinatorUserId: valueAddedForm.coordinatorUserId || undefined,
                                                    startDate: valueAddedForm.startDate || undefined,
                                                    endDate: valueAddedForm.endDate || undefined,
                                                    documentId: valueAddedForm.documentId || undefined,
                                                },
                                                editingValueAddedId ? "Value added course updated." : "Value added course created.",
                                                resetValueAddedForm
                                            )
                                        }
                                    >
                                        {editingValueAddedId ? "Update Course" : "Create Course"}
                                    </Button>
                                    {editingValueAddedId ? <Button variant="secondary" onClick={resetValueAddedForm}>Cancel</Button> : null}
                                </div>
                                <div className="space-y-3 border-t pt-4">
                                    {valueAddedCourses.map((item) => (
                                        <ListRow
                                            key={item._id}
                                            title={item.title}
                                            subtitle={`${item.departmentName} · ${item.courseCode || "No code"}`}
                                            meta={`${item.status} · ${item.credits} credits`}
                                            onEdit={() => {
                                                setEditingValueAddedId(item._id);
                                                setValueAddedForm({
                                                    departmentId: item.departmentId,
                                                    academicYearId: item.academicYearId || "",
                                                    title: item.title,
                                                    courseCode: item.courseCode || "",
                                                    credits: String(item.credits),
                                                    contactHours: String(item.contactHours),
                                                    coordinatorUserId: item.coordinatorUserId || "",
                                                    startDate: normalizeDateInput(item.startDate),
                                                    endDate: normalizeDateInput(item.endDate),
                                                    status: item.status,
                                                    description: item.description || "",
                                                    documentId: item.documentId || "",
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="assignments" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Owner Assignments</CardTitle>
                            <CardDescription>Assign syllabus version drafting only to eligible faculty within the curriculum scope.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <SelectField label="Curriculum Plan" value={assignmentForm.curriculumId} options={plans.map((item) => ({ id: item._id, label: `${item.title} · ${item.regulationYear}` }))} onValueChange={(value) => setAssignmentForm((current) => ({ ...current, curriculumId: value, curriculumCourseId: coursesByCurriculum[value]?.[0]?._id ?? "", syllabusVersionId: versionsByCourse[coursesByCurriculum[value]?.[0]?._id ?? ""]?.[0]?._id ?? "" }))} />
                                <SelectField label="Curriculum Course" value={assignmentForm.curriculumCourseId} options={(coursesByCurriculum[assignmentForm.curriculumId] ?? []).map((item) => ({ id: item._id, label: `${item.courseCode} · ${item.courseTitle}` }))} onValueChange={(value) => setAssignmentForm((current) => ({ ...current, curriculumCourseId: value, syllabusVersionId: versionsByCourse[value]?.[0]?._id ?? "" }))} />
                                <SelectField label="Syllabus Version" value={assignmentForm.syllabusVersionId} options={(versionsByCourse[assignmentForm.curriculumCourseId] ?? []).map((item) => ({ id: item._id, label: `v${item.versionNumber} · ${item.status}` }))} onValueChange={(value) => setAssignmentForm((current) => ({ ...current, syllabusVersionId: value }))} />
                                <SelectField label="Assignee" value={assignmentForm.assigneeUserId} options={userOptions.map((item) => ({ id: item.id, label: `${item.name} · ${item.email}` }))} onValueChange={(value) => setAssignmentForm((current) => ({ ...current, assigneeUserId: value }))} />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <DateField label="Due Date" value={assignmentForm.dueDate} onChange={(value) => setAssignmentForm((current) => ({ ...current, dueDate: value }))} />
                                <TextAreaField label="Notes" value={assignmentForm.notes} onChange={(value) => setAssignmentForm((current) => ({ ...current, notes: value }))} rows={3} />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    disabled={isPending}
                                    onClick={() =>
                                        submitForm(
                                            editingAssignmentId ? `/api/admin/curriculum/assignments/${editingAssignmentId}` : "/api/admin/curriculum/assignments",
                                            editingAssignmentId ? "PATCH" : "POST",
                                            {
                                                ...assignmentForm,
                                                dueDate: assignmentForm.dueDate || undefined,
                                            },
                                            editingAssignmentId ? "Curriculum assignment updated." : "Curriculum assignment created.",
                                            resetAssignmentForm
                                        )
                                    }
                                >
                                    {editingAssignmentId ? "Update Assignment" : "Create Assignment"}
                                </Button>
                                {editingAssignmentId ? <Button variant="secondary" onClick={resetAssignmentForm}>Cancel</Button> : null}
                            </div>
                            <div className="space-y-3 border-t pt-4">
                                {assignments.map((item) => (
                                    <ListRow
                                        key={item._id}
                                        title={`${curriculumCourses.find((course) => course._id === item.curriculumCourseId)?.courseCode || "Course"} · ${item.assigneeName}`}
                                        subtitle={planById.get(item.curriculumId)?.title || "Curriculum"}
                                        meta={`${item.status} · ${normalizeDateInput(item.dueDate) || "No due date"}`}
                                        onEdit={() => {
                                            setEditingAssignmentId(item._id);
                                            setAssignmentForm({
                                                curriculumId: item.curriculumId,
                                                curriculumCourseId: item.curriculumCourseId,
                                                syllabusVersionId: item.syllabusVersionId,
                                                assigneeUserId: item.assigneeUserId,
                                                dueDate: normalizeDateInput(item.dueDate),
                                                notes: item.notes || "",
                                                isActive: Boolean(item.isActive),
                                            });
                                        }}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
}

function DateField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
}

function TextAreaField({
    label,
    value,
    onChange,
    rows = 3,
    description,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    description?: string;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
            {description ? <p className="text-xs text-zinc-500">{description}</p> : null}
        </div>
    );
}

function SelectField({
    label,
    value,
    options,
    onValueChange,
}: {
    label: string;
    value: string;
    options: Option[];
    onValueChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger>
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function ListRow({
    title,
    subtitle,
    meta,
    onEdit,
}: {
    title: string;
    subtitle: string;
    meta: string;
    onEdit: () => void;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
                <p className="font-medium text-zinc-950">{title}</p>
                <p className="text-sm text-zinc-500">{subtitle}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">{meta}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={onEdit}>
                Edit
            </Button>
        </div>
    );
}
