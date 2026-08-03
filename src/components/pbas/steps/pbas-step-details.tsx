"use client";

import type { ReactNode } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDesignationProfile } from "@/lib/faculty/options";
import type { PbasFormValues } from "@/components/pbas/pbas-types";

type DesignationProfile = ReturnType<typeof getDesignationProfile>;

export function PbasStepDetails({
    form,
    academicYearOptions,
    canEdit,
    designationProfile,
    designationBadgeLabel,
}: {
    form: UseFormReturn<PbasFormValues>;
    academicYearOptions: Array<{ id: string; label: string; isActive: boolean }>;
    canEdit: boolean;
    designationProfile: DesignationProfile;
    designationBadgeLabel: string;
}) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Academic Year">
                    <Controller
                        control={form.control}
                        name="academicYearId"
                        render={({ field }) => (
                            <Select
                                value={field.value || undefined}
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    const matchingOption = academicYearOptions.find((option) => option.id === value);
                                    form.setValue("academicYear", matchingOption?.label ?? "", {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    });
                                }}
                                disabled={!canEdit}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select academic year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYearOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label}{option.isActive ? " (Active)" : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </Field>
                <Field label="Current Designation">
                    <Input
                        {...form.register("currentDesignation")}
                        disabled
                        readOnly
                    />
                </Field>
                <Field label="Appraisal From">
                    <Input type="date" {...form.register("appraisalPeriod.fromDate")} disabled={!canEdit} />
                </Field>
                <Field label="Appraisal To">
                    <Input type="date" {...form.register("appraisalPeriod.toDate")} disabled={!canEdit} />
                </Field>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                PBAS scores are derived from faculty teaching, research, and institutional records. Update the source data in{" "}
                <a className="font-semibold text-foreground hover:underline" href="/faculty/profile">
                    Faculty Workspace
                </a>
                .
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{designationProfile.label}</p>
                    <Badge variant="secondary">{designationBadgeLabel || "PBAS"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{designationProfile.pbasFocus}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {designationProfile.key === "early_assistant" ? (
                        <>
                            <span className="rounded-full border border-border px-3 py-1">Teaching-heavy visibility</span>
                            <span className="rounded-full border border-border px-3 py-1">Research growth</span>
                        </>
                    ) : null}
                    {designationProfile.key === "advanced_assistant" ? (
                        <>
                            <span className="rounded-full border border-border px-3 py-1">Balanced teaching + research</span>
                            <span className="rounded-full border border-border px-3 py-1">Institutional contribution visible</span>
                        </>
                    ) : null}
                    {designationProfile.key === "associate" ? (
                        <>
                            <span className="rounded-full border border-border px-3 py-1">Research-first visibility</span>
                            <span className="rounded-full border border-border px-3 py-1">Leadership contribution visible</span>
                        </>
                    ) : null}
                    {designationProfile.key === "professor" ? (
                        <>
                            <span className="rounded-full border border-border px-3 py-1">Leadership-first visibility</span>
                            <span className="rounded-full border border-border px-3 py-1">Mentoring and stewardship</span>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-2">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {children}
        </div>
    );
}
