"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AcademicYearOption = {
    id: string;
    label: string;
    isActive?: boolean;
};

type MetricDefinition = {
    _id: string;
    metricCode: string;
    criteriaCode: string;
    criteriaName: string;
    label: string;
    sourceType: string;
    sourceLabel: string;
    sourceMode: string;
    moduleKey?: string;
    guidance?: string;
    tableName: string;
    fieldReference: string;
    valueType: string;
    defaultWeightage: number;
    isActive: boolean;
};

type MetricCycle = {
    _id: string;
    academicYearLabel: string;
    title: string;
    status: string;
    generatedMetricCount: number;
    reviewedMetricCount: number;
    overriddenMetricCount: number;
    lastGeneratedAt?: string;
    updatedAt?: string;
};

type MetricValueSource = {
    sourceType: string;
    label: string;
    collectionName: string;
    count?: number;
    value?: string;
    recordIds: string[];
};

type MetricValue = {
    _id: string;
    metricCode: string;
    criteriaCode: string;
    criteriaName: string;
    label: string;
    sourceType: string;
    sourceLabel: string;
    sourceMode: string;
    moduleKey?: string;
    guidance?: string;
    tableName: string;
    fieldReference: string;
    valueType: string;
    weightage: number;
    numericValue?: number;
    textValue?: string;
    effectiveValueText?: string;
    status: string;
    sourceSnapshots: MetricValueSource[];
    reviewRemarks?: string;
    overrideReason?: string;
    lastGeneratedAt?: string;
    reviewedAt?: string;
    overriddenAt?: string;
};

type CycleWorkspace = {
    cycle: MetricCycle;
    values: MetricValue[];
    summary: {
        totalMetrics: number;
        generatedCount: number;
        reviewedCount: number;
        overriddenCount: number;
        criteria: Array<{
            criteriaCode: string;
            criteriaName: string;
            totalMetrics: number;
            reviewedCount: number;
            overriddenCount: number;
        }>;
    };
    latestSync?: {
        status: string;
        startedAt?: string;
        completedAt?: string;
        metricCount: number;
        createdCount: number;
        updatedCount: number;
        errorMessage?: string;
    } | null;
};

function sortCycles(items: MetricCycle[]) {
    return [...items].sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? 0).getTime();
        const bTime = new Date(b.updatedAt ?? 0).getTime();
        return bTime - aTime;
    });
}

