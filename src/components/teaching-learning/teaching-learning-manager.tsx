"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type PlanRecord = {
    _id: string;
    title: string;
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
    summary?: string;
    status: string;
    facultyOwnerUserId?: string;
    updatedAt?: string;
};

type AssignmentRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    assigneeUserId: string;
    assigneeName: string;
    assigneeEmail: string;
    dueDate?: string;
    notes?: string;
    status: string;
    isActive: boolean;
    updatedAt?: string;
};

type AcademicYearOption = {
    id: string;
    label: string;
    isActive: boolean;
};

type ProgramOption = {
    id: string;
    label: string;
    code?: string;
    departmentId?: string;
    institutionId?: string;
};

type CourseOption = {
    id: string;
    label: string;
    subjectCode?: string;
    programId?: string;
    semesterId?: string;
    courseType?: string;
    credits?: number;
};

type SemesterOption = {
    id: string;
    label: string;
    semesterNumber: number;
};

type UserOption = {
    id: string;
    label: string;
    email?: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
};

type PlanFormState = {
    academicYearId: string;
    programId: string;
    courseId: string;
    semesterId: string;
    title: string;
    sectionName: string;
    deliveryType: string;
    plannedSessions: string;
    plannedContactHours: string;
    classStrength: string;
    summary: string;
    facultyOwnerUserId: string;
    status: string;
};

type AssignmentFormState = {
    planId: string;
    assigneeUserId: string;
    dueDate: string;
    notes: string;
    isActive: boolean;
};

const emptyPlanForm: PlanFormState = {
    academicYearId: "",
    programId: "",
    courseId: "",
    semesterId: "",
    title: "",
    sectionName: "",
    deliveryType: "Theory",
    plannedSessions: "0",
    plannedContactHours: "0",
    classStrength: "",
    summary: "",
    facultyOwnerUserId: "",
    status: "Draft",
};

