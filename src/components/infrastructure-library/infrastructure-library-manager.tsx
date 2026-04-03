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

type PlanRecord = {
    _id: string;
    title: string;
    academicYearLabel: string;
    scopeType: string;
    focusArea: string;
    institutionId?: string;
    institutionName?: string;
    departmentId?: string;
    departmentName?: string;
    summary?: string;
    strategyGoals?: string;
    targetClassroomCount: number;
    targetLaboratoryCount: number;
    targetBookCount: number;
    targetJournalCount: number;
    targetEresourceCount: number;
    targetBandwidthMbps: number;
    facultyOwnerUserId?: string;
    status: string;
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

type DepartmentOption = {
    id: string;
    label: string;
    institutionId?: string;
};

type InstitutionOption = {
    id: string;
    label: string;
};

type UserOption = {
    id: string;
    label: string;
    email?: string;
    department?: string;
};

type PlanFormState = {
    academicYearId: string;
    scopeType: string;
    institutionId: string;
    departmentId: string;
    title: string;
    focusArea: string;
    summary: string;
    strategyGoals: string;
    targetClassroomCount: string;
    targetLaboratoryCount: string;
    targetBookCount: string;
    targetJournalCount: string;
    targetEresourceCount: string;
    targetBandwidthMbps: string;
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
    scopeType: "Department",
    institutionId: "",
    departmentId: "",
    title: "",
    focusArea: "Integrated",
    summary: "",
    strategyGoals: "",
    targetClassroomCount: "0",
    targetLaboratoryCount: "0",
    targetBookCount: "0",
    targetJournalCount: "0",
    targetEresourceCount: "0",
    targetBandwidthMbps: "0",
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

function statusBadge(status: string) {
    if (status === "Approved" || status === "Active") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Rejected") {
        return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
    }

    if (
        ["Submitted", "Infrastructure Review", "Under Review", "Committee Review", "Locked"].includes(
            status
        )
    ) {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

export function InfrastructureLibraryManager({
    plans,
    assignments,
    academicYearOptions,
    departmentOptions,
    institutionOptions,
    userOptions,
}: {
    plans: PlanRecord[];
    assignments: AssignmentRecord[];
    academicYearOptions: AcademicYearOption[];
    departmentOptions: DepartmentOption[];
    institutionOptions: InstitutionOption[];
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

        return [
            plan.title,
            plan.academicYearLabel,
            plan.departmentName,
            plan.institutionName,
            plan.status,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    const filteredAssignments = assignments.filter((assignment) => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [
            assignment.planTitle,
            assignment.assigneeName,
            assignment.assigneeEmail,
            assignment.status,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    useEffect(() => {
        if (!editingPlanId) {
            return;
        }

        const plan = plans.find((item) => item._id === editingPlanId);
        if (!plan) {
            return;
        }

        setPlanForm({
            academicYearId:
                academicYearOptions.find((option) => option.label === plan.academicYearLabel)?.id ?? "",
            scopeType: plan.scopeType,
            institutionId: plan.institutionId ?? "",
            departmentId: plan.departmentId ?? "",
            title: plan.title,
            focusArea: plan.focusArea,
            summary: plan.summary ?? "",
            strategyGoals: plan.strategyGoals ?? "",
            targetClassroomCount: String(plan.targetClassroomCount ?? 0),
            targetLaboratoryCount: String(plan.targetLaboratoryCount ?? 0),
            targetBookCount: String(plan.targetBookCount ?? 0),
            targetJournalCount: String(plan.targetJournalCount ?? 0),
            targetEresourceCount: String(plan.targetEresourceCount ?? 0),
            targetBandwidthMbps: String(plan.targetBandwidthMbps ?? 0),
            facultyOwnerUserId: plan.facultyOwnerUserId ?? "",
            status: plan.status,
        });
    }, [academicYearOptions, editingPlanId, plans]);

    useEffect(() => {
        if (!editingAssignmentId) {
            return;
        }

        const assignment = assignments.find((item) => item._id === editingAssignmentId);
        if (!assignment) {
            return;
        }

        setAssignmentForm({
            planId: assignment.planId,
            assigneeUserId: assignment.assigneeUserId,
            dueDate: assignment.dueDate ? assignment.dueDate.slice(0, 10) : "",
            notes: assignment.notes ?? "",
            isActive: assignment.isActive,
        });
    }, [assignments, editingAssignmentId]);

    const scopedDepartments = planForm.institutionId
        ? departmentOptions.filter((option) => option.institutionId === planForm.institutionId)
        : departmentOptions;

    function resetPlanForm() {
        setEditingPlanId("");
        setPlanForm(emptyPlanForm);
    }

    function resetAssignmentForm() {
        setEditingAssignmentId("");
        setAssignmentForm(emptyAssignmentForm);
    }

    function submitPlan() {
        setMessage(null);

        startTransition(async () => {
            try {
                const payload = {
                    academicYearId: planForm.academicYearId,
                    scopeType: planForm.scopeType,
                    institutionId: planForm.institutionId || undefined,
                    departmentId: planForm.departmentId || undefined,
                    title: planForm.title.trim(),
                    focusArea: planForm.focusArea,
                    summary: planForm.summary.trim(),
                    strategyGoals: planForm.strategyGoals.trim(),
                    targetClassroomCount: Number(planForm.targetClassroomCount || 0),
                    targetLaboratoryCount: Number(planForm.targetLaboratoryCount || 0),
                    targetBookCount: Number(planForm.targetBookCount || 0),
                    targetJournalCount: Number(planForm.targetJournalCount || 0),
                    targetEresourceCount: Number(planForm.targetEresourceCount || 0),
                    targetBandwidthMbps: Number(planForm.targetBandwidthMbps || 0),
                    facultyOwnerUserId: planForm.facultyOwnerUserId || undefined,
                    status: planForm.status,
                };

                const data = await requestJson<{ message?: string }>(
                    editingPlanId
                        ? `/api/admin/infrastructure-library/plans/${editingPlanId}`
                        : "/api/admin/infrastructure-library/plans",
                    {
                        method: editingPlanId ? "PUT" : "POST",
                        body: JSON.stringify(payload),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Infrastructure & library plan saved successfully.",
                });
                resetPlanForm();
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the infrastructure/library plan.",
                });
            }
        });
    }

    function submitAssignment() {
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
                        ? `/api/admin/infrastructure-library/assignments/${editingAssignmentId}`
                        : "/api/admin/infrastructure-library/assignments",
                    {
                        method: editingAssignmentId ? "PUT" : "POST",
                        body: JSON.stringify(payload),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Infrastructure & library assignment saved successfully.",
                });
                resetAssignmentForm();
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the infrastructure/library assignment.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    onClick={() => setTab("plans")}
                    type="button"
                    variant={tab === "plans" ? "default" : "outline"}
                >
                    Plans
                </Button>
                <Button
                    onClick={() => setTab("assignments")}
                    type="button"
                    variant={tab === "assignments" ? "default" : "outline"}
                >
                    Assignments
                </Button>
                <Input
                    className="max-w-sm"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by title, unit, assignee, or status"
                    value={search}
                />
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

            {tab === "plans" ? (
                <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingPlanId ? "Edit plan" : "Create plan"}</CardTitle>
                            <CardDescription>
                                Create the governed infrastructure/library portfolio and set the eligible faculty owner.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Academic year</Label>
                                <Select
                                    onValueChange={(value) => setPlanForm((current) => ({ ...current, academicYearId: value }))}
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
                                <Label>Scope type</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            scopeType: value,
                                            institutionId: value === "Institution" ? current.institutionId : "",
                                            departmentId: value === "Department" ? current.departmentId : "",
                                        }))
                                    }
                                    value={planForm.scopeType}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Department">Department</SelectItem>
                                        <SelectItem value="Institution">Institution</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {planForm.scopeType === "Institution" ? (
                                <div className="space-y-2">
                                    <Label>Institution</Label>
                                    <Select
                                        onValueChange={(value) => setPlanForm((current) => ({ ...current, institutionId: value }))}
                                        value={planForm.institutionId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select institution" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {institutionOptions.map((option) => (
                                                <SelectItem key={option.id} value={option.id}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label>Institution</Label>
                                        <Select
                                            onValueChange={(value) =>
                                                setPlanForm((current) => ({
                                                    ...current,
                                                    institutionId: value,
                                                    departmentId: "",
                                                }))
                                            }
                                            value={planForm.institutionId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Filter departments by institution" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {institutionOptions.map((option) => (
                                                    <SelectItem key={option.id} value={option.id}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select
                                            onValueChange={(value) => setPlanForm((current) => ({ ...current, departmentId: value }))}
                                            value={planForm.departmentId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {scopedDepartments.map((option) => (
                                                    <SelectItem key={option.id} value={option.id}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    onChange={(event) => setPlanForm((current) => ({ ...current, title: event.target.value }))}
                                    placeholder="Infrastructure & library readiness 2025-26"
                                    value={planForm.title}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Focus area</Label>
                                <Select
                                    onValueChange={(value) => setPlanForm((current) => ({ ...current, focusArea: value }))}
                                    value={planForm.focusArea}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Integrated">Integrated</SelectItem>
                                        <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                                        <SelectItem value="Library">Library</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Plan owner</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, facultyOwnerUserId: value }))
                                    }
                                    value={planForm.facultyOwnerUserId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select eligible faculty owner" />
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

                            <div className="grid gap-3 md:grid-cols-2">
                                <TargetField label="Classrooms" value={planForm.targetClassroomCount} onChange={(value) => setPlanForm((current) => ({ ...current, targetClassroomCount: value }))} />
                                <TargetField label="Laboratories" value={planForm.targetLaboratoryCount} onChange={(value) => setPlanForm((current) => ({ ...current, targetLaboratoryCount: value }))} />
                                <TargetField label="Books" value={planForm.targetBookCount} onChange={(value) => setPlanForm((current) => ({ ...current, targetBookCount: value }))} />
                                <TargetField label="Journals" value={planForm.targetJournalCount} onChange={(value) => setPlanForm((current) => ({ ...current, targetJournalCount: value }))} />
                                <TargetField label="E-resources" value={planForm.targetEresourceCount} onChange={(value) => setPlanForm((current) => ({ ...current, targetEresourceCount: value }))} />
                                <TargetField label="Bandwidth (Mbps)" value={planForm.targetBandwidthMbps} onChange={(value) => setPlanForm((current) => ({ ...current, targetBandwidthMbps: value }))} />
                            </div>

                            <div className="space-y-2">
                                <Label>Summary</Label>
                                <Textarea
                                    onChange={(event) => setPlanForm((current) => ({ ...current, summary: event.target.value }))}
                                    rows={3}
                                    value={planForm.summary}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Strategy goals</Label>
                                <Textarea
                                    onChange={(event) =>
                                        setPlanForm((current) => ({ ...current, strategyGoals: event.target.value }))
                                    }
                                    rows={4}
                                    value={planForm.strategyGoals}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    onValueChange={(value) => setPlanForm((current) => ({ ...current, status: value }))}
                                    value={planForm.status}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Locked">Locked</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-3">
                                <Button disabled={isPending} onClick={submitPlan} type="button">
                                    {editingPlanId ? "Update plan" : "Create plan"}
                                </Button>
                                <Button disabled={isPending} onClick={resetPlanForm} type="button" variant="outline">
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {filteredPlans.map((plan) => (
                            <Card key={plan._id}>
                                <CardContent className="p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {statusBadge(plan.status)}
                                                <Badge variant="outline">{plan.scopeType}</Badge>
                                                <Badge variant="outline">{plan.focusArea}</Badge>
                                            </div>
                                            <h3 className="mt-3 text-lg font-semibold text-zinc-950">
                                                {plan.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {plan.departmentName || plan.institutionName || "Scoped unit"} · {plan.academicYearLabel}
                                            </p>
                                            <p className="mt-3 text-sm text-zinc-600">
                                                {plan.summary?.trim() || "No plan summary provided."}
                                            </p>
                                            <p className="mt-2 text-xs text-zinc-500">
                                                Targets: {plan.targetClassroomCount} classrooms, {plan.targetLaboratoryCount} labs, {plan.targetBookCount} books, {plan.targetJournalCount} journals, {plan.targetEresourceCount} e-resources, {plan.targetBandwidthMbps} Mbps
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Button
                                                onClick={() => setEditingPlanId(plan._id)}
                                                size="sm"
                                                type="button"
                                                variant="secondary"
                                            >
                                                Edit plan
                                            </Button>
                                            <p className="text-xs text-zinc-500">
                                                Updated {formatDate(plan.updatedAt)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingAssignmentId ? "Edit assignment" : "Create assignment"}</CardTitle>
                            <CardDescription>
                                Server-side assignment enforcement only allows scoped infrastructure/library coordinators and plan owners.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Plan</Label>
                                <Select
                                    onValueChange={(value) => setAssignmentForm((current) => ({ ...current, planId: value }))}
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
                                <Label>Coordinator</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setAssignmentForm((current) => ({ ...current, assigneeUserId: value }))
                                    }
                                    value={assignmentForm.assigneeUserId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select eligible faculty coordinator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-zinc-500">
                                    Enforcement happens in the service layer for scoped plan owners, office heads, committee members, and active infrastructure/library coordinators.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Due date</Label>
                                <Input
                                    onChange={(event) =>
                                        setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))
                                    }
                                    type="date"
                                    value={assignmentForm.dueDate}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    onChange={(event) =>
                                        setAssignmentForm((current) => ({ ...current, notes: event.target.value }))
                                    }
                                    rows={4}
                                    value={assignmentForm.notes}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Assignment state</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            isActive: value === "active",
                                        }))
                                    }
                                    value={assignmentForm.isActive ? "active" : "inactive"}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-3">
                                <Button disabled={isPending} onClick={submitAssignment} type="button">
                                    {editingAssignmentId ? "Update assignment" : "Create assignment"}
                                </Button>
                                <Button disabled={isPending} onClick={resetAssignmentForm} type="button" variant="outline">
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {filteredAssignments.map((assignment) => (
                            <Card key={assignment._id}>
                                <CardContent className="p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {statusBadge(assignment.status)}
                                                <Badge variant={assignment.isActive ? "default" : "secondary"}>
                                                    {assignment.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <h3 className="mt-3 text-lg font-semibold text-zinc-950">
                                                {assignment.planTitle}
                                            </h3>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {assignment.assigneeName} · {assignment.assigneeEmail || "No email"}
                                            </p>
                                            <p className="mt-3 text-sm text-zinc-600">
                                                {assignment.notes?.trim() || "No assignment note provided."}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Button
                                                onClick={() => setEditingAssignmentId(assignment._id)}
                                                size="sm"
                                                type="button"
                                                variant="secondary"
                                            >
                                                Edit assignment
                                            </Button>
                                            <p className="text-xs text-zinc-500">
                                                Due {formatDate(assignment.dueDate)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TargetField({
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
            <Input onChange={(event) => onChange(event.target.value)} type="number" value={value} />
        </div>
    );
}
