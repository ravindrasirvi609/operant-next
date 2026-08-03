"use client";

import { ArrowRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { CasAchievementsList } from "@/components/cas/cas-achievements-list";
import { emptyCasAchievementBucket } from "@/components/cas/cas-types";
import type {
    CasAchievementBucket,
    CasDesignationProfile,
    CasResolvedValues,
} from "@/components/cas/cas-types";

/**
 * Final CAS step.
 *
 * The original was a single bordered `<div>` holding five paragraphs of
 * slash-delimited counts — "Linked publications/books/projects: 3/1/2" and
 * "Manual additions publications/books/projects: 0/0/1" — which required the
 * reader to hold the column order in their head to interpret. Same numbers, as
 * labelled tiles and the actual record lists.
 *
 * Submit moved to the wizard action bar, so it is reachable without scrolling past
 * this content.
 */
export function CasStepReviewSubmit({
    watchedValues,
    linkedAchievements,
    designationProfile,
    selectedId,
    blockingReason,
}: {
    watchedValues: Partial<CasResolvedValues>;
    linkedAchievements: CasAchievementBucket;
    designationProfile: CasDesignationProfile;
    selectedId: string | null;
    /** Why submission is unavailable, if it is. */
    blockingReason: string | null;
}) {
    const manual = (watchedValues.manualAchievements ?? emptyCasAchievementBucket()) as CasAchievementBucket;
    const linkedTotal =
        linkedAchievements.publications.length +
        linkedAchievements.books.length +
        linkedAchievements.researchProjects.length;
    const manualTotal =
        manual.publications.length + manual.books.length + manual.researchProjects.length;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Review and submit"
                description="Confirm what this application will carry into the committee review."
                actions={
                    selectedId ? (
                        <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/api/cas/${selectedId}/report`}>
                                <Download aria-hidden />
                                Download PDF
                            </a>
                        </Button>
                    ) : null
                }
            />

            {blockingReason ? (
                <InlineAlert tone="warning" title="Not ready to submit">
                    {blockingReason}
                </InlineAlert>
            ) : null}

            <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Promotion applied for
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {watchedValues.currentDesignation ?? "—"}
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {watchedValues.applyingForDesignation ?? "—"}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="PBAS reports linked"
                    value={(watchedValues.pbasReports ?? []).length}
                    dense
                    tone="info"
                />
                <StatCard
                    label="From profile"
                    value={linkedTotal}
                    helper="Publications, books, projects"
                    dense
                    tone="accent"
                />
                <StatCard
                    label="Added manually"
                    value={manualTotal}
                    helper="Publications, books, projects"
                    dense
                    tone="neutral"
                />
                {designationProfile.showCasPhdGuided ? (
                    <StatCard
                        label="PhD guided"
                        value={Number(manual.phdGuided ?? 0)}
                        dense
                        tone="success"
                    />
                ) : designationProfile.showCasConferenceCount ? (
                    <StatCard
                        label="Conferences"
                        value={Number(manual.conferences ?? 0)}
                        dense
                        tone="success"
                    />
                ) : null}
            </div>

            <CasAchievementsList
                achievements={manual}
                title="Achievements you added"
                description="Entered directly in this application, on top of your PBAS-linked data."
                emptyNoun="manually added"
            />
        </div>
    );
}