const emptyAssignmentForm: AssignmentFormState = {
    planId: "",
    assigneeUserId: "",
    dueDate: "",
    notes: "",
    isActive: true,
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

export function TeachingLearningManager({
    plans,
    assignments,
    academicYearOptions,
    programOptions,
    courseOptions,
    semesterOptions,
    userOptions,
}: {
    plans: PlanRecord[];
    assignments: AssignmentRecord[];
    academicYearOptions: AcademicYearOption[];
    programOptions: ProgramOption[];
    courseOptions: CourseOption[];
    semesterOptions: SemesterOption[];
    userOptions: UserOption[];
}) {
    const router = useRouter();
    const [tab, setTab] = useState<"plans" | "assignments">("plans");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [editingPlanId, setEditingPlanId] = useState("");
    const [editingAssignmentId, setEditingAssignmentId] = useState("");
    const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(emptyAssignmentForm);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredPlans = plans.filter((plan) => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [plan.title, plan.programName, plan.courseTitle, plan.courseCode, plan.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    const filteredAssignments = assignments.filter((assignment) => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [assignment.planTitle, assignment.assigneeName, assignment.assigneeEmail, assignment.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    useEffect(() => {
        if (!planForm.programId) {
            return;
        }

        const validCourse = courseOptions.some(
            (course) =>
                course.id === planForm.courseId &&
                course.programId === planForm.programId &&
                (!planForm.semesterId || course.semesterId === planForm.semesterId)
        );

        if (!validCourse) {
            setPlanForm((current) => ({ ...current, courseId: "" }));
        }
    }, [courseOptions, planForm.courseId, planForm.programId, planForm.semesterId]);

    function loadPlan(record: PlanRecord) {
        setEditingPlanId(record._id);
        setPlanForm({
            academicYearId:
                academicYearOptions.find((item) => item.label === record.academicYearLabel)?.id ?? "",
            programId: programOptions.find((item) => item.label === record.programName)?.id ?? "",
            courseId:
                courseOptions.find(
                    (item) =>
                        item.label === record.courseTitle && (item.subjectCode ?? "") === (record.courseCode ?? "")
                )?.id ?? "",
            semesterId:
                semesterOptions.find((item) => item.semesterNumber === record.semesterNumber)?.id ?? "",
            title: record.title,
            sectionName: record.sectionName ?? "",
            deliveryType: record.deliveryType,
            plannedSessions: String(record.plannedSessions ?? 0),
            plannedContactHours: String(record.plannedContactHours ?? 0),
            classStrength: record.classStrength !== undefined ? String(record.classStrength) : "",
            summary: record.summary ?? "",
            facultyOwnerUserId: record.facultyOwnerUserId ?? "",
            status: record.status,
        });
        setTab("plans");
    }

    function loadAssignment(record: AssignmentRecord) {
        setEditingAssignmentId(record._id);
        setAssignmentForm({
            planId: record.planId,
            assigneeUserId: record.assigneeUserId,
            dueDate: record.dueDate ? record.dueDate.slice(0, 10) : "",
            notes: record.notes ?? "",
            isActive: record.isActive,
        });
        setTab("assignments");
    }

    function resetPlanForm() {
        setEditingPlanId("");
        setPlanForm(emptyPlanForm);
    }

    function resetAssignmentForm() {
        setEditingAssignmentId("");
        setAssignmentForm(emptyAssignmentForm);
    }

    function savePlan() {
        setMessage(null);

        startTransition(async () => {
            try {
                const payload = {
                    academicYearId: planForm.academicYearId,
                    programId: planForm.programId,
                    courseId: planForm.courseId,
                    semesterId: planForm.semesterId,
                    title: planForm.title.trim(),
                    sectionName: planForm.sectionName.trim(),
                    deliveryType: planForm.deliveryType,
                    plannedSessions: Number(planForm.plannedSessions || 0),
                    plannedContactHours: Number(planForm.plannedContactHours || 0),
                    classStrength:
                        planForm.classStrength.trim() === ""
                            ? undefined
                            : Number(planForm.classStrength),
                    summary: planForm.summary.trim(),
                    facultyOwnerUserId: planForm.facultyOwnerUserId || undefined,
                    status: planForm.status,
                };

                const data = await requestJson<{ message?: string }>(
                    editingPlanId
                        ? `/api/admin/teaching-learning/plans/${editingPlanId}`
                        : "/api/admin/teaching-learning/plans",
                    {
                        method: editingPlanId ? "PATCH" : "POST",
                        body: JSON.stringify(payload),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Teaching learning plan saved successfully.",
                });
                router.refresh();
                resetPlanForm();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the teaching learning plan.",
                });
            }
        });
    }

    function saveAssignment() {
        setMessage(null);

        startTransition(async () => {
            try {
                const payload = {
                    planId: assignmentForm.planId,
                    assigneeUserId: assignmentForm.assigneeUserId,
                    dueDate: assignmentForm.dueDate || undefined,
                    notes: assignmentForm.notes.trim(),
                    isActive: assignmentForm.isActive,
                };

                const data = await requestJson<{ message?: string }>(
                    editingAssignmentId
                        ? `/api/admin/teaching-learning/assignments/${editingAssignmentId}`
                        : "/api/admin/teaching-learning/assignments",
                    {
                        method: editingAssignmentId ? "PATCH" : "POST",
                        body: JSON.stringify(payload),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Teaching learning assignment saved successfully.",
                });
                router.refresh();
                resetAssignmentForm();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the teaching learning assignment.",
                });
            }
        });
    }

    const selectableCourses = courseOptions.filter(
        (course) =>
            (!planForm.programId || course.programId === planForm.programId) &&
            (!planForm.semesterId || course.semesterId === planForm.semesterId)
    );

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                            Delivery Plans
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-zinc-950">{plans.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                            Assignments
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-zinc-950">{assignments.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                            Active Contributors
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-zinc-950">
                            {new Set(assignments.filter((item) => item.isActive).map((item) => item.assigneeUserId)).size}
                        </p>
                    </CardContent>
                </Card>
            </div>

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

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Input
                    className="lg:max-w-sm"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search plans or assignments"
                    value={search}
                />
                <Tabs onValueChange={(value) => setTab(value as "plans" | "assignments")} value={tab}>
                    <TabsList>
                        <TabsTrigger value="plans">Plans</TabsTrigger>
                        <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {tab === "plans" ? (
                <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle>
                                        {editingPlanId ? "Update delivery plan" : "Create delivery plan"}
                                    </CardTitle>
                                    <CardDescription>
                                        Define governed teaching-learning plan instances against academic year, program, course, and semester.
                                    </CardDescription>
                                </div>
                                {editingPlanId ? (
                                    <Button onClick={resetPlanForm} type="button" variant="outline">
                                        New Plan
                                    </Button>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Academic Year</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, academicYearId: value }))
                                    }
                                    value={planForm.academicYearId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select academic year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYearOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Program</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, programId: value }))
                                    }
                                    value={planForm.programId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select program" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {programOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Semester</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, semesterId: value }))
                                    }
                                    value={planForm.semesterId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select semester" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {semesterOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Course</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, courseId: value }))
                                    }
                                    value={planForm.courseId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectableCourses.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.subjectCode
                                                    ? `${option.label} (${option.subjectCode})`
                                                    : option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Plan Title</Label>
                                <Input
                                    onChange={(event) =>
                                        setPlanForm((current) => ({ ...current, title: event.target.value }))
                                    }
                                    value={planForm.title}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Section Name</Label>
                                <Input
                                    onChange={(event) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            sectionName: event.target.value,
                                        }))
                                    }
                                    value={planForm.sectionName}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Delivery Type</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, deliveryType: value }))
                                    }
                                    value={planForm.deliveryType}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["Theory", "Lab", "Project", "Blended", "Fieldwork", "Other"].map(
                                            (option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Planned Sessions</Label>
                                <Input
                                    onChange={(event) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            plannedSessions: event.target.value,
                                        }))
                                    }
                                    value={planForm.plannedSessions}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Planned Contact Hours</Label>
                                <Input
                                    onChange={(event) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            plannedContactHours: event.target.value,
                                        }))
                                    }
                                    value={planForm.plannedContactHours}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Class Strength</Label>
                                <Input
                                    onChange={(event) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            classStrength: event.target.value,
                                        }))
                                    }
                                    value={planForm.classStrength}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Faculty Owner</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            facultyOwnerUserId: value === "none" ? "" : value,
                                        }))
                                    }
                                    value={planForm.facultyOwnerUserId || "none"}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {userOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, status: value }))
                                    }
                                    value={planForm.status}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["Draft", "Active", "Archived"].map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Summary</Label>
                                <Textarea
                                    onChange={(event) =>
                                        setPlanForm((current) => ({ ...current, summary: event.target.value }))
                                    }
                                    value={planForm.summary}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Button disabled={isPending} onClick={savePlan}>
                                    {isPending ? "Saving..." : editingPlanId ? "Update Plan" : "Create Plan"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Existing Plans</CardTitle>
                            <CardDescription>
                                Select a plan to edit its controlled structure and ownership mapping.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {filteredPlans.length ? (
                                filteredPlans.map((plan) => (
                                    <button
                                        className={`w-full rounded-xl border p-4 text-left transition ${
                                            editingPlanId === plan._id
                                                ? "border-zinc-900 bg-zinc-900 text-white"
                                                : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100"
                                        }`}
                                        key={plan._id}
                                        onClick={() => loadPlan(plan)}
                                        type="button"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold">{plan.title}</p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    {plan.courseTitle}
                                                    {plan.courseCode ? ` (${plan.courseCode})` : ""} ·{" "}
                                                    {plan.academicYearLabel}
                                                </p>
                                            </div>
                                            <Badge variant="secondary">{plan.status}</Badge>
                                        </div>
                                        <p className="mt-3 text-xs opacity-80">
                                            {plan.programName} · Semester {plan.semesterNumber ?? "-"} · Sessions{" "}
                                            {plan.plannedSessions}
                                        </p>
                                    </button>
                                ))
                            ) : (
                                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                    No plans matched the current filters.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle>
                                        {editingAssignmentId ? "Update assignment" : "Create assignment"}
                                    </CardTitle>
                                    <CardDescription>
                                        Map eligible faculty users to governed teaching-learning plans.
                                    </CardDescription>
                                </div>
                                {editingAssignmentId ? (
                                    <Button onClick={resetAssignmentForm} type="button" variant="outline">
                                        New Assignment
                                    </Button>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Plan</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setAssignmentForm((current) => ({ ...current, planId: value }))
                                    }
                                    value={assignmentForm.planId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plans.map((plan) => (
                                            <SelectItem key={plan._id} value={plan._id}>
                                                {plan.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Assignee</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            assigneeUserId: value,
                                        }))
                                    }
                                    value={assignmentForm.assigneeUserId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select faculty user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input
                                    onChange={(event) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            dueDate: event.target.value,
                                        }))
                                    }
                                    type="date"
                                    value={assignmentForm.dueDate}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Active</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            isActive: value === "true",
                                        }))
                                    }
                                    value={assignmentForm.isActive ? "true" : "false"}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Notes</Label>
                                <Textarea
                                    onChange={(event) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            notes: event.target.value,
                                        }))
                                    }
                                    value={assignmentForm.notes}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Button disabled={isPending} onClick={saveAssignment}>
                                    {isPending
                                        ? "Saving..."
                                        : editingAssignmentId
                                          ? "Update Assignment"
                                          : "Create Assignment"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Existing Assignments</CardTitle>
                            <CardDescription>
                                Review current ownership mapping and update due dates or activity status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {filteredAssignments.length ? (
                                filteredAssignments.map((assignment) => (
                                    <button
                                        className={`w-full rounded-xl border p-4 text-left transition ${
                                            editingAssignmentId === assignment._id
                                                ? "border-zinc-900 bg-zinc-900 text-white"
                                                : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100"
                                        }`}
                                        key={assignment._id}
                                        onClick={() => loadAssignment(assignment)}
                                        type="button"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold">{assignment.planTitle}</p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    {assignment.assigneeName} · {assignment.assigneeEmail}
                                                </p>
                                            </div>
                                            <Badge variant="secondary">{assignment.status}</Badge>
                                        </div>
                                        <p className="mt-3 text-xs opacity-80">
                                            Due {formatDate(assignment.dueDate)} ·{" "}
                                            {assignment.isActive ? "Active" : "Inactive"}
                                        </p>
                                    </button>
                                ))
                            ) : (
                                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                    No assignments matched the current filters.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
