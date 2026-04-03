"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Option = {
    id: string;
    label: string;
    isActive?: boolean;
};

type UserOption = {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
};

type CycleRecord = {
    _id: string;
    title: string;
    code: string;
    framework: string;
    description?: string;
    status: string;
    institutionId?: string;
    institutionName?: string;
    academicYearId?: string;
    academicYearLabel?: string;
    submissionWindowStart?: string | Date;
    submissionWindowEnd?: string | Date;
};

type CriterionRecord = {
    _id: string;
    cycleId: string;
    cycleTitle: string;
    criterionCode: string;
    title: string;
    description?: string;
    weightage?: number;
    displayOrder: number;
    isActive: boolean;
};

type MetricRecord = {
    _id: string;
    cycleId: string;
    criterionId: string;
    criterionCode: string;
    criterionTitle: string;
    metricCode: string;
    title: string;
    description?: string;
    instructions?: string;
    metricType: string;
    dataType: string;
    ownershipScope: string;
    sourceModule?: string;
    benchmarkValue?: string;
    unitLabel?: string;
    evidenceMode: string;
    allowedContributorRoles: string[];
    displayOrder: number;
    isActive: boolean;
};

type SectionRecord = {
    _id: string;
    cycleId: string;
    criterionId: string;
    metricId: string;
    metricCode: string;
    metricTitle: string;
    sectionKey: string;
    title: string;
    prompt: string;
    guidance?: string;
    wordLimitMin?: number;
    wordLimitMax?: number;
    displayOrder: number;
    isActive: boolean;
};

type AssignmentRecord = {
    _id: string;
    cycleId: string;
    cycleTitle: string;
    criterionId: string;
    criterionCode: string;
    criterionTitle: string;
    metricId: string;
    metricCode: string;
    metricTitle: string;
    sectionId?: string;
    sectionTitle?: string;
    assigneeUserId: string;
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    dueDate?: string | Date;
    notes?: string;
    status: string;
    isActive: boolean;
    scopeDepartmentName?: string;
    scopeUniversityName?: string;
    updatedAt?: string | Date;
};

type ResponseRecord = {
    _id: string;
    assignmentId: string;
    cycleTitle: string;
    criterionCode: string;
    metricCode: string;
    metricTitle: string;
    sectionTitle?: string;
    contributorName: string;
    contributorEmail: string;
    contributorRole: string;
    status: string;
    version: number;
    submittedAt?: string | Date;
    reviewedAt?: string | Date;
    approvedAt?: string | Date;
    supportingLinkCount: number;
    documentCount: number;
    updatedAt?: string | Date;
    reviewRemarks?: string;
};

const contributorRoleOptions = [
    "Faculty",
    "Student",
    "Alumni",
    "Admin",
    "Director",
    "PRO",
    "NSS",
    "Sports",
    "Swayam",
    "Placement",
] as const;

const cycleStatusOptions = ["Draft", "Active", "Review", "Locked", "Archived"] as const;
const metricTypeOptions = ["Quantitative", "Qualitative"] as const;
const dataTypeOptions = [
    "Narrative",
    "Number",
    "Percentage",
    "Currency",
    "Boolean",
    "Date",
    "Text",
    "Json",
] as const;
const ownershipScopeOptions = [
    "Institution",
    "Department",
    "Program",
    "Office",
    "Faculty",
    "Student",
    "Shared",
] as const;
const evidenceModeOptions = ["Required", "Optional", "NotApplicable"] as const;
const emptySelectValue = "__none__";

