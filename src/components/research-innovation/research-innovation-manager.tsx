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
    targetPublicationCount: number;
    targetProjectCount: number;
    targetPatentCount: number;
    targetConsultancyCount: number;
    targetStudentResearchCount: number;
    targetInnovationActivityCount: number;
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
    collegeName?: string;
    universityName?: string;
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
    targetPublicationCount: string;
    targetProjectCount: string;
    targetPatentCount: string;
    targetConsultancyCount: string;
    targetStudentResearchCount: string;
    targetInnovationActivityCount: string;
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
    targetPublicationCount: "0",
    targetProjectCount: "0",
    targetPatentCount: "0",
    targetConsultancyCount: "0",
    targetStudentResearchCount: "0",
    targetInnovationActivityCount: "0",
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

function planStatusBadge(status: string) {
    if (status === "Active") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Locked") {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

function assignmentStatusBadge(status: string) {
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

export function ResearchInnovationManager({
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
            plan.scopeType,
            plan.focusArea,
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

        return [assignment.planTitle, assignment.assigneeName, assignment.assigneeEmail, assignment.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    const availablePlans = plans.filter((plan) => plan.status !== "Locked");
    const filteredDepartmentOptions =
        planForm.institutionId && planForm.scopeType === "Department"
            ? departmentOptions.filter((item) => item.institutionId === planForm.institutionId)
            : departmentOptions;

    useEffect(() => {
        if (planForm.scopeType === "Institution" && planForm.departmentId) {
            setPlanForm((current) => ({ ...current, departmentId: "" }));
        }
    }, [planForm.departmentId, planForm.scopeType]);

    useEffect(() => {
        if (!planForm.departmentId || !planForm.institutionId) {
            return;
        }

        const validDepartment = departmentOptions.some(
            (item) =>
                item.id === planForm.departmentId &&
                (!item.institutionId || item.institutionId === planForm.institutionId)
        );

        if (!validDepartment) {
            setPlanForm((current) => ({ ...current, departmentId: "" }));
        }
    }, [departmentOptions, planForm.departmentId, planForm.institutionId]);

    function loadPlan(record: PlanRecord) {
        setEditingPlanId(record._id);
        setPlanForm({
            academicYearId:
                academicYearOptions.find((item) => item.label === record.academicYearLabel)?.id ?? "",
            scopeType: record.scopeType,
            institutionId: record.institutionId ?? "",
            departmentId: record.departmentId ?? "",
            title: record.title,
            focusArea: record.focusArea,
            summary: record.summary ?? "",
            strategyGoals: record.strategyGoals ?? "",
            targetPublicationCount: String(record.targetPublicationCount ?? 0),
            targetProjectCount: String(record.targetProjectCount ?? 0),
            targetPatentCount: String(record.targetPatentCount ?? 0),
            targetConsultancyCount: String(record.targetConsultancyCount ?? 0),
            targetStudentResearchCount: String(record.targetStudentResearchCount ?? 0),
            targetInnovationActivityCount: String(record.targetInnovationActivityCount ?? 0),
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
                    scopeType: planForm.scopeType,
                    institutionId: planForm.institutionId || undefined,
                    departmentId: planForm.scopeType === "Department" ? planForm.departmentId || undefined : undefined,
                    title: planForm.title.trim(),
                    focusArea: planForm.focusArea,
                    summary: planForm.summary.trim(),
                    strategyGoals: planForm.strategyGoals.trim(),
                    targetPublicationCount: Number(planForm.targetPublicationCount || 0),
                    targetProjectCount: Number(planForm.targetProjectCount || 0),
                    targetPatentCount: Number(planForm.targetPatentCount || 0),
                    targetConsultancyCount: Number(planForm.targetConsultancyCount || 0),
                    targetStudentResearchCount: Number(planForm.targetStudentResearchCount || 0),
                    targetInnovationActivityCount: Number(planForm.targetInnovationActivityCount || 0),
                    facultyOwnerUserId: planForm.facultyOwnerUserId || undefined,
                    status: planForm.status,
                };

                const url = editingPlanId
                    ? `/api/admin/research-innovation/plans/${editingPlanId}`
                    : "/api/admin/research-innovation/plans";
                const method = editingPlanId ? "PUT" : "POST";
                const data = await requestJson<{ message?: string }>(url, {
                    method,
                    body: JSON.stringify(payload),
                });

                setMessage({
                    type: "success",
                    text:
                        data.message ??
                        (editingPlanId
                            ? "Research & innovation plan updated successfully."
                            : "Research & innovation plan created successfully."),
                });
                resetPlanForm();
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the research & innovation plan.",
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

                const url = editingAssignmentId
                    ? `/api/admin/research-innovation/assignments/${editingAssignmentId}`
                    : "/api/admin/research-innovation/assignments";
                const method = editingAssignmentId ? "PUT" : "POST";
                const data = await requestJson<{ message?: string }>(url, {
                    method,
                    body: JSON.stringify(payload),
                });

                setMessage({
                    type: "success",
                    text:
                        data.message ??
                        (editingAssignmentId
                            ? "Research & innovation assignment updated successfully."
                            : "Research & innovation assignment created successfully."),
                });
                resetAssignmentForm();
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the research & innovation assignment.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
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
                    placeholder="Search by title, scope, or assignee"
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
                <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {editingPlanId ? "Edit plan" : "Create research plan"}
                            </CardTitle>
                            <CardDescription>
                                Define the academic year, scope, targets, and accountable owner for a governed research and innovation portfolio.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Academic year</Label>
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
                                        {academicYearOptions.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.label}
                                                {item.isActive ? " (Active)" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Scope type</Label>
                                    <Select
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({ ...current, scopeType: value }))
                                        }
                                        value={planForm.scopeType}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select scope" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Department">Department</SelectItem>
                                            <SelectItem value="Institution">Institution</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Focus area</Label>
                                    <Select
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({ ...current, focusArea: value }))
                                        }
                                        value={planForm.focusArea}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select focus area" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Research">Research</SelectItem>
                                            <SelectItem value="Innovation">Innovation</SelectItem>
                                            <SelectItem value="Integrated">Integrated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Institution</Label>
                                <Select
                                    onValueChange={(value) =>
                                        setPlanForm((current) => ({ ...current, institutionId: value }))
                                    }
                                    value={planForm.institutionId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select institution" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {institutionOptions.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {planForm.scopeType === "Department" ? (
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Select
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({ ...current, departmentId: value }))
                                        }
                                        value={planForm.departmentId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredDepartmentOptions.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <Label>Plan title</Label>
                                <Input
                                    onChange={(event) =>
                                        setPlanForm((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="Research and innovation portfolio 2026"
                                    value={planForm.title}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Summary</Label>
                                <Textarea
                                    onChange={(event) =>
                                        setPlanForm((current) => ({ ...current, summary: event.target.value }))
                                    }
                                    placeholder="Short operating summary for the portfolio."
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
                                    placeholder="Expected research quality, innovation translation, startup support, and ecosystem priorities."
                                    rows={4}
                                    value={planForm.strategyGoals}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <MetricInput
                                    label="Publications target"
                                    onChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            targetPublicationCount: value,
                                        }))
                                    }
                                    value={planForm.targetPublicationCount}
                                />
                                <MetricInput
                                    label="Projects target"
                                    onChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            targetProjectCount: value,
                                        }))
                                    }
                                    value={planForm.targetProjectCount}
                                />
                                <MetricInput
                                    label="Patents target"
                                    onChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            targetPatentCount: value,
                                        }))
                                    }
                                    value={planForm.targetPatentCount}
                                />
                                <MetricInput
                                    label="Consultancy target"
                                    onChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            targetConsultancyCount: value,
                                        }))
                                    }
                                    value={planForm.targetConsultancyCount}
                                />
                                <MetricInput
                                    label="Student research target"
                                    onChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            targetStudentResearchCount: value,
                                        }))
                                    }
                                    value={planForm.targetStudentResearchCount}
                                />
                                <MetricInput
                                    label="Innovation activity target"
                                    onChange={(value) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            targetInnovationActivityCount: value,
                                        }))
                                    }
                                    value={planForm.targetInnovationActivityCount}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Faculty owner</Label>
                                    <Select
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({ ...current, facultyOwnerUserId: value }))
                                        }
                                        value={planForm.facultyOwnerUserId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Optional faculty owner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {userOptions.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.label}
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
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Draft">Draft</SelectItem>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Locked">Locked</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={isPending} onClick={savePlan} type="button">
                                    {editingPlanId ? "Update plan" : "Create plan"}
                                </Button>
                                <Button
                                    disabled={isPending}
                                    onClick={resetPlanForm}
                                    type="button"
                                    variant="outline"
                                >
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {filteredPlans.length ? (
                            filteredPlans.map((plan) => (
                                <Card key={plan._id}>
                                    <CardContent className="p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {planStatusBadge(plan.status)}
                                                    <Badge variant="secondary">{plan.scopeType}</Badge>
                                                    <Badge variant="outline">{plan.focusArea}</Badge>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold text-zinc-950">
                                                        {plan.title}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-zinc-500">
                                                        {plan.academicYearLabel} ·{" "}
                                                        {plan.scopeType === "Department"
                                                            ? plan.departmentName || "Department"
                                                            : plan.institutionName || "Institution"}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-zinc-600">
                                                    {plan.summary?.trim() || "No summary provided."}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    Targets: Publications {plan.targetPublicationCount} · Projects{" "}
                                                    {plan.targetProjectCount} · Patents {plan.targetPatentCount} · Consultancy{" "}
                                                    {plan.targetConsultancyCount} · Student Research{" "}
                                                    {plan.targetStudentResearchCount} · Innovation Activities{" "}
                                                    {plan.targetInnovationActivityCount}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-3 lg:items-end">
                                                <Button onClick={() => loadPlan(plan)} type="button" variant="outline">
                                                    Edit plan
                                                </Button>
                                                <p className="text-xs text-zinc-500">
                                                    Updated {formatDate(plan.updatedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <CardContent className="p-6 text-sm text-zinc-500">
                                    No research & innovation plans match the current filter.
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {editingAssignmentId ? "Edit assignment" : "Create assignment"}
                            </CardTitle>
                            <CardDescription>
                                Map one eligible faculty coordinator to each active research portfolio and set the working deadline.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                        {availablePlans.map((plan) => (
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
                                        setAssignmentForm((current) => ({ ...current, assigneeUserId: value }))
                                    }
                                    value={assignmentForm.assigneeUserId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select faculty contributor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userOptions.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.label}
                                                {item.email ? ` · ${item.email}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-zinc-500">
                                    Assignment is enforced server-side for scoped plan owners, research committee members, and active research coordinators only.
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
                                    placeholder="Contributor instructions, expected evidence, or review focus."
                                    rows={4}
                                    value={assignmentForm.notes}
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={isPending} onClick={saveAssignment} type="button">
                                    {editingAssignmentId ? "Update assignment" : "Create assignment"}
                                </Button>
                                <Button
                                    disabled={isPending}
                                    onClick={resetAssignmentForm}
                                    type="button"
                                    variant="outline"
                                >
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {filteredAssignments.length ? (
                            filteredAssignments.map((assignment) => (
                                <Card key={assignment._id}>
                                    <CardContent className="p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {assignmentStatusBadge(assignment.status)}
                                                    <Badge variant={assignment.isActive ? "secondary" : "outline"}>
                                                        {assignment.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold text-zinc-950">
                                                        {assignment.planTitle}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-zinc-500">
                                                        {assignment.assigneeName} · {assignment.assigneeEmail}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-zinc-600">
                                                    {assignment.notes?.trim() || "No assignment note provided."}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    Due {formatDate(assignment.dueDate)}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-3 lg:items-end">
                                                <Button
                                                    onClick={() => loadAssignment(assignment)}
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Edit assignment
                                                </Button>
                                                <p className="text-xs text-zinc-500">
                                                    Updated {formatDate(assignment.updatedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <CardContent className="p-6 text-sm text-zinc-500">
                                    No research & innovation assignments match the current filter.
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricInput({
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
            <Input min="0" onChange={(event) => onChange(event.target.value)} type="number" value={value} />
        </div>
    );
}
