"use client";

import { Button } from "@/components/ui/button";
import type { CasAchievementBucket, CasDesignationProfile, CasResolvedValues } from "@/components/cas/cas-types";

export function CasStepReviewSubmit({
    watchedValues,
    linkedAchievements,
    designationProfile,
    isPending,
    selectedId,
    onSubmit,
}: {
    watchedValues: Partial<CasResolvedValues>;
    linkedAchievements: CasAchievementBucket;
    designationProfile: CasDesignationProfile;
    isPending: boolean;
    selectedId: string | null;
    onSubmit: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-semibold text-foreground">Review Summary</p>
                <p className="mt-2 text-sm text-muted-foreground">
                    {watchedValues.currentDesignation ?? ""} to {watchedValues.applyingForDesignation ?? ""} | PBAS linked: {(watchedValues.pbasReports ?? []).length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Linked publications/books/projects: {linkedAchievements.publications.length}/{linkedAchievements.books.length}/{linkedAchievements.researchProjects.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manual additions publications/books/projects: {(watchedValues.manualAchievements?.publications ?? []).length}/{(watchedValues.manualAchievements?.books ?? []).length}/{(watchedValues.manualAchievements?.researchProjects ?? []).length}
                </p>
                {designationProfile.showCasPhdGuided ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        PhD guided: {Number(watchedValues.manualAchievements?.phdGuided ?? 0)}
                    </p>
                ) : null}
                {designationProfile.showCasConferenceCount ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        Conference contributions: {Number(watchedValues.manualAchievements?.conferences ?? 0)}
                    </p>
                ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
                <Button loading={isPending} type="button" onClick={onSubmit} disabled={isPending || !selectedId}>
                    Submit CAS Application
                </Button>
            </div>
        </div>
    );
}