function normalizeDateInput(value?: string | Date) {
    if (!value) {
        return "";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return parsed.toISOString().slice(0, 10);
}

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

export function SsrManager({
    cycles,
    criteria,
    metrics,
    sections,
    assignments,
    responses,
    institutionOptions,
    academicYearOptions,
    userOptions,
}: {
    cycles: CycleRecord[];
    criteria: CriterionRecord[];
    metrics: MetricRecord[];
    sections: SectionRecord[];
    assignments: AssignmentRecord[];
    responses: ResponseRecord[];
    institutionOptions: Option[];
    academicYearOptions: Option[];
    userOptions: UserOption[];
}) {
    const router = useRouter();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
    const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
    const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

    const [cycleForm, setCycleForm] = useState({
        institutionId: "",
        academicYearId: "",
        title: "",
        code: "",
        framework: "NAAC_SSR",
        description: "",
        status: "Draft",
        submissionWindowStart: "",
        submissionWindowEnd: "",
    });
    const [criterionForm, setCriterionForm] = useState({
        cycleId: cycles[0]?._id ?? "",
        criterionCode: "",
        title: "",
        description: "",
        weightage: "",
        displayOrder: "1",
        isActive: true,
    });
    const [metricForm, setMetricForm] = useState({
        cycleId: cycles[0]?._id ?? "",
        criterionId: criteria[0]?._id ?? "",
        metricCode: "",
        title: "",
        description: "",
        instructions: "",
        metricType: "Quantitative",
        dataType: "Narrative",
        ownershipScope: "Department",
        sourceModule: "",
        benchmarkValue: "",
        unitLabel: "",
        evidenceMode: "Optional",
        allowedContributorRoles: ["Faculty"] as string[],
        displayOrder: "1",
        isActive: true,
    });
    const [sectionForm, setSectionForm] = useState({
        cycleId: cycles[0]?._id ?? "",
        criterionId: criteria[0]?._id ?? "",
        metricId: metrics[0]?._id ?? "",
        sectionKey: "",
        title: "",
        prompt: "",
        guidance: "",
        wordLimitMin: "",
        wordLimitMax: "",
        displayOrder: "1",
        isActive: true,
    });
    const [assignmentForm, setAssignmentForm] = useState({
        cycleId: cycles[0]?._id ?? "",
        criterionId: criteria[0]?._id ?? "",
        metricId: metrics[0]?._id ?? "",
        sectionId: "",
        assigneeUserId: userOptions[0]?.id ?? "",
        dueDate: "",
        notes: "",
        isActive: true,
    });

    const filteredCriteria = useMemo(
        () => criteria.filter((item) => item.cycleId === metricForm.cycleId),
        [criteria, metricForm.cycleId]
    );
    const filteredSectionCriteria = useMemo(
        () => criteria.filter((item) => item.cycleId === sectionForm.cycleId),
        [criteria, sectionForm.cycleId]
    );
    const filteredAssignmentCriteria = useMemo(
        () => criteria.filter((item) => item.cycleId === assignmentForm.cycleId),
        [criteria, assignmentForm.cycleId]
    );
    const filteredMetrics = useMemo(
        () => metrics.filter((item) => item.criterionId === sectionForm.criterionId),
        [metrics, sectionForm.criterionId]
    );
    const filteredAssignmentMetrics = useMemo(
        () => metrics.filter((item) => item.criterionId === assignmentForm.criterionId),
        [metrics, assignmentForm.criterionId]
    );
    const filteredSections = useMemo(
        () => sections.filter((item) => item.metricId === assignmentForm.metricId),
        [sections, assignmentForm.metricId]
    );

    function showSuccess(text: string) {
        setMessage({ type: "success", text });
    }

    function showError(error: unknown, fallback: string) {
        setMessage({
            type: "error",
            text: error instanceof Error ? error.message : fallback,
        });
    }

    function resetCycleForm() {
        setEditingCycleId(null);
        setCycleForm({
            institutionId: "",
            academicYearId: "",
            title: "",
            code: "",
            framework: "NAAC_SSR",
            description: "",
            status: "Draft",
            submissionWindowStart: "",
            submissionWindowEnd: "",
        });
    }

    function resetCriterionForm() {
        setEditingCriterionId(null);
        setCriterionForm({
            cycleId: cycles[0]?._id ?? "",
            criterionCode: "",
            title: "",
            description: "",
            weightage: "",
            displayOrder: "1",
            isActive: true,
        });
    }

    function resetMetricForm() {
        setEditingMetricId(null);
        setMetricForm({
            cycleId: cycles[0]?._id ?? "",
            criterionId: criteria[0]?._id ?? "",
            metricCode: "",
            title: "",
            description: "",
            instructions: "",
            metricType: "Quantitative",
            dataType: "Narrative",
            ownershipScope: "Department",
            sourceModule: "",
            benchmarkValue: "",
            unitLabel: "",
            evidenceMode: "Optional",
            allowedContributorRoles: ["Faculty"],
            displayOrder: "1",
            isActive: true,
        });
    }

    function resetSectionForm() {
        setEditingSectionId(null);
        setSectionForm({
            cycleId: cycles[0]?._id ?? "",
            criterionId: criteria[0]?._id ?? "",
            metricId: metrics[0]?._id ?? "",
            sectionKey: "",
            title: "",
            prompt: "",
            guidance: "",
            wordLimitMin: "",
            wordLimitMax: "",
            displayOrder: "1",
            isActive: true,
        });
    }

    function resetAssignmentForm() {
        setEditingAssignmentId(null);
        setAssignmentForm({
            cycleId: cycles[0]?._id ?? "",
            criterionId: criteria[0]?._id ?? "",
            metricId: metrics[0]?._id ?? "",
            sectionId: "",
            assigneeUserId: userOptions[0]?.id ?? "",
            dueDate: "",
            notes: "",
            isActive: true,
        });
    }

    function editCycle(item: CycleRecord) {
        setEditingCycleId(item._id);
        setCycleForm({
            institutionId: item.institutionId ?? "",
            academicYearId: item.academicYearId ?? "",
            title: item.title,
            code: item.code,
            framework: item.framework,
            description: item.description ?? "",
            status: item.status,
            submissionWindowStart: normalizeDateInput(item.submissionWindowStart),
            submissionWindowEnd: normalizeDateInput(item.submissionWindowEnd),
        });
    }

    function editCriterion(item: CriterionRecord) {
        setEditingCriterionId(item._id);
        setCriterionForm({
            cycleId: item.cycleId,
            criterionCode: item.criterionCode,
            title: item.title,
            description: item.description ?? "",
            weightage: item.weightage?.toString() ?? "",
            displayOrder: String(item.displayOrder),
            isActive: item.isActive,
        });
    }

    function editMetric(item: MetricRecord) {
        setEditingMetricId(item._id);
        setMetricForm({
            cycleId: item.cycleId,
            criterionId: item.criterionId,
            metricCode: item.metricCode,
            title: item.title,
            description: item.description ?? "",
            instructions: item.instructions ?? "",
            metricType: item.metricType,
            dataType: item.dataType,
            ownershipScope: item.ownershipScope,
            sourceModule: item.sourceModule ?? "",
            benchmarkValue: item.benchmarkValue ?? "",
            unitLabel: item.unitLabel ?? "",
            evidenceMode: item.evidenceMode,
            allowedContributorRoles: item.allowedContributorRoles,
            displayOrder: String(item.displayOrder),
            isActive: item.isActive,
        });
    }

    function editSection(item: SectionRecord) {
        setEditingSectionId(item._id);
        setSectionForm({
            cycleId: item.cycleId,
            criterionId: item.criterionId,
            metricId: item.metricId,
            sectionKey: item.sectionKey,
            title: item.title,
            prompt: item.prompt,
            guidance: item.guidance ?? "",
            wordLimitMin: item.wordLimitMin?.toString() ?? "",
            wordLimitMax: item.wordLimitMax?.toString() ?? "",
            displayOrder: String(item.displayOrder),
            isActive: item.isActive,
        });
    }

    function editAssignment(item: AssignmentRecord) {
        setEditingAssignmentId(item._id);
        setAssignmentForm({
            cycleId: item.cycleId,
            criterionId: item.criterionId,
            metricId: item.metricId,
            sectionId: item.sectionId ?? "",
            assigneeUserId: item.assigneeUserId,
            dueDate: normalizeDateInput(item.dueDate),
            notes: item.notes ?? "",
            isActive: item.isActive,
        });
    }

    function submitCycle(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
            try {
                const url = editingCycleId
                    ? `/api/admin/ssr/cycles/${editingCycleId}`
                    : "/api/admin/ssr/cycles";
                const method = editingCycleId ? "PATCH" : "POST";

                await requestJson(url, {
                    method,
                    body: JSON.stringify({
                        ...cycleForm,
                        institutionId:
                            cycleForm.institutionId === emptySelectValue ? "" : cycleForm.institutionId,
                        academicYearId:
                            cycleForm.academicYearId === emptySelectValue ? "" : cycleForm.academicYearId,
                    }),
                });

                showSuccess(editingCycleId ? "SSR cycle updated." : "SSR cycle created.");
                resetCycleForm();
                router.refresh();
            } catch (error) {
                showError(error, "Unable to save SSR cycle.");
            }
        });
    }

    function submitCriterion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
            try {
                const url = editingCriterionId
                    ? `/api/admin/ssr/criteria/${editingCriterionId}`
                    : "/api/admin/ssr/criteria";
                const method = editingCriterionId ? "PATCH" : "POST";

                await requestJson(url, {
                    method,
                    body: JSON.stringify({
                        ...criterionForm,
                        weightage: criterionForm.weightage || undefined,
                    }),
                });

                showSuccess(editingCriterionId ? "SSR criterion updated." : "SSR criterion created.");
                resetCriterionForm();
                router.refresh();
            } catch (error) {
                showError(error, "Unable to save SSR criterion.");
            }
        });
    }

    function toggleContributorRole(role: string, checked: boolean) {
        setMetricForm((current) => ({
            ...current,
            allowedContributorRoles: checked
                ? Array.from(new Set([...current.allowedContributorRoles, role]))
                : current.allowedContributorRoles.filter((item) => item !== role),
        }));
    }

    function submitMetric(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
            try {
                const url = editingMetricId
                    ? `/api/admin/ssr/metrics/${editingMetricId}`
                    : "/api/admin/ssr/metrics";
                const method = editingMetricId ? "PATCH" : "POST";

                await requestJson(url, {
                    method,
                    body: JSON.stringify(metricForm),
                });

                showSuccess(editingMetricId ? "SSR metric updated." : "SSR metric created.");
                resetMetricForm();
                router.refresh();
            } catch (error) {
                showError(error, "Unable to save SSR metric.");
            }
        });
    }

    function submitSection(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
            try {
                const url = editingSectionId
                    ? `/api/admin/ssr/sections/${editingSectionId}`
                    : "/api/admin/ssr/sections";
                const method = editingSectionId ? "PATCH" : "POST";

                await requestJson(url, {
                    method,
                    body: JSON.stringify({
                        ...sectionForm,
                        wordLimitMin: sectionForm.wordLimitMin || undefined,
                        wordLimitMax: sectionForm.wordLimitMax || undefined,
                    }),
                });

                showSuccess(editingSectionId ? "SSR section updated." : "SSR section created.");
                resetSectionForm();
                router.refresh();
            } catch (error) {
                showError(error, "Unable to save SSR section.");
            }
        });
    }

    function submitAssignment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
            try {
                const url = editingAssignmentId
                    ? `/api/admin/ssr/assignments/${editingAssignmentId}`
                    : "/api/admin/ssr/assignments";
                const method = editingAssignmentId ? "PATCH" : "POST";

                await requestJson(url, {
                    method,
                    body: JSON.stringify({
                        ...assignmentForm,
                        sectionId:
                            assignmentForm.sectionId === emptySelectValue ? "" : assignmentForm.sectionId,
                    }),
                });

                showSuccess(editingAssignmentId ? "SSR assignment updated." : "SSR assignment created.");
                resetAssignmentForm();
                router.refresh();
            } catch (error) {
                showError(error, "Unable to save SSR assignment.");
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

            <Tabs defaultValue="cycles" className="space-y-6">
                <TabsList className="flex w-full flex-wrap justify-start gap-2">
                    <TabsTrigger value="cycles">Cycles</TabsTrigger>
                    <TabsTrigger value="metrics">Criteria & Metrics</TabsTrigger>
                    <TabsTrigger value="sections">Sections & Assignments</TabsTrigger>
                    <TabsTrigger value="submissions">Submissions</TabsTrigger>
                </TabsList>

                <TabsContent value="cycles" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingCycleId ? "Edit SSR Cycle" : "Create SSR Cycle"}</CardTitle>
                            <CardDescription>
                                Configure the accreditation cycle, academic year, framework, and submission window.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={submitCycle}>
                                <div className="space-y-2">
                                    <Label>Institution</Label>
                                    <Select
                                        value={cycleForm.institutionId || emptySelectValue}
                                        onValueChange={(value) =>
                                            setCycleForm((current) => ({
                                                ...current,
                                                institutionId: value === emptySelectValue ? "" : value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All institutions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={emptySelectValue}>All institutions</SelectItem>
                                            {institutionOptions.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Academic Year</Label>
                                    <Select
                                        value={cycleForm.academicYearId || emptySelectValue}
                                        onValueChange={(value) =>
                                            setCycleForm((current) => ({
                                                ...current,
                                                academicYearId: value === emptySelectValue ? "" : value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select academic year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={emptySelectValue}>Not linked</SelectItem>
                                            {academicYearOptions.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={cycleForm.title}
                                        onChange={(event) =>
                                            setCycleForm((current) => ({ ...current, title: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={cycleForm.code}
                                        onChange={(event) =>
                                            setCycleForm((current) => ({ ...current, code: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Framework</Label>
                                    <Input
                                        value={cycleForm.framework}
                                        onChange={(event) =>
                                            setCycleForm((current) => ({ ...current, framework: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={cycleForm.status}
                                        onValueChange={(value) =>
                                            setCycleForm((current) => ({ ...current, status: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cycleStatusOptions.map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Submission Start</Label>
                                    <Input
                                        type="date"
                                        value={cycleForm.submissionWindowStart}
                                        onChange={(event) =>
                                            setCycleForm((current) => ({
                                                ...current,
                                                submissionWindowStart: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Submission End</Label>
                                    <Input
                                        type="date"
                                        value={cycleForm.submissionWindowEnd}
                                        onChange={(event) =>
                                            setCycleForm((current) => ({
                                                ...current,
                                                submissionWindowEnd: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={cycleForm.description}
                                        onChange={(event) =>
                                            setCycleForm((current) => ({
                                                ...current,
                                                description: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {editingCycleId ? "Update Cycle" : "Create Cycle"}
                                    </Button>
                                    {editingCycleId ? (
                                        <Button type="button" variant="outline" onClick={resetCycleForm}>
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Configured Cycles</CardTitle>
                            <CardDescription>
                                Active and draft SSR cycles that drive all criteria, metric assignments, and submissions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cycle</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Institution</TableHead>
                                        <TableHead>Academic Year</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cycles.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell>
                                                <div className="font-medium">{item.title}</div>
                                                <div className="text-xs text-zinc-500">{item.code}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.status}</Badge>
                                            </TableCell>
                                            <TableCell>{item.institutionName || "All institutions"}</TableCell>
                                            <TableCell>{item.academicYearLabel || "Not linked"}</TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => editCycle(item)}>
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingCriterionId ? "Edit Criterion" : "Create Criterion"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={submitCriterion}>
                                <div className="space-y-2">
                                    <Label>Cycle</Label>
                                    <Select
                                        value={criterionForm.cycleId}
                                        onValueChange={(value) =>
                                            setCriterionForm((current) => ({ ...current, cycleId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cycles.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Criterion Code</Label>
                                    <Input
                                        value={criterionForm.criterionCode}
                                        onChange={(event) =>
                                            setCriterionForm((current) => ({
                                                ...current,
                                                criterionCode: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={criterionForm.title}
                                        onChange={(event) =>
                                            setCriterionForm((current) => ({ ...current, title: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Weightage</Label>
                                    <Input
                                        type="number"
                                        value={criterionForm.weightage}
                                        onChange={(event) =>
                                            setCriterionForm((current) => ({
                                                ...current,
                                                weightage: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Display Order</Label>
                                    <Input
                                        type="number"
                                        value={criterionForm.displayOrder}
                                        onChange={(event) =>
                                            setCriterionForm((current) => ({
                                                ...current,
                                                displayOrder: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-7">
                                    <Checkbox
                                        checked={criterionForm.isActive}
                                        onCheckedChange={(checked) =>
                                            setCriterionForm((current) => ({
                                                ...current,
                                                isActive: checked === true,
                                            }))
                                        }
                                    />
                                    <Label>Active</Label>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={criterionForm.description}
                                        onChange={(event) =>
                                            setCriterionForm((current) => ({
                                                ...current,
                                                description: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {editingCriterionId ? "Update Criterion" : "Create Criterion"}
                                    </Button>
                                    {editingCriterionId ? (
                                        <Button type="button" variant="outline" onClick={resetCriterionForm}>
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{editingMetricId ? "Edit Metric" : "Create Metric"}</CardTitle>
                            <CardDescription>
                                Define the NAAC/NIRF-aligned data point, input type, ownership, and who is eligible to contribute.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={submitMetric}>
                                <div className="space-y-2">
                                    <Label>Cycle</Label>
                                    <Select
                                        value={metricForm.cycleId}
                                        onValueChange={(value) =>
                                            setMetricForm((current) => ({ ...current, cycleId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cycles.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Criterion</Label>
                                    <Select
                                        value={metricForm.criterionId}
                                        onValueChange={(value) =>
                                            setMetricForm((current) => ({ ...current, criterionId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredCriteria.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.criterionCode} · {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Metric Code</Label>
                                    <Input
                                        value={metricForm.metricCode}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                metricCode: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={metricForm.title}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({ ...current, title: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Metric Type</Label>
                                    <Select
                                        value={metricForm.metricType}
                                        onValueChange={(value) =>
                                            setMetricForm((current) => ({ ...current, metricType: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {metricTypeOptions.map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Data Type</Label>
                                    <Select
                                        value={metricForm.dataType}
                                        onValueChange={(value) =>
                                            setMetricForm((current) => ({ ...current, dataType: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dataTypeOptions.map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ownership Scope</Label>
                                    <Select
                                        value={metricForm.ownershipScope}
                                        onValueChange={(value) =>
                                            setMetricForm((current) => ({ ...current, ownershipScope: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ownershipScopeOptions.map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Evidence Mode</Label>
                                    <Select
                                        value={metricForm.evidenceMode}
                                        onValueChange={(value) =>
                                            setMetricForm((current) => ({ ...current, evidenceMode: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {evidenceModeOptions.map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Source Module</Label>
                                    <Input
                                        value={metricForm.sourceModule}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                sourceModule: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Benchmark</Label>
                                    <Input
                                        value={metricForm.benchmarkValue}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                benchmarkValue: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit Label</Label>
                                    <Input
                                        value={metricForm.unitLabel}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                unitLabel: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Display Order</Label>
                                    <Input
                                        type="number"
                                        value={metricForm.displayOrder}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                displayOrder: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-7">
                                    <Checkbox
                                        checked={metricForm.isActive}
                                        onCheckedChange={(checked) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                isActive: checked === true,
                                            }))
                                        }
                                    />
                                    <Label>Active</Label>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={metricForm.description}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                description: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Contributor Instructions</Label>
                                    <Textarea
                                        value={metricForm.instructions}
                                        onChange={(event) =>
                                            setMetricForm((current) => ({
                                                ...current,
                                                instructions: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <Label>Eligible Contributor Roles</Label>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {contributorRoleOptions.map((role) => (
                                            <label
                                                key={role}
                                                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2"
                                            >
                                                <Checkbox
                                                    checked={metricForm.allowedContributorRoles.includes(role)}
                                                    onCheckedChange={(checked) =>
                                                        toggleContributorRole(role, checked === true)
                                                    }
                                                />
                                                <span className="text-sm">{role}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {editingMetricId ? "Update Metric" : "Create Metric"}
                                    </Button>
                                    {editingMetricId ? (
                                        <Button type="button" variant="outline" onClick={resetMetricForm}>
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Criteria and Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {criteria.map((item) => (
                                    <div
                                        key={item._id}
                                        className="rounded-lg border border-zinc-200 p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium text-zinc-950">
                                                    {item.criterionCode} · {item.title}
                                                </p>
                                                <p className="text-sm text-zinc-500">{item.cycleTitle}</p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => editCriterion(item)}>
                                                Edit
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead>Ownership</TableHead>
                                        <TableHead>Data Type</TableHead>
                                        <TableHead>Evidence</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {metrics.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {item.metricCode} · {item.title}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {item.criterionCode} · {item.criterionTitle}
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.ownershipScope}</TableCell>
                                            <TableCell>{item.dataType}</TableCell>
                                            <TableCell>{item.evidenceMode}</TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => editMetric(item)}>
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sections" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingSectionId ? "Edit Section" : "Create Section"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={submitSection}>
                                <div className="space-y-2">
                                    <Label>Cycle</Label>
                                    <Select
                                        value={sectionForm.cycleId}
                                        onValueChange={(value) =>
                                            setSectionForm((current) => ({ ...current, cycleId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cycles.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Criterion</Label>
                                    <Select
                                        value={sectionForm.criterionId}
                                        onValueChange={(value) =>
                                            setSectionForm((current) => ({ ...current, criterionId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredSectionCriteria.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.criterionCode} · {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Metric</Label>
                                    <Select
                                        value={sectionForm.metricId}
                                        onValueChange={(value) =>
                                            setSectionForm((current) => ({ ...current, metricId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredMetrics.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.metricCode} · {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Section Key</Label>
                                    <Input
                                        value={sectionForm.sectionKey}
                                        onChange={(event) =>
                                            setSectionForm((current) => ({
                                                ...current,
                                                sectionKey: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Section Title</Label>
                                    <Input
                                        value={sectionForm.title}
                                        onChange={(event) =>
                                            setSectionForm((current) => ({ ...current, title: event.target.value }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Display Order</Label>
                                    <Input
                                        type="number"
                                        value={sectionForm.displayOrder}
                                        onChange={(event) =>
                                            setSectionForm((current) => ({
                                                ...current,
                                                displayOrder: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Minimum Words</Label>
                                    <Input
                                        type="number"
                                        value={sectionForm.wordLimitMin}
                                        onChange={(event) =>
                                            setSectionForm((current) => ({
                                                ...current,
                                                wordLimitMin: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Maximum Words</Label>
                                    <Input
                                        type="number"
                                        value={sectionForm.wordLimitMax}
                                        onChange={(event) =>
                                            setSectionForm((current) => ({
                                                ...current,
                                                wordLimitMax: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-7">
                                    <Checkbox
                                        checked={sectionForm.isActive}
                                        onCheckedChange={(checked) =>
                                            setSectionForm((current) => ({
                                                ...current,
                                                isActive: checked === true,
                                            }))
                                        }
                                    />
                                    <Label>Active</Label>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Prompt</Label>
                                    <Textarea
                                        value={sectionForm.prompt}
                                        onChange={(event) =>
                                            setSectionForm((current) => ({
                                                ...current,
                                                prompt: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Guidance</Label>
                                    <Textarea
                                        value={sectionForm.guidance}
                                        onChange={(event) =>
                                            setSectionForm((current) => ({
                                                ...current,
                                                guidance: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {editingSectionId ? "Update Section" : "Create Section"}
                                    </Button>
                                    {editingSectionId ? (
                                        <Button type="button" variant="outline" onClick={resetSectionForm}>
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{editingAssignmentId ? "Edit Assignment" : "Create Assignment"}</CardTitle>
                            <CardDescription>
                                Assign an eligible contributor to a metric or section. Only assigned contributors can enter data.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={submitAssignment}>
                                <div className="space-y-2">
                                    <Label>Cycle</Label>
                                    <Select
                                        value={assignmentForm.cycleId}
                                        onValueChange={(value) =>
                                            setAssignmentForm((current) => ({ ...current, cycleId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cycles.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Criterion</Label>
                                    <Select
                                        value={assignmentForm.criterionId}
                                        onValueChange={(value) =>
                                            setAssignmentForm((current) => ({ ...current, criterionId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredAssignmentCriteria.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.criterionCode} · {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Metric</Label>
                                    <Select
                                        value={assignmentForm.metricId}
                                        onValueChange={(value) =>
                                            setAssignmentForm((current) => ({ ...current, metricId: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredAssignmentMetrics.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.metricCode} · {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Section</Label>
                                    <Select
                                        value={assignmentForm.sectionId || emptySelectValue}
                                        onValueChange={(value) =>
                                            setAssignmentForm((current) => ({
                                                ...current,
                                                sectionId: value === emptySelectValue ? "" : value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Whole metric" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={emptySelectValue}>Whole metric</SelectItem>
                                            {filteredSections.map((item) => (
                                                <SelectItem key={item._id} value={item._id}>
                                                    {item.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Assignee</Label>
                                    <Select
                                        value={assignmentForm.assigneeUserId}
                                        onValueChange={(value) =>
                                            setAssignmentForm((current) => ({
                                                ...current,
                                                assigneeUserId: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {userOptions.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name} · {item.role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={assignmentForm.dueDate}
                                        onChange={(event) =>
                                            setAssignmentForm((current) => ({
                                                ...current,
                                                dueDate: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-7">
                                    <Checkbox
                                        checked={assignmentForm.isActive}
                                        onCheckedChange={(checked) =>
                                            setAssignmentForm((current) => ({
                                                ...current,
                                                isActive: checked === true,
                                            }))
                                        }
                                    />
                                    <Label>Active</Label>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Notes</Label>
                                    <Textarea
                                        value={assignmentForm.notes}
                                        onChange={(event) =>
                                            setAssignmentForm((current) => ({
                                                ...current,
                                                notes: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {editingAssignmentId ? "Update Assignment" : "Create Assignment"}
                                    </Button>
                                    {editingAssignmentId ? (
                                        <Button type="button" variant="outline" onClick={resetAssignmentForm}>
                                            Cancel
                                        </Button>
                                    ) : null}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Sections and Assignments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Section</TableHead>
                                        <TableHead>Metric</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sections.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell>
                                                <div className="font-medium">{item.title}</div>
                                                <div className="text-xs text-zinc-500">{item.sectionKey}</div>
                                            </TableCell>
                                            <TableCell>
                                                {item.metricCode} · {item.metricTitle}
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => editSection(item)}>
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Assignment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Assignee</TableHead>
                                        <TableHead>Due</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignments.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {item.metricCode} · {item.metricTitle}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {item.sectionTitle || "Whole metric"} · {item.criterionCode}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>{item.assigneeName}</div>
                                                <div className="text-xs text-zinc-500">{item.assigneeRole}</div>
                                            </TableCell>
                                            <TableCell>{normalizeDateInput(item.dueDate) || "Not set"}</TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => editAssignment(item)}>
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="submissions" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Submission register</CardTitle>
                            <CardDescription>
                                Use this tab for a quick submission register. The full reviewer workspace on the admin SSR page includes the complete narrative, evidence, and workflow history needed for production review decisions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm leading-6 text-zinc-500">
                            Review actions are intentionally handled in the dedicated reviewer workspace below this manager so approvers can inspect the actual response payload, supporting links, and uploaded documents before moving the workflow.
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Submitted Responses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead>Contributor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Evidence</TableHead>
                                        <TableHead>Updated</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {responses.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {item.metricCode} · {item.metricTitle}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {item.cycleTitle} · {item.criterionCode}
                                                    {item.sectionTitle ? ` · ${item.sectionTitle}` : ""}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>{item.contributorName}</div>
                                                <div className="text-xs text-zinc-500">{item.contributorRole}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {item.documentCount} docs · {item.supportingLinkCount} links
                                            </TableCell>
                                            <TableCell>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
