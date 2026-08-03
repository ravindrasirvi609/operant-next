"use client";

import { useFormContext } from "react-hook-form";

import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { CasAchievementsList } from "@/components/cas/cas-achievements-list";
import { PBASSelector } from "@/components/cas/cas-pbas-selector";
import type { CasAchievementBucket, PbasOption } from "@/components/cas/cas-types";

export function CasStepPbasReports({
    canEdit,
    linkedAchievements,
    pbasOptions,
}: {
    canEdit: boolean;
    linkedAchievements: CasAchievementBucket;
    pbasOptions: PbasOption[];
}) {
    const form = useFormContext();
    const selectedIds = (form.watch("pbasReports") as string[] | undefined) ?? [];

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Linked PBAS reports"
                description="CAS scoring reuses your approved PBAS data — link the years this promotion should draw on."
            />

            <PBASSelector
                options={pbasOptions}
                selectedIds={selectedIds}
                disabled={!canEdit}
                onToggle={(id) => {
                    if (!canEdit) return;

                    const current = (form.getValues("pbasReports") as string[] | undefined) ?? [];
                    form.setValue(
                        "pbasReports",
                        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                        { shouldDirty: true, shouldValidate: true }
                    );
                }}
            />

            {selectedIds.length ? null : (
                <InlineAlert tone="warning" title="No PBAS reports linked">
                    Without a linked report your CAS score will be built only from the achievements you add
                    manually on the next steps.
                </InlineAlert>
            )}

            <CasAchievementsList
                achievements={linkedAchievements}
                title="Achievements drawn from your profile"
                description="Reused from your profile records and not editable here. Add anything missing on the next steps."
                emptyNoun="linked"
                showConferenceCount
            />
        </div>
    );
}
