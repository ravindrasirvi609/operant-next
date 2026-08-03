"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Form } from "@/components/ui/form";
import { InlineAlert } from "@/components/ui/inline-alert";
import { StatCard, StatTile } from "@/components/ui/stat-card";
import { AutosaveIndicator } from "@/components/workspace/autosave-indicator";
import { DetailList } from "@/components/workspace/detail-list";
import { RecordCard } from "@/components/workspace/record-card";
import { RecordGrid, WorkspaceDetail, WorkspaceIndex } from "@/components/workspace/record-workspace";
import { StatusTimeline } from "@/components/workspace/status-timeline";
import { Wizard, useWizardSteps } from "@/components/workspace/wizard";
import { PbasStepDetails } from "@/components/pbas/steps/pbas-step-details";
import { PbasStepScoreReview } from "@/components/pbas/steps/pbas-step-score-review";
import { PbasStepSources } from "@/components/pbas/steps/pbas-step-sources";
import { PbasSubmissionSummary } from "@/components/pbas/pbas-submission-summary";
import { useAutosaveDraft, useUnsavedChangesWarning } from "@/lib/hooks/use-autosave-draft";
import { useRecordWorkspace } from "@/lib/hooks/use-record-workspace";
import { useResource } from "@/lib/hooks/use-resource";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import { getDesignationProfile } from "@/lib/faculty/options";
import { hasErrorsForPaths } from "@/lib/forms/has-errors-for-paths";
import { pbasApplicationSchema } from "@/lib/pbas/validators";
import {
    PBAS_DETAILS_STEP_FIELDS,
    pbasSourceSteps,
    pbasSteps,
} from "@/lib/pbas/source-config";
import { buildPbasSourceTables, togglePbasReference } from "@/lib/pbas/source-tables";
import { formatDateRange } from "@/lib/ui/dates";
import type {
    IndicatorEntry,
    PbasApp,
    PbasDetail,
    PbasDraftReferences,
    PbasFormValues,
    PbasSourceRow,
    PbasSummary,
} from "@/components/pbas/pbas-types";

const EDITABLE_STATUSES = ["Draft", "Rejected"];
/** Statuses that occupy the single active-application slot. */
const ACTIVE_STATUSES = new Set(["Draft", "Rejected", "Submitted", "Under Review", "Committee Review"]);

function emptyForm(prefill?: Partial<PbasFormValues>): PbasFormValues {
    const year = new Date().getFullYear();

    return {
        academicYear: `${year}-${year + 1}`,
        currentDesignation: "Assistant Professor (Stage 1)",
        ...prefill,
        appraisalPeriod: {
            fromDate: `${year}-06-01`,
            toDate: `${year + 1}-05-31`,
            ...prefill?.appraisalPeriod,
        },
    };
}

function toFormValues(application?: PbasApp, prefill?: Partial<PbasFormValues>): PbasFormValues {
    if (!application) {
        return emptyForm(prefill);
    }

    return {
        academicYearId: application.academicYearId,
        academicYear: application.academicYear,
        currentDesignation: application.currentDesignation,
        appraisalPeriod: application.appraisalPeriod,
    };
}

