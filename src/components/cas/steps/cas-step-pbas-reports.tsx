"use client";

import { LinkedAchievementsReadonly } from "@/components/cas/cas-linked-achievements-table";
import { PBASSelector } from "@/components/cas/cas-pbas-selector";
import type { CasAchievementBucket, CasForm, PbasOption } from "@/components/cas/cas-types";

export function CasStepPbasReports({
    form,
    canEdit,
    linkedAchievements,
    pbasOptions,
    selectedPbasReportIds,
}: {
    form: CasForm;
    canEdit: boolean;
    linkedAchievements: CasAchievementBucket;
    pbasOptions: PbasOption[];
    selectedPbasReportIds: string[];
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                Select approved PBAS reports. CAS API scoring primarily reuses linked PBAS data, so you only
                add achievements below when something is not already captured.
            </div>
            <LinkedAchievementsReadonly linkedAchievements={linkedAchievements} />
            <PBASSelector
                options={pbasOptions}
                selectedIds={selectedPbasReportIds}
                disabled={!canEdit}
                onToggle={(id) => {
                    if (!canEdit) return;
                    const current = form.getValues("pbasReports") ?? [];
                    form.setValue(
                        "pbasReports",
                        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                        { shouldDirty: true }
                    );
                }}
            />
        </div>
    );
}