function formatDateTime(value?: string) {
    if (!value) {
        return "Not yet";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

function statusBadgeClass(status: string) {
    if (status === "Reviewed") {
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
    }

    if (status === "Overridden") {
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
    }

    if (status === "Generated") {
        return "bg-sky-100 text-sky-700 hover:bg-sky-100";
    }

    return "bg-zinc-100 text-zinc-700 hover:bg-zinc-100";
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

export function NaacMetricWarehouseManager({
    definitions,
    cycles: initialCycles,
    academicYearOptions,
    initialWorkspace,
}: {
    definitions: MetricDefinition[];
    cycles: MetricCycle[];
    academicYearOptions: AcademicYearOption[];
    initialWorkspace: CycleWorkspace | null;
}) {
    const defaultAcademicYear = academicYearOptions.find((item) => item.isActive)?.id ?? academicYearOptions[0]?.id ?? "";
    const [cycles, setCycles] = useState(() => sortCycles(initialCycles));
    const [workspace, setWorkspace] = useState<CycleWorkspace | null>(initialWorkspace);
    const [selectedCycleId, setSelectedCycleId] = useState(initialWorkspace?.cycle._id ?? initialCycles[0]?._id ?? "");
    const [selectedMetricId, setSelectedMetricId] = useState(initialWorkspace?.values[0]?._id ?? "");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [createForm, setCreateForm] = useState({
        academicYearId: defaultAcademicYear,
        title: academicYearOptions.find((item) => item.id === defaultAcademicYear)?.label
            ? `NAAC Warehouse ${academicYearOptions.find((item) => item.id === defaultAcademicYear)?.label}`
            : "NAAC Warehouse Cycle",
    });
    const [reviewForm, setReviewForm] = useState({
        status: "Reviewed",
        reviewRemarks: "",
        overrideNumericValue: "",
        overrideTextValue: "",
        overrideReason: "",
    });
    const [manualForm, setManualForm] = useState({
        numericValue: "",
        textValue: "",
        remarks: "",
    });

    const selectedMetric = useMemo(
        () => workspace?.values.find((item) => item._id === selectedMetricId) ?? workspace?.values[0] ?? null,
        [workspace, selectedMetricId]
    );

    useEffect(() => {
        if (!selectedMetric) {
            setReviewForm({
                status: "Reviewed",
                reviewRemarks: "",
                overrideNumericValue: "",
                overrideTextValue: "",
                overrideReason: "",
            });
            return;
        }

        setReviewForm({
            status: selectedMetric.status === "Overridden" ? "Overridden" : "Reviewed",
            reviewRemarks: selectedMetric.reviewRemarks ?? "",
            overrideNumericValue: "",
            overrideTextValue: "",
            overrideReason: selectedMetric.overrideReason ?? "",
        });
        setManualForm({
            numericValue:
                typeof selectedMetric.numericValue === "number" && Number.isFinite(selectedMetric.numericValue)
                    ? String(selectedMetric.numericValue)
                    : "",
            textValue: selectedMetric.textValue ?? "",
            remarks: selectedMetric.reviewRemarks ?? "",
        });
    }, [selectedMetric?._id]);

    async function loadWorkspace(cycleId: string) {
        const data = await requestJson<{ workspace: CycleWorkspace }>(
            `/api/admin/naac-metric-warehouse/cycles/${cycleId}`
        );
        setWorkspace(data.workspace);
        setSelectedCycleId(cycleId);
        setSelectedMetricId(data.workspace.values[0]?._id ?? "");
        setCycles((current) =>
            sortCycles(
                current.map((item) => (item._id === data.workspace.cycle._id ? data.workspace.cycle : item))
            )
        );
        return data.workspace;
    }

    function handleCreateCycle(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
            try {
                const data = await requestJson<{ cycle: MetricCycle; message: string }>(
                    "/api/admin/naac-metric-warehouse/cycles",
                    {
                        method: "POST",
                        body: JSON.stringify(createForm),
                    }
                );

                setCycles((current) => sortCycles([data.cycle, ...current]));
                setSelectedCycleId(data.cycle._id);
                setWorkspace({
                    cycle: data.cycle,
                    values: [],
                    summary: {
                        totalMetrics: 0,
                        generatedCount: 0,
                        reviewedCount: 0,
                        overriddenCount: 0,
                        criteria: [],
                    },
                    latestSync: null,
                });
                setSelectedMetricId("");
                setMessage({ type: "success", text: data.message });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to create warehouse cycle.",
                });
            }
        });
    }

    function handleGenerate() {
        if (!selectedCycleId) {
            setMessage({ type: "error", text: "Create or load a cycle first." });
            return;
        }

        setMessage(null);
        startTransition(async () => {
            try {
                const data = await requestJson<{ workspace: CycleWorkspace; message: string }>(
                    `/api/admin/naac-metric-warehouse/cycles/${selectedCycleId}/generate`,
                    { method: "POST" }
                );
                setWorkspace(data.workspace);
                setSelectedMetricId(data.workspace.values[0]?._id ?? "");
                setCycles((current) =>
                    sortCycles(
                        current.map((item) =>
                            item._id === data.workspace.cycle._id ? data.workspace.cycle : item
                        )
                    )
                );
                setMessage({ type: "success", text: data.message });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to generate warehouse snapshot.",
                });
            }
        });
    }

    function handleReview(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedMetric) {
            setMessage({ type: "error", text: "Select a metric value to review." });
            return;
        }

        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson<{ message: string }>(
                    `/api/admin/naac-metric-warehouse/values/${selectedMetric._id}/review`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            status: reviewForm.status,
                            reviewRemarks: reviewForm.reviewRemarks,
                            overrideNumericValue:
                                reviewForm.overrideNumericValue.trim() === ""
                                    ? undefined
                                    : Number(reviewForm.overrideNumericValue),
                            overrideTextValue: reviewForm.overrideTextValue.trim() || undefined,
                            overrideReason: reviewForm.overrideReason.trim() || undefined,
                        }),
                    }
                );
                await loadWorkspace(selectedCycleId);
                setMessage({
                    type: "success",
                    text:
                        reviewForm.status === "Overridden"
                            ? "Metric override saved."
                            : "Metric marked as reviewed.",
                });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to review metric.",
                });
            }
        });
    }

    function handleManualSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedMetric) {
            setMessage({ type: "error", text: "Select a manual metric first." });
            return;
        }

        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson<{ message: string }>(
                    `/api/admin/naac-metric-warehouse/values/${selectedMetric._id}/manual`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            numericValue:
                                manualForm.numericValue.trim() === ""
                                    ? undefined
                                    : Number(manualForm.numericValue),
                            textValue: manualForm.textValue.trim() || undefined,
                            remarks: manualForm.remarks.trim() || undefined,
                        }),
                    }
                );
                await loadWorkspace(selectedCycleId);
                setMessage({ type: "success", text: "Manual warehouse value saved." });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save manual value.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Configured metrics</CardDescription>
                        <CardTitle>{definitions.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Warehouse cycles</CardDescription>
                        <CardTitle>{cycles.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Generated values</CardDescription>
                        <CardTitle>{workspace?.summary.generatedCount ?? 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Reviewed or overridden</CardDescription>
                        <CardTitle>
                            {(workspace?.summary.reviewedCount ?? 0) + (workspace?.summary.overriddenCount ?? 0)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="cycles" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="cycles">Cycles</TabsTrigger>
                    <TabsTrigger value="definitions">Definitions</TabsTrigger>
                    <TabsTrigger value="values">Values</TabsTrigger>
                </TabsList>

                <TabsContent value="cycles" className="space-y-4">
                    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Warehouse Cycle</CardTitle>
                                <CardDescription>
                                    Anchor a warehouse snapshot to an academic year before generating NAAC metric values.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form className="space-y-4" onSubmit={handleCreateCycle}>
                                    <div className="grid gap-2">
                                        <Label htmlFor="warehouse-academic-year">Academic year</Label>
                                        <Select
                                            value={createForm.academicYearId}
                                            onValueChange={(value) =>
                                                setCreateForm((current) => ({
                                                    ...current,
                                                    academicYearId: value,
                                                    title: `NAAC Warehouse ${academicYearOptions.find((item) => item.id === value)?.label ?? ""}`.trim(),
                                                }))
                                            }
                                        >
                                            <SelectTrigger id="warehouse-academic-year">
                                                <SelectValue placeholder="Select academic year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYearOptions.map((item) => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="warehouse-cycle-title">Cycle title</Label>
                                        <Input
                                            id="warehouse-cycle-title"
                                            value={createForm.title}
                                            onChange={(event) =>
                                                setCreateForm((current) => ({
                                                    ...current,
                                                    title: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <Button disabled={isPending || !createForm.academicYearId} type="submit">
                                        {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                        Create cycle
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Available Cycles</CardTitle>
                                <CardDescription>
                                    Load an existing cycle, inspect its current status, or generate a fresh warehouse snapshot.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Academic year</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Generated</TableHead>
                                            <TableHead>Reviewed</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cycles.length ? (
                                            cycles.map((cycle) => (
                                                <TableRow key={cycle._id}>
                                                    <TableCell>
                                                        <div className="font-medium text-zinc-900">{cycle.academicYearLabel}</div>
                                                        <div className="text-xs text-zinc-500">{cycle.title}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={statusBadgeClass(cycle.status)}>{cycle.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>{cycle.generatedMetricCount}</TableCell>
                                                    <TableCell>{cycle.reviewedMetricCount + cycle.overriddenMetricCount}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    startTransition(async () => {
                                                                        try {
                                                                            await loadWorkspace(cycle._id);
                                                                        } catch (error) {
                                                                            setMessage({
                                                                                type: "error",
                                                                                text:
                                                                                    error instanceof Error
                                                                                        ? error.message
                                                                                        : "Unable to load cycle workspace.",
                                                                            });
                                                                        }
                                                                    })
                                                                }
                                                            >
                                                                Load
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedCycleId(cycle._id);
                                                                    handleGenerate();
                                                                }}
                                                            >
                                                                Generate
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell className="text-sm text-zinc-500" colSpan={5}>
                                                    No warehouse cycles created yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="definitions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seeded Metric Definitions</CardTitle>
                            <CardDescription>
                                These warehouse definitions are seeded from the current NAAC metric catalog and mapped into the warehouse snapshot engine.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead>Criterion</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Weight</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {definitions.map((definition) => (
                                        <TableRow key={definition._id}>
                                            <TableCell>
                                                <div className="font-medium text-zinc-900">{definition.label}</div>
                                                <div className="text-xs text-zinc-500">{definition.metricCode}</div>
                                            </TableCell>
                                            <TableCell>
                                                {definition.criteriaCode} · {definition.criteriaName}
                                            </TableCell>
                                            <TableCell>
                                                <div>{definition.sourceLabel}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {definition.tableName}.{definition.fieldReference}
                                                </div>
                                            </TableCell>
                                            <TableCell>{definition.sourceMode}</TableCell>
                                            <TableCell className="uppercase">{definition.valueType}</TableCell>
                                            <TableCell>{definition.defaultWeightage}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="values" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cycle Workspace</CardTitle>
                            <CardDescription>
                                Generate the warehouse snapshot, inspect metric lineage, and review or override calculated values.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="grid min-w-[240px] gap-2">
                                    <Label htmlFor="warehouse-cycle-picker">Loaded cycle</Label>
                                    <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                                        <SelectTrigger id="warehouse-cycle-picker">
                                            <SelectValue placeholder="Select cycle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cycles.map((cycle) => (
                                                <SelectItem key={cycle._id} value={cycle._id}>
                                                    {cycle.academicYearLabel}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    disabled={isPending || !selectedCycleId}
                                    variant="outline"
                                    onClick={() =>
                                        startTransition(async () => {
                                            try {
                                                await loadWorkspace(selectedCycleId);
                                            } catch (error) {
                                                setMessage({
                                                    type: "error",
                                                    text:
                                                        error instanceof Error
                                                            ? error.message
                                                            : "Unable to load workspace.",
                                                });
                                            }
                                        })
                                    }
                                >
                                    Load workspace
                                </Button>
                                <Button disabled={isPending || !selectedCycleId} onClick={handleGenerate}>
                                    {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                    Generate snapshot
                                </Button>
                            </div>

                            {workspace ? (
                                <>
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardDescription>Cycle</CardDescription>
                                                <CardTitle>{workspace.cycle.academicYearLabel}</CardTitle>
                                            </CardHeader>
                                        </Card>
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardDescription>Last generated</CardDescription>
                                                <CardTitle className="text-base">{formatDateTime(workspace.cycle.lastGeneratedAt)}</CardTitle>
                                            </CardHeader>
                                        </Card>
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardDescription>Latest sync</CardDescription>
                                                <CardTitle className="text-base">
                                                    {workspace.latestSync?.status ?? "No sync run"}
                                                </CardTitle>
                                            </CardHeader>
                                        </Card>
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardDescription>Review progress</CardDescription>
                                                <CardTitle>
                                                    {workspace.summary.reviewedCount + workspace.summary.overriddenCount}/
                                                    {workspace.summary.totalMetrics}
                                                </CardTitle>
                                            </CardHeader>
                                        </Card>
                                    </div>

                                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Metric Values</CardTitle>
                                                <CardDescription>
                                                    Snapshot values currently materialized for the selected warehouse cycle.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Metric</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Mode</TableHead>
                                                            <TableHead>Value</TableHead>
                                                            <TableHead>Weight</TableHead>
                                                            <TableHead className="text-right">Open</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {workspace.values.length ? (
                                                            workspace.values.map((value) => (
                                                                <TableRow key={value._id}>
                                                                    <TableCell>
                                                                        <div className="font-medium text-zinc-900">{value.label}</div>
                                                                        <div className="text-xs text-zinc-500">
                                                                            {value.criteriaCode} · {value.metricCode}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge className={statusBadgeClass(value.status)}>
                                                                            {value.status}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell>{value.sourceMode}</TableCell>
                                                                    <TableCell>{value.effectiveValueText || "-"}</TableCell>
                                                                    <TableCell>{value.weightage}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => setSelectedMetricId(value._id)}
                                                                        >
                                                                            Inspect
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell className="text-sm text-zinc-500" colSpan={6}>
                                                                    Generate the cycle snapshot to materialize metric values.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Metric Review</CardTitle>
                                                <CardDescription>
                                                    Inspect lineage for the selected value, then mark it reviewed or save a justified override.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {selectedMetric ? (
                                                    <>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-lg font-semibold text-zinc-900">
                                                                    {selectedMetric.label}
                                                                </h3>
                                                                <Badge className={statusBadgeClass(selectedMetric.status)}>
                                                                    {selectedMetric.status}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-zinc-500">
                                                                {selectedMetric.criteriaCode} · {selectedMetric.metricCode} ·{" "}
                                                                {selectedMetric.tableName}.{selectedMetric.fieldReference}
                                                            </p>
                                                            <div className="flex flex-wrap gap-2 text-xs">
                                                                <Badge variant="secondary">{selectedMetric.sourceMode}</Badge>
                                                                {selectedMetric.moduleKey ? (
                                                                    <Badge variant="secondary">{selectedMetric.moduleKey}</Badge>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-sm text-zinc-700">
                                                                Effective value:{" "}
                                                                <span className="font-semibold">{selectedMetric.effectiveValueText || "-"}</span>
                                                            </p>
                                                            {selectedMetric.guidance ? (
                                                                <p className="text-sm text-zinc-500">{selectedMetric.guidance}</p>
                                                            ) : null}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Source lineage</Label>
                                                            <div className="space-y-2">
                                                                {selectedMetric.sourceSnapshots.map((snapshot, index) => (
                                                                    <div
                                                                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                                                                        key={`${snapshot.collectionName}-${index}`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div>
                                                                                <p className="font-medium text-zinc-900">
                                                                                    {snapshot.label}
                                                                                </p>
                                                                                <p className="text-xs text-zinc-500">
                                                                                    {snapshot.collectionName} · {snapshot.sourceType}
                                                                                </p>
                                                                            </div>
                                                                            <Badge variant="secondary">
                                                                                {snapshot.count ?? snapshot.value ?? 0}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="mt-2 text-xs text-zinc-500">
                                                                            Stored lineage sample: {snapshot.recordIds.length} record id(s)
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {selectedMetric.sourceMode === "MANUAL" ? (
                                                            <form className="space-y-4" onSubmit={handleManualSave}>
                                                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                                                    <p className="text-sm font-medium text-zinc-900">
                                                                        Manual warehouse capture
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-zinc-500">
                                                                        Use this for SSS, AISHE, NIRF, and compliance values that are not yet sourced from live transactional modules.
                                                                    </p>
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="manual-numeric-value">Manual numeric value</Label>
                                                                    <Input
                                                                        id="manual-numeric-value"
                                                                        type="number"
                                                                        value={manualForm.numericValue}
                                                                        onChange={(event) =>
                                                                            setManualForm((current) => ({
                                                                                ...current,
                                                                                numericValue: event.target.value,
                                                                            }))
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="manual-text-value">Manual text value</Label>
                                                                    <Input
                                                                        id="manual-text-value"
                                                                        value={manualForm.textValue}
                                                                        onChange={(event) =>
                                                                            setManualForm((current) => ({
                                                                                ...current,
                                                                                textValue: event.target.value,
                                                                            }))
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="manual-remarks">Capture note</Label>
                                                                    <Textarea
                                                                        id="manual-remarks"
                                                                        value={manualForm.remarks}
                                                                        onChange={(event) =>
                                                                            setManualForm((current) => ({
                                                                                ...current,
                                                                                remarks: event.target.value,
                                                                            }))
                                                                        }
                                                                    />
                                                                </div>
                                                                <Button disabled={isPending} type="submit" variant="outline">
                                                                    {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                                                    Save manual value
                                                                </Button>
                                                            </form>
                                                        ) : null}

                                                        <form className="space-y-4" onSubmit={handleReview}>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="review-status">Review action</Label>
                                                                <Select
                                                                    value={reviewForm.status}
                                                                    onValueChange={(value) =>
                                                                        setReviewForm((current) => ({
                                                                            ...current,
                                                                            status: value,
                                                                        }))
                                                                    }
                                                                >
                                                                    <SelectTrigger id="review-status">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Reviewed">Mark reviewed</SelectItem>
                                                                        <SelectItem value="Overridden">Save override</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid gap-2">
                                                                <Label htmlFor="review-remarks">Review remarks</Label>
                                                                <Textarea
                                                                    id="review-remarks"
                                                                    value={reviewForm.reviewRemarks}
                                                                    onChange={(event) =>
                                                                        setReviewForm((current) => ({
                                                                            ...current,
                                                                            reviewRemarks: event.target.value,
                                                                        }))
                                                                    }
                                                                />
                                                            </div>

                                                            {reviewForm.status === "Overridden" ? (
                                                                <>
                                                                    <div className="grid gap-2">
                                                                        <Label htmlFor="override-numeric-value">Override numeric value</Label>
                                                                        <Input
                                                                            id="override-numeric-value"
                                                                            type="number"
                                                                            value={reviewForm.overrideNumericValue}
                                                                            onChange={(event) =>
                                                                                setReviewForm((current) => ({
                                                                                    ...current,
                                                                                    overrideNumericValue: event.target.value,
                                                                                }))
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        <Label htmlFor="override-text-value">Override text value</Label>
                                                                        <Input
                                                                            id="override-text-value"
                                                                            value={reviewForm.overrideTextValue}
                                                                            onChange={(event) =>
                                                                                setReviewForm((current) => ({
                                                                                    ...current,
                                                                                    overrideTextValue: event.target.value,
                                                                                }))
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        <Label htmlFor="override-reason">Override reason</Label>
                                                                        <Textarea
                                                                            id="override-reason"
                                                                            value={reviewForm.overrideReason}
                                                                            onChange={(event) =>
                                                                                setReviewForm((current) => ({
                                                                                    ...current,
                                                                                    overrideReason: event.target.value,
                                                                                }))
                                                                            }
                                                                        />
                                                                    </div>
                                                                </>
                                                            ) : null}

                                                            <Button disabled={isPending} type="submit">
                                                                {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                                                {reviewForm.status === "Overridden" ? "Save override" : "Mark reviewed"}
                                                            </Button>
                                                        </form>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-zinc-500">
                                                        Select a metric value from the table to inspect lineage and review it.
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    Create or load a warehouse cycle to start materializing NAAC metric values.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
