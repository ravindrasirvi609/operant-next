"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CriteriaOption = {
    criteriaCode: string;
    criteriaName: string;
};

type MetricOption = {
    criteriaCode: string;
    criteriaName: string;
    tableName: string;
    fieldReference: string;
    label: string;
    sourceType: string;
    sourceLabel: string;
    defaultWeightage: number;
};

type NaacCriteriaMapping = {
    _id: string;
    criteriaCode: string;
    criteriaName: string;
    tableName: string;
    fieldReference: string;
    weightage: number;
};

function emptyForm(criteriaCode: string, metric?: MetricOption) {
    return {
        criteriaCode,
        metricKey: metric ? `${metric.tableName}:${metric.fieldReference}` : "",
        weightage: metric?.defaultWeightage ?? 0,
    };
}

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    const data = (await response.json()) as T & { message?: string };

    if (!response.ok) {
        throw new Error(data?.message || "Request failed.");
    }

    return data;
}

function sortMappings(items: NaacCriteriaMapping[]) {
    return [...items].sort((a, b) => {
        if (a.criteriaCode === b.criteriaCode) {
            if (a.tableName === b.tableName) {
                return a.fieldReference.localeCompare(b.fieldReference);
            }
            return a.tableName.localeCompare(b.tableName);
        }
        return a.criteriaCode.localeCompare(b.criteriaCode);
    });
}

