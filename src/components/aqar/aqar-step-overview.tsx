"use client";

import { RefreshCw } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { FieldGrid, RhfDateField, RhfSelectField } from "@/components/forms/rhf-fields";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { getAcademicYearReportingPeriod } from "@/lib/academic-year";

export type AqarYearOption = { id: string; label: string; isActive?: boolean };

/**
 * First AQAR step: which year this report covers, and its reporting window.
 *
 * The original derived the reporting period inside the select's `onValueChange`
 * with a local `parseAcademicYearLabel` regex and two hardcoded `-06-01` /
 * `-05-31` string concatenations, duplicating logic that already existed in
 * `getAcademicYearReportingPeriod` (lib/academic-year.ts) — which `emptyForm` in
 * the same file was already calling. Both paths now go through the shared helper,
 * so a change to the academic calendar lands in one place.
 */
export function AqarStepOverview({
    yearOptions,
    editable,
    prefillYear,
    isPrefillLoading,
    onReloadPrefill,
}: {
    yearOptions: AqarYearOption[];
    editable: boolean;
    /** Year the currently loaded profile prefill came from. */
    prefillYear: string;
    isPrefillLoading: boolean;
    onReloadPrefill: (academicYear: string) => void;
}) {
    const form = useFormContext();
    const academicYear = String(form.watch("academicYear") ?? "");

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Reporting overview"
                description="Set the academic year before adding contribution records — the year determines which profile records are pulled in."
                actions={
                    editable ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={isPrefillLoading}
                            disabled={!academicYear || isPrefillLoading}
                            onClick={() => onReloadPrefill(academicYear)}
                        >
                            <RefreshCw aria-hidden />
                            Reload from profile
                        </Button>
                    ) : null
                }
            />

            <FieldGrid>
                <RhfSelectField
                    name="academicYearId"
                    label="Academic year"
                    placeholder="Select academic year"
                    disabled={!editable}
                    options={yearOptions.map((option) => ({
                        value: option.id,
                        label: option.isActive ? `${option.label} (Active)` : option.label,
                    }))}
                    onValueChange={(value) => {
                        const option = yearOptions.find((item) => item.id === value);
                        if (!option) return;

                        form.setValue("academicYear", option.label, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                        });

                        const period = getAcademicYearReportingPeriod(option.label);
                        if (!period) return;

                        form.setValue("reportingPeriod.fromDate", period.fromDate, {
                            shouldDirty: true,
                            shouldTouch: true,
                        });
                        form.setValue("reportingPeriod.toDate", period.toDate, {
                            shouldDirty: true,
                            shouldTouch: true,
                        });
                    }}
                />
                <RhfDateField name="reportingPeriod.fromDate" label="Reporting from" disabled={!editable} />
                <RhfDateField name="reportingPeriod.toDate" label="Reporting to" disabled={!editable} />
            </FieldGrid>

            {prefillYear && academicYear && prefillYear !== academicYear ? (
                <InlineAlert tone="warning" title="Records are from a different year">
                    The contribution records below were loaded for {prefillYear}, but this report now covers{" "}
                    {academicYear}. Use <strong>Reload from profile</strong> to replace them.
                </InlineAlert>
            ) : (
                <InlineAlert tone="info" title="Where these records come from">
                    Contribution sections are prefilled from your faculty profile for the selected year. Edits
                    here apply to this AQAR report only — they do not change your profile.
                </InlineAlert>
            )}
        </div>
    );
}
