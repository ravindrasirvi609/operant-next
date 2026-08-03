"use client";

import Link from "next/link";
import { useFormContext } from "react-hook-form";

import { RhfDateField, RhfSelectField, RhfTextField, FieldGrid } from "@/components/forms/rhf-fields";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import type { getDesignationProfile } from "@/lib/faculty/options";

type DesignationProfile = ReturnType<typeof getDesignationProfile>;

/**
 * Emphasis chips per designation, keyed off `designationProfile.key`.
 *
 * The original inlined four separate `{key === "..." ? <>…</> : null}` blocks
 * (pbas-step-details.tsx:91-114) holding eight hand-written `<span>` pills. As
 * data it is one map and one loop, and adding a designation stops meaning adding
 * another conditional branch.
 */
const DESIGNATION_EMPHASIS: Record<string, string[]> = {
    early_assistant: ["Teaching-heavy visibility", "Research growth"],
    advanced_assistant: ["Balanced teaching and research", "Institutional contribution visible"],
    associate: ["Research-first visibility", "Leadership contribution visible"],
    professor: ["Leadership-first visibility", "Mentoring and stewardship"],
};

export function PbasStepDetails({
    academicYearOptions,
    canEdit,
    designationProfile,
    designationBadgeLabel,
}: {
    academicYearOptions: Array<{ id: string; label: string; isActive: boolean }>;
    canEdit: boolean;
    designationProfile: DesignationProfile;
    designationBadgeLabel: string;
}) {
    const form = useFormContext();
    const emphasis = DESIGNATION_EMPHASIS[designationProfile.key] ?? [];

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Application details"
                description="The academic year and appraisal window this PBAS report covers."
            />

            <FieldGrid>
                <RhfSelectField
                    name="academicYearId"
                    label="Academic year"
                    placeholder="Select academic year"
                    disabled={!canEdit}
                    options={academicYearOptions.map((option) => ({
                        value: option.id,
                        label: option.isActive ? `${option.label} (Active)` : option.label,
                    }))}
                    onValueChange={(value) => {
                        // `academicYear` is the human label the API stores alongside
                        // the id; keep the two in step whenever the id changes.
                        const match = academicYearOptions.find((option) => option.id === value);
                        form.setValue("academicYear", match?.label ?? "", {
                            shouldDirty: true,
                            shouldValidate: true,
                        });
                    }}
                />
                <RhfTextField
                    name="currentDesignation"
                    label="Current designation"
                    description="Set from your faculty profile."
                    disabled
                />
                <RhfDateField name="appraisalPeriod.fromDate" label="Appraisal from" disabled={!canEdit} />
                <RhfDateField name="appraisalPeriod.toDate" label="Appraisal to" disabled={!canEdit} />
            </FieldGrid>

            <InlineAlert tone="info" title="Where PBAS scores come from">
                Your API score is derived from the teaching, research, and institutional records in your
                profile — this form selects which of them to include, it does not replace them. Add or
                correct the underlying records in your{" "}
                <Link href="/faculty/profile" className="font-medium underline underline-offset-2">
                    faculty workspace
                </Link>
                .
            </InlineAlert>

            <div className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{designationProfile.label}</p>
                    <Badge variant="secondary">{designationBadgeLabel || "PBAS"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{designationProfile.pbasFocus}</p>
                {emphasis.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                        {emphasis.map((item) => (
                            <li
                                key={item}
                                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </div>
    );
}
