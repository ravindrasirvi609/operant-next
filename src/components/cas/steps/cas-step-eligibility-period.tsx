"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CasForm } from "@/components/cas/cas-types";

export function CasStepEligibilityPeriod({
    form,
    canEdit,
}: {
    form: CasForm;
    canEdit: boolean;
}) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Field label="Eligibility From Year">
                <Input type="number" disabled={!canEdit} {...form.register("eligibilityPeriod.fromYear", { valueAsNumber: true })} />
            </Field>
            <Field label="Eligibility To Year">
                <Input type="number" disabled={!canEdit} {...form.register("eligibilityPeriod.toYear", { valueAsNumber: true })} />
            </Field>
            <Field label="Experience Years">
                <Input type="number" disabled={!canEdit} {...form.register("experienceYears", { valueAsNumber: true })} />
            </Field>
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
