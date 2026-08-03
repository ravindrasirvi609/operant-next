"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CasDesignationProfile, CasForm } from "@/components/cas/cas-types";

export function CasStepAcademicContributions({
    form,
    canEdit,
    designationProfile,
}: {
    form: CasForm;
    canEdit: boolean;
    designationProfile: CasDesignationProfile;
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                {designationProfile.showCasPhdGuided
                    ? "This promotion path includes doctoral guidance as a visible CAS contribution field."
                    : "This promotion path keeps the academic contribution section lighter, with PBAS, publications, books, projects, and conference activity carrying most of the score."}
            </div>
            <div className={`grid gap-4 ${designationProfile.showCasPhdGuided && designationProfile.showCasConferenceCount ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                {designationProfile.showCasPhdGuided ? (
                    <Field label="PhD Guided">
                        <Input type="number" disabled={!canEdit} {...form.register("manualAchievements.phdGuided", { valueAsNumber: true })} />
                    </Field>
                ) : null}
                {designationProfile.showCasConferenceCount ? (
                    <Field label="Conferences">
                        <Input type="number" disabled={!canEdit} {...form.register("manualAchievements.conferences", { valueAsNumber: true })} />
                    </Field>
                ) : null}
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
