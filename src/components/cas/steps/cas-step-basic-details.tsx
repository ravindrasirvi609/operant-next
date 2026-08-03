"use client";

import { Controller } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { designationOptions } from "@/lib/faculty/options";
import type { CasDesignationProfile, CasForm, CasPromotionTargets } from "@/components/cas/cas-types";

export function CasStepBasicDetails({
    form,
    canEdit,
    applicationYearOptions,
    designationProfile,
    allowedPromotionTargets,
}: {
    form: CasForm;
    canEdit: boolean;
    applicationYearOptions: Array<{ id: string; label: string; isActive?: boolean }>;
    designationProfile: CasDesignationProfile;
    allowedPromotionTargets: CasPromotionTargets;
}) {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Application Year">
                    <Controller
                        control={form.control}
                        name="applicationYearId"
                        render={({ field }) => (
                            <Select
                                value={field.value || undefined}
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    const matchingOption = applicationYearOptions.find((option) => option.id === value);
                                    form.setValue("applicationYear", matchingOption?.label ?? "", {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    });
                                }}
                                disabled={!canEdit}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select application year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {applicationYearOptions.map((option) => (
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
                    <Controller
                        control={form.control}
                        name="currentDesignation"
                        render={({ field }) => (
                            <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!canEdit}>
                                <SelectTrigger className="w-full">
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
                        )}
                    />
                </Field>
                <Field label="Applying For">
                    <Controller
                        control={form.control}
                        name="applyingForDesignation"
                        render={({ field }) => (
                            <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!canEdit}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select designation" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedPromotionTargets.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </Field>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{designationProfile.label}</p>
                <p className="mt-1">{designationProfile.casFocus}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Allowed promotion path: {allowedPromotionTargets.join(" / ")}
                </p>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
