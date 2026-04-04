"use client";

import { type ReactNode, useDeferredValue, useEffect, useState, useTransition } from "react";
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
    theme: string;
    institutionId?: string;
    institutionName?: string;
    departmentId?: string;
    departmentName?: string;
    overview?: string;
    strategicPriorities?: string;
    targetEnvironmentalRecords: number;
    targetInclusionRecords: number;
    targetEthicsRecords: number;
    targetOutreachPrograms: number;
    targetBestPractices: number;
    targetDistinctivenessNarratives: number;
    targetAuditCount: number;
    ownerUserId?: string;
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
    theme: string;
    overview: string;
    strategicPriorities: string;
    targetEnvironmentalRecords: string;
    targetInclusionRecords: string;
    targetEthicsRecords: string;
    targetOutreachPrograms: string;
    targetBestPractices: string;
    targetDistinctivenessNarratives: string;
    targetAuditCount: string;
    ownerUserId: string;
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
    theme: "Integrated",
    overview: "",
    strategicPriorities: "",
    targetEnvironmentalRecords: "0",
    targetInclusionRecords: "0",
    targetEthicsRecords: "0",
    targetOutreachPrograms: "0",
    targetBestPractices: "0",
    targetDistinctivenessNarratives: "0",
    targetAuditCount: "0",
    ownerUserId: "",
    status: "Draft",
};

const emptyAssignmentForm: AssignmentFormState = {
    planId: "",
    assigneeUserId: "",
    dueDate: "",
    notes: "",
    isActive: true,
};

