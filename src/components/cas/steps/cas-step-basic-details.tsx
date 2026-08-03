"use client";

import { ArrowRight } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { FieldGrid, RhfSelectField } from "@/components/forms/rhf-fields";
import { SectionHeader } from "@/components/ui/page-header";
import { designationOptions } from "@/lib/faculty/options";
import type { CasDesignationProfile, CasPromotionTargets } from "@/components/cas/cas-types";

export function CasStepBasicDetails({
    canEdit,
    applicationYearOptions,
    designationProfile,
    allowedPromotionTargets,
}: {
    canEdit: boolean;
    applicationYearOptions: Array<{ id: string; label: string; isActive?: boolean }>;
    designationProfile: CasDesignationProfile;
    allowedPromotionTargets: CasPromotionTargets;
}) {
    const form = useFormContext();
    const current = String(form.watch("currentDesignation") ?? "");
    const target = String(form.watch("applyingForDesignation") ?? "");

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Basic details"
                description="The year you are applying in, and the promotion you are applying for."
            />

            <FieldGrid>
                <RhfSelectField
                    name="applicationYearId"
                    label="Application year"
                    placeholder="Select application year"
                    disabled={!canEdit}
                    options={applicationYearOptions.map((option) => ({
                        value: option.id,
                        label: option.isActive ? `${option.label} (Active)` : option.label,
                    }))}
                    onValueChange={(value) => {
                        // Keep the stored label in step with the selected id.
                        const match = applicationYearOptions.find((option) => option.id === value);
                        form.setValue("applicationYear", match?.label ?? "", {
                            shouldDirty: true,
                            shouldValidate: true,
                        });
                    }}
                />
                <RhfSelectField
                    name="currentDesignation"
                    label="Current designation"
                    placeholder="Select designation"
                    disabled={!canEdit}
                    options={designationOptions.map((option) => ({ value: option, label: option }))}
                />
                <RhfSelectField
                    name="applyingForDesignation"
                    label="Applying for"
                    placeholder="Select designation"
                    disabled={!canEdit}
                    description="Limited to the paths permitted from your current stage."
                    options={allowedPromotionTargets.map((option) => ({ value: option, label: option }))}
                />
            </FieldGrid>

            <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{designationProfile.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{designationProfile.casFocus}</p>

                {current && target ? (
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        {current}
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        {target}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
