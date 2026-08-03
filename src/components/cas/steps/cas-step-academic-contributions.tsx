"use client";

import { FieldGrid, RhfNumberField } from "@/components/forms/rhf-fields";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import type { CasDesignationProfile } from "@/components/cas/cas-types";

/**
 * PhD guidance and conference counts — both shown only for the designations
 * where they are scored.
 *
 * The original computed its grid class from the two flags
 * (`showCasPhdGuided && showCasConferenceCount ? "md:grid-cols-2" : "md:grid-cols-1"`)
 * so it could avoid a lone field stretching across two columns. `FieldGrid`'s
 * columns are content-driven, so one field simply occupies one cell.
 *
 * When neither flag is set the step previously rendered an explanatory paragraph
 * and then an empty grid — a step with no inputs and no acknowledgement of that.
 */
export function CasStepAcademicContributions({
    canEdit,
    designationProfile,
}: {
    canEdit: boolean;
    designationProfile: CasDesignationProfile;
}) {
    const { showCasPhdGuided, showCasConferenceCount } = designationProfile;
    const hasFields = showCasPhdGuided || showCasConferenceCount;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Academic contributions"
                description={
                    showCasPhdGuided
                        ? "This promotion path scores doctoral guidance directly."
                        : "This promotion path draws most of its score from PBAS, publications, books, and projects."
                }
            />

            {hasFields ? (
                <FieldGrid>
                    {showCasPhdGuided ? (
                        <RhfNumberField
                            name="manualAchievements.phdGuided"
                            label="PhD scholars guided"
                            min={0}
                            disabled={!canEdit}
                        />
                    ) : null}
                    {showCasConferenceCount ? (
                        <RhfNumberField
                            name="manualAchievements.conferences"
                            label="Conference contributions"
                            min={0}
                            disabled={!canEdit}
                        />
                    ) : null}
                </FieldGrid>
            ) : (
                <InlineAlert tone="info" title="Nothing to enter on this step">
                    Neither doctoral guidance nor conference counts are scored for your promotion path. Continue
                    to the next step.
                </InlineAlert>
            )}
        </div>
    );
}
