"use client";

import { FieldGrid, RhfNumberField } from "@/components/forms/rhf-fields";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { useFormContext } from "react-hook-form";

/**
 * Assessment window and service length.
 *
 * The three inputs were `{...form.register(..., { valueAsNumber: true })}` under
 * `<Label>`s with no `htmlFor`, and with no validation feedback rendered anywhere.
 * `RhfNumberField` supplies the association and the message, and turns an emptied
 * field into `undefined` rather than `NaN` — the old `valueAsNumber` produced
 * "Expected number, received nan" the moment someone cleared the box to retype it.
 */
export function CasStepEligibilityPeriod({ canEdit }: { canEdit: boolean }) {
    const form = useFormContext();
    const fromYear = Number(form.watch("eligibilityPeriod.fromYear"));
    const toYear = Number(form.watch("eligibilityPeriod.toYear"));
    const span = Number.isFinite(fromYear) && Number.isFinite(toYear) ? toYear - fromYear : null;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Eligibility period"
                description="The assessment window this application covers, and your service length within it."
            />

            <FieldGrid>
                <RhfNumberField
                    name="eligibilityPeriod.fromYear"
                    label="From year"
                    min={1900}
                    max={2100}
                    disabled={!canEdit}
                />
                <RhfNumberField
                    name="eligibilityPeriod.toYear"
                    label="To year"
                    min={1900}
                    max={2100}
                    disabled={!canEdit}
                />
                <RhfNumberField
                    name="experienceYears"
                    label="Experience (years)"
                    min={0}
                    step={0.5}
                    description="Completed service at your current stage."
                    disabled={!canEdit}
                />
            </FieldGrid>

            {span !== null && span < 0 ? (
                <InlineAlert tone="warning" title="Check the year range">
                    The end year is before the start year.
                </InlineAlert>
            ) : span !== null ? (
                <InlineAlert tone="info">
                    This window spans {span} year{span === 1 ? "" : "s"}.
                </InlineAlert>
            ) : null}
        </div>
    );
}
