"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    designationOptions,
    getAllowedCasPromotionTargets,
    type FacultyDesignation,
} from "@/lib/faculty/options";

type CasRule = {
    _id: string;
    currentDesignation: string;
    targetDesignation: string;
    minExperienceYears: number;
    minApiScore: number;
    categoryMinimums: {
        teachingLearning: number;
        researchPublication: number;
        academicContribution: number;
    };
    notes?: string;
    isActive: boolean;
};

type CasRuleForm = {
    currentDesignation: FacultyDesignation;
    targetDesignation: FacultyDesignation;
    minExperienceYears: number;
    minApiScore: number;
    teachingLearning: number;
    researchPublication: number;
    academicContribution: number;
    notes: string;
    isActive: string;
};

function emptyRuleForm(currentDesignation: FacultyDesignation = designationOptions[0]): CasRuleForm {
    return {
        currentDesignation,
        targetDesignation: getAllowedCasPromotionTargets(currentDesignation)[0],
        minExperienceYears: 0,
        minApiScore: 0,
        teachingLearning: 0,
        researchPublication: 0,
        academicContribution: 0,
        notes: "",
        isActive: "true",
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

function sortRules(items: CasRule[]) {
    return [...items].sort((a, b) => {
        if (a.currentDesignation === b.currentDesignation) {
            return a.targetDesignation.localeCompare(b.targetDesignation);
        }
        return a.currentDesignation.localeCompare(b.currentDesignation);
    });
}

export function CasRuleManager({
    initialRules,
}: {
    initialRules: CasRule[];
}) {
    const [rules, setRules] = useState(() => sortRules(initialRules));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState(() => emptyRuleForm());

    const allowedTargets = useMemo(
        () => getAllowedCasPromotionTargets(form.currentDesignation),
        [form.currentDesignation]
    );

    function resetForm(nextDesignation?: FacultyDesignation) {
        setEditingId(null);
        setForm(emptyRuleForm(nextDesignation));
    }

    function updateField<Key extends keyof CasRuleForm>(key: Key, value: CasRuleForm[Key]) {
        setForm((current) => {
            const next = { ...current, [key]: value };
            if (key === "currentDesignation") {
                const nextTargets = getAllowedCasPromotionTargets(value as FacultyDesignation);
                if (!nextTargets.includes(next.targetDesignation as (typeof nextTargets)[number])) {
                    next.targetDesignation = nextTargets[0];
                }
            }
            return next;
        });
    }

    function startEdit(rule: CasRule) {
        setEditingId(rule._id);
        setForm({
            currentDesignation: rule.currentDesignation as FacultyDesignation,
            targetDesignation: rule.targetDesignation as FacultyDesignation,
            minExperienceYears: rule.minExperienceYears,
            minApiScore: rule.minApiScore,
            teachingLearning: rule.categoryMinimums?.teachingLearning ?? 0,
            researchPublication: rule.categoryMinimums?.researchPublication ?? 0,
            academicContribution: rule.categoryMinimums?.academicContribution ?? 0,
            notes: rule.notes ?? "",
            isActive: String(rule.isActive),
        });
        setMessage(null);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        const payload = {
            currentDesignation: form.currentDesignation,
            targetDesignation: form.targetDesignation,
            minExperienceYears: Number(form.minExperienceYears),
            minApiScore: Number(form.minApiScore),
            categoryMinimums: {
                teachingLearning: Number(form.teachingLearning),
                researchPublication: Number(form.researchPublication),
                academicContribution: Number(form.academicContribution),
            },
            notes: form.notes.trim(),
            isActive: form.isActive === "true",
        };

        startTransition(async () => {
            try {
                if (editingId) {
                    const data = await requestJson<{ rule: CasRule }>(
                        `/api/admin/cas/rules/${editingId}`,
                        {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        }
                    );
                    setRules((current) =>
                        sortRules(current.map((item) => (item._id === editingId ? data.rule : item)))
                    );
                    setMessage({ type: "success", text: "CAS promotion rule updated." });
                } else {
                    const data = await requestJson<{ rule: CasRule }>(
                        "/api/admin/cas/rules",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        }
                    );
                    setRules((current) => sortRules([data.rule, ...current]));
                    setMessage({ type: "success", text: "CAS promotion rule created." });
                }
                resetForm(form.currentDesignation);
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save CAS promotion rule.",
                });
            }
        });
    }

    function handleDelete(id: string) {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson<{ success: boolean }>(`/api/admin/cas/rules/${id}`, {
                    method: "DELETE",
                });
                setRules((current) => current.filter((item) => item._id !== id));
                if (editingId === id) {
                    resetForm(form.currentDesignation);
                }
                setMessage({ type: "success", text: "CAS promotion rule removed." });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to remove CAS promotion rule.",
                });
            }
        });
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
                <CardHeader>
                    <CardTitle>CAS Promotion Rules</CardTitle>
                    <CardDescription>
                        Manage designation paths, minimum experience, API thresholds, and category-wise minimums without changing code.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}
                    <form className="grid gap-4" onSubmit={handleSubmit}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="cas-current-designation">Current designation</Label>
                                <Select
                                    value={form.currentDesignation}
                                    onValueChange={(value) => updateField("currentDesignation", value as FacultyDesignation)}
                                >
                                    <SelectTrigger id="cas-current-designation">
                                        <SelectValue placeholder="Select designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {designationOptions.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cas-target-designation">Target designation</Label>
                                <Select
                                    value={form.targetDesignation}
                                    onValueChange={(value) => updateField("targetDesignation", value as FacultyDesignation)}
                                >
                                    <SelectTrigger id="cas-target-designation">
                                        <SelectValue placeholder="Select target" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allowedTargets.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="cas-min-experience">Minimum experience (years)</Label>
                                <Input
                                    id="cas-min-experience"
                                    min={0}
                                    type="number"
                                    value={form.minExperienceYears}
                                    onChange={(event) => updateField("minExperienceYears", Number(event.target.value))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cas-min-api">Minimum API score</Label>
                                <Input
                                    id="cas-min-api"
                                    min={0}
                                    type="number"
                                    value={form.minApiScore}
                                    onChange={(event) => updateField("minApiScore", Number(event.target.value))}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="cas-min-a">Teaching minimum</Label>
                                <Input
                                    id="cas-min-a"
                                    min={0}
                                    type="number"
                                    value={form.teachingLearning}
                                    onChange={(event) => updateField("teachingLearning", Number(event.target.value))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cas-min-b">Research minimum</Label>
                                <Input
                                    id="cas-min-b"
                                    min={0}
                                    type="number"
                                    value={form.researchPublication}
                                    onChange={(event) => updateField("researchPublication", Number(event.target.value))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cas-min-c">Academic minimum</Label>
                                <Input
                                    id="cas-min-c"
                                    min={0}
                                    type="number"
                                    value={form.academicContribution}
                                    onChange={(event) => updateField("academicContribution", Number(event.target.value))}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                            <div className="grid gap-2">
                                <Label htmlFor="cas-rule-notes">Notes</Label>
                                <Input
                                    id="cas-rule-notes"
                                    placeholder="Explain the rule or committee rationale"
                                    value={form.notes}
                                    onChange={(event) => updateField("notes", event.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cas-rule-active">Status</Label>
                                <Select
                                    value={form.isActive}
                                    onValueChange={(value) => updateField("isActive", value)}
                                >
                                    <SelectTrigger id="cas-rule-active">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button disabled={isPending} type="submit">
                                {isPending ? <Spinner /> : null}
                                {editingId ? "Update Rule" : "Create Rule"}
                            </Button>
                            <Button
                                disabled={isPending}
                                type="button"
                                variant="secondary"
                                onClick={() => resetForm(form.currentDesignation)}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configured Paths</CardTitle>
                    <CardDescription>
                        Review all active and inactive promotion paths currently driving CAS eligibility and breakup thresholds.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {rules.length ? rules.map((rule) => (
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={rule._id}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-zinc-950">
                                        {rule.currentDesignation} to {rule.targetDesignation}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Experience {rule.minExperienceYears} years | API {rule.minApiScore}
                                    </p>
                                </div>
                                <Badge variant={rule.isActive ? "default" : "secondary"}>
                                    {rule.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
                                <div>Teaching min: {rule.categoryMinimums?.teachingLearning ?? 0}</div>
                                <div>Research min: {rule.categoryMinimums?.researchPublication ?? 0}</div>
                                <div>Academic min: {rule.categoryMinimums?.academicContribution ?? 0}</div>
                            </div>
                            {rule.notes ? (
                                <p className="mt-3 text-sm text-zinc-500">{rule.notes}</p>
                            ) : null}
                            <div className="mt-4 flex flex-wrap gap-3">
                                <Button
                                    disabled={isPending}
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                    onClick={() => startEdit(rule)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    disabled={isPending}
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                    onClick={() => handleDelete(rule._id)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No CAS promotion rules found yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