const planThemes = [
    "Environment",
    "Inclusiveness",
    "Ethics",
    "Outreach",
    "BestPractices",
    "Distinctiveness",
    "Integrated",
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

function statusBadge(status: string) {
    if (status === "Approved" || status === "Active") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Rejected") {
        return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
    }

    if (["Submitted", "IQAC Review", "Leadership Review", "Governance Review", "Locked"].includes(status)) {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

export function InstitutionalValuesBestPracticesManager({
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
            plan.theme,
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
            theme: plan.theme,
            overview: plan.overview ?? "",
            strategicPriorities: plan.strategicPriorities ?? "",
            targetEnvironmentalRecords: String(plan.targetEnvironmentalRecords ?? 0),
            targetInclusionRecords: String(plan.targetInclusionRecords ?? 0),
            targetEthicsRecords: String(plan.targetEthicsRecords ?? 0),
            targetOutreachPrograms: String(plan.targetOutreachPrograms ?? 0),
            targetBestPractices: String(plan.targetBestPractices ?? 0),
            targetDistinctivenessNarratives: String(plan.targetDistinctivenessNarratives ?? 0),
            targetAuditCount: String(plan.targetAuditCount ?? 0),
            ownerUserId: plan.ownerUserId ?? "",
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
                    theme: planForm.theme,
                    overview: planForm.overview.trim(),
                    strategicPriorities: planForm.strategicPriorities.trim(),
                    targetEnvironmentalRecords: Number(planForm.targetEnvironmentalRecords || 0),
                    targetInclusionRecords: Number(planForm.targetInclusionRecords || 0),
                    targetEthicsRecords: Number(planForm.targetEthicsRecords || 0),
                    targetOutreachPrograms: Number(planForm.targetOutreachPrograms || 0),
                    targetBestPractices: Number(planForm.targetBestPractices || 0),
                    targetDistinctivenessNarratives: Number(planForm.targetDistinctivenessNarratives || 0),
                    targetAuditCount: Number(planForm.targetAuditCount || 0),
                    ownerUserId: planForm.ownerUserId || undefined,
                    status: planForm.status,
                };

                const data = await requestJson<{ message?: string }>(
                    editingPlanId
                        ? `/api/admin/institutional-values-best-practices/plans/${editingPlanId}`
                        : "/api/admin/institutional-values-best-practices/plans",
                    {
                        method: editingPlanId ? "PATCH" : "POST",
                        body: JSON.stringify(payload),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Institutional values plan saved successfully.",
                });
                resetPlanForm();
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the institutional values plan.",
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
                        ? `/api/admin/institutional-values-best-practices/assignments/${editingAssignmentId}`
                        : "/api/admin/institutional-values-best-practices/assignments",
                    {
                        method: editingAssignmentId ? "PATCH" : "POST",
                        body: JSON.stringify(payload),
                    }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Institutional values assignment saved successfully.",
                });
                resetAssignmentForm();
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the institutional values assignment.",
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
                    variant={tab === "plans" ? "default" : "secondary"}
                >
                    Plans
                </Button>
                <Button
                    onClick={() => setTab("assignments")}
                    type="button"
                    variant={tab === "assignments" ? "default" : "secondary"}
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
                <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingPlanId ? "Edit plan" : "Create plan"}</CardTitle>
                            <CardDescription>
                                Set up the governed Criteria 7 portfolio, owner, scope, and section targets.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Field label="Academic year">
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
                                                {option.isActive ? " · Active" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Scope">
                                    <Select
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                scopeType: value,
                                                departmentId: value === "Institution" ? "" : current.departmentId,
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
                                </Field>

                                <Field label="Theme">
                                    <Select
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({ ...current, theme: value }))
                                        }
                                        value={planForm.theme}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {planThemes.map((theme) => (
                                                <SelectItem key={theme} value={theme}>
                                                    {theme}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Institution">
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
                                </Field>

                                <Field label="Department">
                                    <Select
                                        disabled={planForm.scopeType !== "Department"}
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({ ...current, departmentId: value }))
                                        }
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
                                </Field>
                            </div>

                            <Field label="Plan title">
                                <Input
                                    onChange={(event) =>
                                        setPlanForm((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="Criteria 7 institutional values portfolio"
                                    value={planForm.title}
                                />
                            </Field>

                            <Field label="Overview">
                                <Textarea
                                    className="min-h-24"
                                    onChange={(event) =>
                                        setPlanForm((current) => ({ ...current, overview: event.target.value }))
                                    }
                                    placeholder="Summarize sustainability, inclusiveness, ethics, outreach, and distinctiveness priorities."
                                    value={planForm.overview}
                                />
                            </Field>

                            <Field label="Strategic priorities">
                                <Textarea
                                    className="min-h-24"
                                    onChange={(event) =>
                                        setPlanForm((current) => ({
                                            ...current,
                                            strategicPriorities: event.target.value,
                                        }))
                                    }
                                    placeholder="Capture SDG alignment, audit goals, outreach focus, or campus values priorities."
                                    value={planForm.strategicPriorities}
                                />
                            </Field>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Environmental target">
                                    <Input
                                        onChange={(event) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                targetEnvironmentalRecords: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        value={planForm.targetEnvironmentalRecords}
                                    />
                                </Field>
                                <Field label="Inclusion target">
                                    <Input
                                        onChange={(event) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                targetInclusionRecords: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        value={planForm.targetInclusionRecords}
                                    />
                                </Field>
                                <Field label="Ethics target">
                                    <Input
                                        onChange={(event) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                targetEthicsRecords: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        value={planForm.targetEthicsRecords}
                                    />
                                </Field>
                                <Field label="Outreach target">
                                    <Input
                                        onChange={(event) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                targetOutreachPrograms: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        value={planForm.targetOutreachPrograms}
                                    />
                                </Field>
                                <Field label="Best practices target">
                                    <Input
                                        onChange={(event) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                targetBestPractices: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        value={planForm.targetBestPractices}
                                    />
                                </Field>
                                <Field label="Distinctiveness target">
                                    <Input
                                        onChange={(event) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                targetDistinctivenessNarratives: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        value={planForm.targetDistinctivenessNarratives}
                                    />
                                </Field>
                                <Field label="Audit target">
                                    <Input
                                        onChange={(event) =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                targetAuditCount: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        value={planForm.targetAuditCount}
                                    />
                                </Field>
                                <Field label="Owner">
                                    <Select
                                        onValueChange={(value) =>
                                            setPlanForm((current) => ({ ...current, ownerUserId: value }))
                                        }
                                        value={planForm.ownerUserId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select owner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {userOptions.map((option) => (
                                                <SelectItem key={option.id} value={option.id}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>

                            <Field label="Status">
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
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Locked">Locked</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={isPending} onClick={submitPlan} type="button">
                                    {editingPlanId ? "Update plan" : "Create plan"}
                                </Button>
                                {(editingPlanId || planForm.title || planForm.overview) && (
                                    <Button
                                        disabled={isPending}
                                        onClick={resetPlanForm}
                                        type="button"
                                        variant="secondary"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Configured plans</CardTitle>
                            <CardDescription>
                                Review scope, targets, and lifecycle status for every Criteria 7 portfolio.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {filteredPlans.length ? (
                                filteredPlans.map((plan) => (
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={plan._id}>
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                                                    {plan.theme} · {plan.scopeType}
                                                </p>
                                                <h3 className="mt-2 text-base font-semibold text-zinc-950">
                                                    {plan.title}
                                                </h3>
                                                <p className="mt-1 text-sm text-zinc-500">
                                                    {plan.departmentName || plan.institutionName || "Scope pending"} ·{" "}
                                                    {plan.academicYearLabel}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {statusBadge(plan.status)}
                                                <Button
                                                    onClick={() => setEditingPlanId(plan._id)}
                                                    size="sm"
                                                    type="button"
                                                    variant="secondary"
                                                >
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>
                                        {plan.overview ? (
                                            <p className="mt-3 text-sm leading-6 text-zinc-600">{plan.overview}</p>
                                        ) : null}
                                        <p className="mt-3 text-xs text-zinc-500">
                                            Targets: Env {plan.targetEnvironmentalRecords} · Inclusion{" "}
                                            {plan.targetInclusionRecords} · Ethics {plan.targetEthicsRecords} · Outreach{" "}
                                            {plan.targetOutreachPrograms} · Best Practices {plan.targetBestPractices} ·
                                            Distinctiveness {plan.targetDistinctivenessNarratives} · Audits{" "}
                                            {plan.targetAuditCount}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <EmptyState text="No plans matched your search." />
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingAssignmentId ? "Edit assignment" : "Create assignment"}</CardTitle>
                            <CardDescription>
                                Map an eligible institutional-values owner to a live plan with due dates and scope-safe governance controls.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Field label="Plan">
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
                            </Field>

                            <Field label="Assignee">
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
                                        <SelectValue placeholder="Select assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Due date">
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
                            </Field>

                            <Field label="Notes">
                                <Textarea
                                    className="min-h-24"
                                    onChange={(event) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            notes: event.target.value,
                                        }))
                                    }
                                    placeholder="Add assignment notes, expectations, or evidence deadlines."
                                    value={assignmentForm.notes}
                                />
                            </Field>

                            <div className="flex items-center gap-3">
                                <input
                                    checked={assignmentForm.isActive}
                                    className="h-4 w-4 rounded border-zinc-300"
                                    onChange={(event) =>
                                        setAssignmentForm((current) => ({
                                            ...current,
                                            isActive: event.target.checked,
                                        }))
                                    }
                                    type="checkbox"
                                />
                                <Label className="mb-0">Assignment is active</Label>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={isPending} onClick={submitAssignment} type="button">
                                    {editingAssignmentId ? "Update assignment" : "Create assignment"}
                                </Button>
                                {(editingAssignmentId || assignmentForm.planId || assignmentForm.assigneeUserId) && (
                                    <Button
                                        disabled={isPending}
                                        onClick={resetAssignmentForm}
                                        type="button"
                                        variant="secondary"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Active assignments</CardTitle>
                            <CardDescription>
                                Track mapped owners, due dates, and workflow status for each live Criteria 7 record.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {filteredAssignments.length ? (
                                filteredAssignments.map((assignment) => (
                                    <div
                                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                                        key={assignment._id}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-base font-semibold text-zinc-950">
                                                    {assignment.planTitle}
                                                </h3>
                                                <p className="mt-1 text-sm text-zinc-500">
                                                    {assignment.assigneeName} · {assignment.assigneeEmail}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {statusBadge(assignment.status)}
                                                <Badge variant="secondary">
                                                    {assignment.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                                <Button
                                                    onClick={() => setEditingAssignmentId(assignment._id)}
                                                    size="sm"
                                                    type="button"
                                                    variant="secondary"
                                                >
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-sm text-zinc-600">
                                            Due: {formatDate(assignment.dueDate)} {assignment.notes ? `· ${assignment.notes}` : ""}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <EmptyState text="No assignments matched your search." />
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            {text}
        </div>
    );
}