export function NaacCriteriaMappingManager({
    initialMappings,
    criteriaOptions,
    metricOptions,
}: {
    initialMappings: NaacCriteriaMapping[];
    criteriaOptions: CriteriaOption[];
    metricOptions: MetricOption[];
}) {
    const defaultCriterion = criteriaOptions[0]?.criteriaCode ?? "C1";
    const defaultMetric =
        metricOptions.find((item) => item.criteriaCode === defaultCriterion) ??
        metricOptions[0];

    const [mappings, setMappings] = useState(() => sortMappings(initialMappings));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState(() =>
        emptyForm(defaultCriterion, defaultMetric)
    );

    const availableMetrics = useMemo(
        () =>
            metricOptions.filter((item) => item.criteriaCode === form.criteriaCode),
        [metricOptions, form.criteriaCode]
    );

    function resetForm(nextCriteriaCode = defaultCriterion) {
        const nextMetric =
            metricOptions.find((item) => item.criteriaCode === nextCriteriaCode) ??
            metricOptions[0];
        setEditingId(null);
        setForm(emptyForm(nextCriteriaCode, nextMetric));
    }

    function handleCriteriaChange(criteriaCode: string) {
        const nextMetric =
            metricOptions.find((item) => item.criteriaCode === criteriaCode) ??
            metricOptions[0];
        setForm({
            criteriaCode,
            metricKey: nextMetric ? `${nextMetric.tableName}:${nextMetric.fieldReference}` : "",
            weightage: nextMetric?.defaultWeightage ?? 0,
        });
    }

    function startEdit(mapping: NaacCriteriaMapping) {
        setEditingId(mapping._id);
        setForm({
            criteriaCode: mapping.criteriaCode,
            metricKey: `${mapping.tableName}:${mapping.fieldReference}`,
            weightage: mapping.weightage,
        });
        setMessage(null);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        const [tableName, fieldReference] = form.metricKey.split(":");
        const selectedCriterion = criteriaOptions.find(
            (item) => item.criteriaCode === form.criteriaCode
        );

        if (!tableName || !fieldReference || !selectedCriterion) {
            setMessage({
                type: "error",
                text: "Select a valid criterion and mapped source field.",
            });
            return;
        }

        const payload = {
            criteriaCode: form.criteriaCode,
            criteriaName: selectedCriterion.criteriaName,
            tableName,
            fieldReference,
            weightage: Number(form.weightage),
        };

        startTransition(async () => {
            try {
                if (editingId) {
                    const data = await requestJson<{ mapping: NaacCriteriaMapping }>(
                        `/api/admin/aqar/mappings/${editingId}`,
                        {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        }
                    );
                    setMappings((current) =>
                        sortMappings(
                            current.map((item) =>
                                item._id === editingId ? data.mapping : item
                            )
                        )
                    );
                    setMessage({ type: "success", text: "NAAC criteria mapping updated." });
                } else {
                    const data = await requestJson<{ mapping: NaacCriteriaMapping }>(
                        "/api/admin/aqar/mappings",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        }
                    );
                    setMappings((current) => sortMappings([data.mapping, ...current]));
                    setMessage({ type: "success", text: "NAAC criteria mapping created." });
                }

                resetForm(form.criteriaCode);
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save NAAC criteria mapping.",
                });
            }
        });
    }

    function handleDelete(id: string) {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson<{ success: boolean }>(`/api/admin/aqar/mappings/${id}`, {
                    method: "DELETE",
                });
                setMappings((current) => current.filter((item) => item._id !== id));
                if (editingId === id) {
                    resetForm();
                }
                setMessage({ type: "success", text: "NAAC criteria mapping removed." });
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to remove NAAC criteria mapping.",
                });
            }
        });
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
                <CardHeader>
                    <CardTitle>NAAC Criteria Mapping</CardTitle>
                    <CardDescription>
                        Control how AQAR criteria auto-pull institutional metrics from PBAS, CAS, faculty, student, and governance modules.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <form className="grid gap-4" onSubmit={handleSubmit}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="naac-criteria-code">Criteria code</Label>
                                <Select value={form.criteriaCode} onValueChange={handleCriteriaChange}>
                                    <SelectTrigger id="naac-criteria-code">
                                        <SelectValue placeholder="Select criterion" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {criteriaOptions.map((item) => (
                                            <SelectItem key={item.criteriaCode} value={item.criteriaCode}>
                                                {item.criteriaCode} · {item.criteriaName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="naac-weightage">Weightage</Label>
                                <Input
                                    id="naac-weightage"
                                    min={0}
                                    step="0.01"
                                    type="number"
                                    value={form.weightage}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            weightage: Number(event.target.value),
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="naac-source-field">Mapped source field</Label>
                            <Select
                                value={form.metricKey}
                                onValueChange={(value) =>
                                    setForm((current) => ({ ...current, metricKey: value }))
                                }
                            >
                                <SelectTrigger id="naac-source-field">
                                    <SelectValue placeholder="Select metric source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMetrics.map((item) => (
                                        <SelectItem
                                            key={`${item.tableName}:${item.fieldReference}`}
                                            value={`${item.tableName}:${item.fieldReference}`}
                                        >
                                            {item.label} · {item.tableName}.{item.fieldReference}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button disabled={isPending} type="submit">
                                {isPending ? <Spinner /> : null}
                                {editingId ? "Update Mapping" : "Create Mapping"}
                            </Button>
                            <Button
                                disabled={isPending}
                                type="button"
                                variant="secondary"
                                onClick={() => resetForm(form.criteriaCode)}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configured Mappings</CardTitle>
                    <CardDescription>
                        These mappings are now the source of truth for AQAR criteria auto-generation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {mappings.length ? (
                        mappings.map((mapping) => {
                            const metric = metricOptions.find(
                                (item) =>
                                    item.tableName === mapping.tableName &&
                                    item.fieldReference === mapping.fieldReference
                            );

                            return (
                                <div
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                    key={mapping._id}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-zinc-950">
                                                {mapping.criteriaCode} · {mapping.criteriaName}
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-600">
                                                {metric?.label ?? mapping.fieldReference}
                                            </p>
                                        </div>
                                        <Badge>{mapping.weightage}</Badge>
                                    </div>
                                    <p className="mt-2 text-xs text-zinc-500">
                                        {mapping.tableName}.{mapping.fieldReference}
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <Button
                                            disabled={isPending}
                                            size="sm"
                                            type="button"
                                            variant="secondary"
                                            onClick={() => startEdit(mapping)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            disabled={isPending}
                                            size="sm"
                                            type="button"
                                            variant="secondary"
                                            onClick={() => handleDelete(mapping._id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No NAAC criteria mappings configured yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