export function PbasDashboard({
    initialApplications,
    facultyName,
    facultyId,
    summary,
}: {
    initialApplications: PbasApp[];
    facultyName: string;
    facultyId: string;
    summary: PbasSummary;
}) {
    const workspace = useRecordWorkspace<PbasApp>({
        initialRecords: initialApplications,
        endpoint: "/api/pbas",
        recordKey: "application",
        labels: { noun: "PBAS application" },
    });
    const { records: applications, selected, selectedId } = workspace;

    const [entryMessage, setEntryMessage] = useState<string | null>(null);
    const [references, setReferences] = useState<PbasDraftReferences | null>(null);

    const canEdit = !selected || EDITABLE_STATUSES.includes(selected.status);
    const activeApplication = useMemo(
        () => applications.find((item) => ACTIVE_STATUSES.has(item.status)),
        [applications]
    );

    // --- server resources for the selected draft ----------------------------

    const detail = useResource<{ application?: PbasDetail }, PbasDetail>({
        url: selectedId ? `/api/pbas/${selectedId}` : null,
        select: (payload) => payload.application,
        errorMessage: "Unable to load this PBAS application's details.",
    });

    const entriesResource = useResource<{ entries?: { items?: IndicatorEntry[] } }, IndicatorEntry[]>({
        url: selectedId ? `/api/pbas/${selectedId}/entries` : null,
        select: (payload) => payload.entries?.items,
        errorMessage: "Unable to load PBAS indicator entries.",
    });
    const entries = entriesResource.data ?? [];

    // Draft references are edited locally (each toggle is optimistic) so they are
    // mirrored into state rather than read straight off the fetched detail.
    useEffect(() => {
        setReferences(detail.data?.draftReferences ?? null);
    }, [detail.data]);

    // --- form ---------------------------------------------------------------

    const academicYearOptions = useMemo<Array<{ id: string; label: string; isActive: boolean }>>(() => {
        if (summary.academicYearOptions?.length) {
            return summary.academicYearOptions;
        }

        // Older records predate the academic-year collection, so fall back to the
        // active year and finally to whatever label the meta carries.
        const fallbackLabel = summary.activeYear?.label ?? summary.meta.academicYear;
        if (!fallbackLabel) {
            return [];
        }

        return [{ id: summary.activeYear?.id ?? fallbackLabel, label: fallbackLabel, isActive: true }];
    }, [summary]);

    const defaultDraft = useMemo(() => {
        const fallback = academicYearOptions.find((option) => option.isActive) ?? academicYearOptions[0];
        return emptyForm({
            ...summary.meta,
            academicYearId: fallback?.id,
            academicYear: fallback?.label ?? summary.meta.academicYear,
        });
    }, [academicYearOptions, summary.meta]);

    const form = useForm<PbasFormValues>({
        resolver: zodResolver(pbasApplicationSchema),
        defaultValues: selected ? toFormValues(selected, summary.meta) : defaultDraft,
    });

    useEffect(() => {
        form.reset(selected ? toFormValues(selected, summary.meta) : defaultDraft);
    }, [selectedId, selected, form, defaultDraft, summary.meta]);

    const watched = useWatch({ control: form.control });
    const parsed = pbasApplicationSchema.safeParse(watched);

    const autosave = useAutosaveDraft<PbasFormValues, PbasApp>({
        url: selectedId && canEdit ? `/api/pbas/${selectedId}` : null,
        values: parsed.success ? parsed.data : null,
        isDirty: form.formState.isDirty,
        enabled: Boolean(selectedId) && canEdit,
        recordKey: "application",
        onSaved: (application) => {
            workspace.upsert(application);
            detail.setData({ ...(detail.data as PbasDetail), ...application });
        },
    });
    useUnsavedChangesWarning(autosave.hasUnsavedChanges);

    const designationProfile = useMemo(
        () =>
            getDesignationProfile(
                watched.currentDesignation ?? selected?.currentDesignation ?? summary.meta.currentDesignation
            ),
        [watched.currentDesignation, selected?.currentDesignation, summary.meta.currentDesignation]
    );

    // --- derived view data --------------------------------------------------

    const snapshot = detail.data?.snapshot ?? selected?.snapshot ?? summary.snapshot;
    const score = detail.data?.apiScore ?? selected?.apiScore ?? summary.apiScore;

    const sourceTables = useMemo(() => {
        if (!detail.data || !references) {
            return null;
        }

        return buildPbasSourceTables(detail.data.candidates, references, designationProfile.key);
    }, [detail.data, references, designationProfile.key]);

    const submittedAt = useMemo(() => {
        const log = [...(selected?.statusLogs ?? [])].reverse().find((item) => item.status === "Submitted");
        return log?.changedAt ?? detail.data?.activeRevision?.submittedAt;
    }, [selected, detail.data]);

    const submitDisabledReason = !selectedId
        ? "Create and open a PBAS draft before submitting."
        : !canEdit
          ? `Submission is only available from Draft or Rejected. This application is ${selected?.status ?? "in an unknown state"}.`
          : !parsed.success
            ? "Fix the highlighted fields on the Application Details step first."
            : null;

    // --- mutations ----------------------------------------------------------

    const persistReferences = useCallback(
        async (next: PbasDraftReferences) => {
            if (!selectedId) return;

            const previous = references;
            setReferences(next);

            try {
                const payload = await requestJson<{ application?: PbasDetail }>(
                    `/api/pbas/${selectedId}/references`,
                    {
                        method: "PUT",
                        body: next,
                        fallbackMessage: "Unable to update the records included in this PBAS report.",
                    }
                );

                if (payload.application) {
                    detail.setData(payload.application);
                    workspace.upsert(payload.application);
                }
            } catch (cause) {
                // Put the toggle back — the original left the UI showing a change
                // the server had rejected.
                setReferences(previous);
                workspace.setMessage({
                    type: "error",
                    text: toErrorMessage(cause, "Unable to update the records included in this PBAS report."),
                });
            }
        },
        [selectedId, references, detail, workspace]
    );

    const toggleSource = useCallback(
        (row: PbasSourceRow) => {
            if (!row.referenceKey || !references) return;
            void persistReferences(togglePbasReference(references, row.referenceKey, row.id));
        },
        [references, persistReferences]
    );

    const uploadEvidence = useCallback(
        async (indicatorId: string, documentId: string) => {
            if (!selectedId) return;
            setEntryMessage(null);

            try {
                const payload = await requestJson<{ entries?: { items?: IndicatorEntry[] } }>(
                    `/api/pbas/${selectedId}/entries`,
                    {
                        method: "POST",
                        body: { indicatorId, evidenceDocumentId: documentId },
                        fallbackMessage: "Unable to attach the evidence document.",
                    }
                );

                if (payload.entries?.items) {
                    entriesResource.setData(payload.entries.items);
                }
            } catch (cause) {
                setEntryMessage(toErrorMessage(cause, "Unable to attach the evidence document."));
            }
        },
        [selectedId, entriesResource]
    );

    async function handleSubmit() {
        if (!selectedId) return;

        // Flush any pending debounce so the server validates the latest values.
        // The original could submit up to 1.2s of edits behind the form.
        if (autosave.hasUnsavedChanges) {
            const saved = await autosave.save();
            if (!saved) {
                workspace.setMessage({
                    type: "error",
                    text: "Your latest changes could not be saved, so the application was not submitted.",
                });
                return;
            }
        }

        await workspace.submit(selectedId);
    }

    async function handleCreate() {
        const created = await workspace.create(form.getValues());
        if (created) {
            goToStep(0);
        }
    }

    // --- wizard -------------------------------------------------------------

    const { currentIndex, visitedSteps, goToStep } = useWizardSteps(selectedId);

    function stepHasErrors(index: number) {
        // Only the details step owns form fields; source selection and the score
        // review are server-driven and cannot be in an invalid state.
        return index === 0 && hasErrorsForPaths(form.formState.errors, PBAS_DETAILS_STEP_FIELDS);
    }

    function renderStep() {
        const stepId = pbasSteps[currentIndex]?.id;

        if (stepId === "details") {
            return (
                <PbasStepDetails
                    academicYearOptions={academicYearOptions}
                    canEdit={canEdit}
                    designationProfile={designationProfile}
                    designationBadgeLabel={String(
                        watched.currentDesignation ?? selected?.currentDesignation ?? ""
                    )}
                />
            );
        }

        if (stepId === "review") {
            return (
                <PbasStepScoreReview
                    score={score}
                    caps={summary.scoringWeights.caps}
                    entries={entries}
                    entryLoading={entriesResource.loading}
                    entryError={entriesResource.error}
                    canEdit={canEdit}
                    facultyId={facultyId}
                    onUploadEvidence={(indicatorId, documentId) =>
                        void uploadEvidence(indicatorId, documentId)
                    }
                    revisionHistory={detail.data?.revisionHistory ?? []}
                    selectedId={selectedId}
                    submitDisabledReason={submitDisabledReason}
                />
            );
        }

        const descriptor = pbasSourceSteps.find((step) => step.key === stepId);
        if (!descriptor) {
            return null;
        }

        return (
            <PbasStepSources
                descriptor={descriptor}
                config={sourceTables?.[descriptor.key]}
                snapshot={snapshot}
                canEdit={canEdit}
                onToggle={toggleSource}
                loading={detail.loading}
                error={detail.error}
                hasDetail={Boolean(sourceTables)}
            />
        );
    }

    // --- index view ---------------------------------------------------------

    if (!selectedId) {
        return (
            <WorkspaceIndex
                message={workspace.message}
                listTitle="Your PBAS applications"
                listDescription="Open a draft to continue, or review a submitted year."
                listActions={
                    <Button
                        type="button"
                        loading={workspace.isPending}
                        disabled={workspace.isPending || Boolean(activeApplication)}
                        onClick={() => void handleCreate()}
                    >
                        <Plus aria-hidden />
                        Start PBAS draft
                    </Button>
                }
                overview={<PbasOverview summary={summary} activeApplication={activeApplication} />}
            >
                {applications.length ? (
                    <RecordGrid>
                        {applications.map((application) => (
                            <RecordCard
                                key={application._id}
                                title={application.academicYear}
                                subtitle={application.currentDesignation}
                                status={application.status}
                                openLabel={`Open the ${application.academicYear} PBAS application`}
                                openHint={
                                    EDITABLE_STATUSES.includes(application.status)
                                        ? "Continue editing"
                                        : "View submission"
                                }
                                onOpen={() => workspace.select(application._id)}
                                meta={[
                                    { label: "API score", value: application.apiScore.totalScore },
                                    {
                                        label: "Period",
                                        value: formatDateRange(
                                            application.appraisalPeriod.fromDate,
                                            application.appraisalPeriod.toDate
                                        ),
                                    },
                                ]}
                                actions={
                                    application.status === "Draft" ? (
                                        <ConfirmButton
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            loading={workspace.isPending}
                                            onConfirm={() => void workspace.remove(application._id)}
                                            title="Delete this PBAS draft?"
                                            description={`The ${application.academicYear} draft will be permanently deleted. This cannot be undone.`}
                                            aria-label={`Delete the ${application.academicYear} PBAS draft`}
                                        >
                                            <Trash2 className="size-4" aria-hidden />
                                        </ConfirmButton>
                                    ) : null
                                }
                            />
                        ))}
                    </RecordGrid>
                ) : (
                    <EmptyState
                        bordered
                        title="No PBAS applications yet"
                        description={`Start a draft to begin your annual appraisal, ${facultyName}. Your teaching, research, and institutional records are pulled in automatically.`}
                        action={
                            <Button type="button" loading={workspace.isPending} onClick={() => void handleCreate()}>
                                <Plus aria-hidden />
                                Start PBAS draft
                            </Button>
                        }
                    />
                )}
            </WorkspaceIndex>
        );
    }

    // --- detail view --------------------------------------------------------

    const rail = (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Application</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailList
                        columns={1}
                        items={[
                            { label: "Academic year", value: selected?.academicYear },
                            { label: "Designation", value: selected?.currentDesignation },
                            { label: "Total API", value: score.totalScore },
                        ]}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Status timeline</CardTitle>
                    <CardDescription>Every transition is recorded here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <StatusTimeline
                        entries={selected?.statusLogs ?? []}
                        emptyTitle="Not submitted yet"
                        emptyDescription="Workflow activity appears here after you submit."
                    />
                </CardContent>
            </Card>
        </>
    );

    return (
        <WorkspaceDetail
            onBack={() => workspace.select(null)}
            backLabel="All applications"
            title={selected?.academicYear ?? "PBAS application"}
            subtitle={selected?.currentDesignation}
            status={selected?.status}
            message={workspace.message}
            rail={rail}
            railTitle="Application details"
            headerAside={
                canEdit ? (
                    <AutosaveIndicator status={autosave.status} error={autosave.error} />
                ) : null
            }
        >
            {entryMessage ? <InlineAlert message={{ type: "error", text: entryMessage }} /> : null}

            {selected?.status === "Rejected" ? (
                <InlineAlert tone="danger" title="Resubmission required">
                    This application was rejected. Check the reviewer remarks in the status timeline, make the
                    corrections, then submit again.
                </InlineAlert>
            ) : null}

            {canEdit ? (
                <Form {...form}>
                    <Wizard
                        steps={pbasSteps}
                        currentIndex={currentIndex}
                        visitedSteps={visitedSteps}
                        onStepChange={goToStep}
                        hasErrors={stepHasErrors}
                        finalAction={
                            <Button
                                type="button"
                                size="sm"
                                loading={workspace.isPending}
                                disabled={workspace.isPending || Boolean(submitDisabledReason)}
                                title={submitDisabledReason ?? undefined}
                                onClick={() => void handleSubmit()}
                            >
                                <Send aria-hidden />
                                Submit application
                            </Button>
                        }
                    >
                        {renderStep()}
                    </Wizard>
                </Form>
            ) : selected ? (
                <PbasSubmissionSummary
                    application={selected}
                    submittedAt={submittedAt}
                    sourceTables={sourceTables}
                    sourcesLoading={detail.loading}
                    sourcesError={detail.error}
                    snapshot={snapshot}
                    caps={summary.scoringWeights.caps}
                    entries={entries}
                    entryLoading={entriesResource.loading}
                    entryError={entriesResource.error}
                    revisionHistory={detail.data?.revisionHistory ?? []}
                />
            ) : null}
        </WorkspaceDetail>
    );
}

/**
 * Year readiness strip.
 *
 * The original stacked a 3-tile grid and a 6-tile grid inside one card, both at
 * `md:grid-cols-N` with no phone case — six tiles at `md:grid-cols-6` gave each
 * one about 120px on a tablet, enough for the label to wrap to three lines.
 */
function PbasOverview({
    summary,
    activeApplication,
}: {
    summary: PbasSummary;
    activeApplication?: PbasApp;
}) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                    label="Active year"
                    value={summary.activeYear?.label || "Not configured"}
                    dense
                    tone="info"
                />
                <StatCard
                    label="Submission deadline"
                    value={summary.submissionDeadline || "Not configured"}
                    dense
                    tone="warning"
                />
                <StatCard
                    label="Last approved API"
                    value={summary.lastApprovedApiScore ?? 0}
                    helper={
                        summary.lastApprovedYear ? `Year ${summary.lastApprovedYear}` : "No approved PBAS yet"
                    }
                    dense
                    tone="success"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Records available this year</CardTitle>
                    <CardDescription>
                        Drawn from your faculty profile. These are the pools your draft selects from.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    <StatTile label="Teaching hours" value={summary.stats.teachingLoadHours} />
                    <StatTile label="Publications" value={summary.stats.publicationCount} />
                    <StatTile label="Projects" value={summary.stats.projectCount} />
                    <StatTile label="FDPs" value={summary.stats.fdpCount} />
                    <StatTile label="Admin roles" value={summary.stats.adminRoleCount} />
                    <StatTile label="Evidence" value={summary.stats.evidenceCount} />
                </CardContent>
            </Card>

            {activeApplication ? (
                <InlineAlert tone="info" title="One application at a time">
                    Your {activeApplication.academicYear} application is {activeApplication.status.toLowerCase()}.
                    Complete it, or wait for it to be approved or rejected, before starting another.
                </InlineAlert>
            ) : null}

            {summary.warnings.length ? (
                <InlineAlert tone="warning" title="Attention needed">
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                        {summary.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </InlineAlert>
            ) : null}
        </div>
    );
}
