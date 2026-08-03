"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Plus, Send } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { RepeatableSection } from "@/components/forms/repeatable-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Form } from "@/components/ui/form";
import { InlineAlert } from "@/components/ui/inline-alert";
import { StatCard } from "@/components/ui/stat-card";
import { AutosaveIndicator } from "@/components/workspace/autosave-indicator";
import { DetailList } from "@/components/workspace/detail-list";
import { RecordCard } from "@/components/workspace/record-card";
import { RecordGrid, WorkspaceDetail, WorkspaceIndex } from "@/components/workspace/record-workspace";
import { StatusTimeline } from "@/components/workspace/status-timeline";
import { Wizard, useWizardSteps } from "@/components/workspace/wizard";
import { APIScoreCalculator } from "@/components/cas/cas-api-score-calculator";
import { CASCommitteeTimeline } from "@/components/cas/cas-committee-timeline";
import { CasSubmissionSummary } from "@/components/cas/cas-submission-summary";
import { CasStepAcademicContributions } from "@/components/cas/steps/cas-step-academic-contributions";
import { CasStepBasicDetails } from "@/components/cas/steps/cas-step-basic-details";
import { CasStepDocumentsChecklist } from "@/components/cas/steps/cas-step-documents-checklist";
import { CasStepEligibilityPeriod } from "@/components/cas/steps/cas-step-eligibility-period";
import { CasStepPbasReports } from "@/components/cas/steps/cas-step-pbas-reports";
import { CasStepReviewSubmit } from "@/components/cas/steps/cas-step-review-submit";
import {
    emptyCasAchievementBucket,
    type CasApp,
    type CasDocumentItem,
    type CasEligibility,
    type CasFormValues,
    type CasResolvedValues,
    type CasWorkflowStatus,
    type PbasOption,
} from "@/components/cas/cas-types";
import { casSections, casSteps } from "@/lib/cas/form-config";
import { casApplicationSchema } from "@/lib/cas/validators";
import { hasErrorsForPaths } from "@/lib/forms/has-errors-for-paths";
import { useAutosaveDraft, useUnsavedChangesWarning } from "@/lib/hooks/use-autosave-draft";
import { useRecordWorkspace } from "@/lib/hooks/use-record-workspace";
import { useResource } from "@/lib/hooks/use-resource";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import {
    getAllowedCasPromotionTargets,
    getDefaultCasTarget,
    getDesignationProfile,
} from "@/lib/faculty/options";
import { formatTimestamp } from "@/lib/ui/dates";

const EDITABLE_STATUSES = ["Draft", "Rejected"];

function emptyForm(): CasFormValues {
    const year = new Date().getFullYear();
    const currentDesignation = "Assistant Professor (Stage 1)";

    return {
        applicationYear: `${year}-${year + 1}`,
        currentDesignation,
        applyingForDesignation: getDefaultCasTarget(currentDesignation),
        eligibilityPeriod: { fromYear: year - 4, toYear: year },
        experienceYears: 0,
        pbasReports: [],
        manualAchievements: emptyCasAchievementBucket(),
    };
}

function toFormValues(application?: CasApp): CasFormValues {
    if (!application) {
        return emptyForm();
    }

    return {
        applicationYearId: application.applicationYearId,
        applicationYear: application.applicationYear,
        currentDesignation: application.currentDesignation,
        applyingForDesignation: application.applyingForDesignation,
        eligibilityPeriod: application.eligibilityPeriod,
        experienceYears: application.experienceYears,
        pbasReports: application.pbasReports,
        manualAchievements: application.manualAchievements ?? emptyCasAchievementBucket(),
    };
}

export function CasDashboard({
    initialApplications,
    pbasOptions,
    academicYearOptions,
    facultyName,
    facultyId,
    evidenceDefaults,
    eligibility,
}: {
    initialApplications: CasApp[];
    pbasOptions: PbasOption[];
    academicYearOptions: Array<{ id: string; label: string; isActive?: boolean }>;
    facultyName: string;
    facultyId: string;
    evidenceDefaults: {
        publications: Array<{ title: string; journal: string; year: number; issn?: string; indexing?: string }>;
        books: Array<{ title: string; publisher: string; isbn?: string; year: number }>;
        researchProjects: Array<{ title: string; fundingAgency: string; amount: number; year: number }>;
        phdGuided?: number;
        conferences: number;
    };
    eligibility: CasEligibility;
}) {
    const workspace = useRecordWorkspace<CasApp>({
        initialRecords: initialApplications,
        endpoint: "/api/cas",
        recordKey: "application",
        labels: { noun: "CAS application" },
    });
    const { records: applications, selected, selectedId } = workspace;

    const [docMessage, setDocMessage] = useState<string | null>(null);
    const canEdit = !selected || EDITABLE_STATUSES.includes(selected.status);

    // --- server resources ---------------------------------------------------

    const documentsResource = useResource<{ documents?: CasDocumentItem[] }, CasDocumentItem[]>({
        url: selectedId ? `/api/cas/${selectedId}/documents` : null,
        select: (payload) => payload.documents,
        errorMessage: "Unable to load the CAS document checklist.",
    });
    const documents = documentsResource.data ?? [];

    const workflowResource = useResource<{ workflow?: CasWorkflowStatus }, CasWorkflowStatus>({
        url: selectedId ? `/api/cas/${selectedId}/workflow` : null,
        select: (payload) => payload.workflow,
        errorMessage: "Unable to load the verification status.",
    });

    // --- form ---------------------------------------------------------------

    const applicationYearOptions = useMemo(() => {
        const options = [...academicYearOptions];
        const recordYear = String(selected?.applicationYear ?? "").trim();

        // A saved record may predate the academic-year collection; without this
        // the Select trigger renders blank for a legitimately stored year.
        if (recordYear && !options.some((option) => option.label === recordYear)) {
            options.unshift({ id: selected?.applicationYearId ?? recordYear, label: recordYear });
        }

        return options;
    }, [academicYearOptions, selected?.applicationYear, selected?.applicationYearId]);

    const linkedAchievements = useMemo(
        () =>
            selected?.linkedAchievements ?? {
                ...emptyCasAchievementBucket(),
                ...evidenceDefaults,
                phdGuided: evidenceDefaults.phdGuided ?? 0,
            },
        [selected?.linkedAchievements, evidenceDefaults]
    );

    const form = useForm<CasFormValues, unknown, CasResolvedValues>({
        resolver: zodResolver(casApplicationSchema),
        defaultValues: selected ? toFormValues(selected) : emptyForm(),
    });

    useEffect(() => {
        form.reset(selected ? toFormValues(selected) : emptyForm());
    }, [selectedId, selected, form]);

    const watched = useWatch({ control: form.control });
    const parsed = casApplicationSchema.safeParse(watched);
    const normalized = parsed.success ? parsed.data : casApplicationSchema.parse(emptyForm());

    const designationProfile = useMemo(
        () => getDesignationProfile(normalized.currentDesignation),
        [normalized.currentDesignation]
    );
    const allowedPromotionTargets = useMemo(
        () => getAllowedCasPromotionTargets(normalized.currentDesignation),
        [normalized.currentDesignation]
    );

    // Changing the current designation can invalidate the chosen target, so snap
    // it back to the first legal option.
    useEffect(() => {
        const options = getAllowedCasPromotionTargets(form.getValues("currentDesignation"));
        const target = form.getValues("applyingForDesignation");

        if (!options.includes(target as (typeof options)[number])) {
            form.setValue("applyingForDesignation", options[0], {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [form, watched.currentDesignation]);

    // Fields the profile does not score must not carry a stale value into the API.
    useEffect(() => {
        if (!designationProfile.showCasPhdGuided && form.getValues("manualAchievements.phdGuided") !== 0) {
            form.setValue("manualAchievements.phdGuided", 0, { shouldDirty: true, shouldValidate: true });
        }
        if (
            !designationProfile.showCasConferenceCount &&
            form.getValues("manualAchievements.conferences") !== 0
        ) {
            form.setValue("manualAchievements.conferences", 0, { shouldDirty: true, shouldValidate: true });
        }
    }, [designationProfile, form]);

    const autosave = useAutosaveDraft<CasResolvedValues, CasApp>({
        url: selectedId && canEdit ? `/api/cas/${selectedId}` : null,
        values: parsed.success ? parsed.data : null,
        isDirty: form.formState.isDirty,
        enabled: Boolean(selectedId) && canEdit,
        recordKey: "application",
        onSaved: workspace.upsert,
    });
    useUnsavedChangesWarning(autosave.hasUnsavedChanges);

    const { currentIndex, visitedSteps, goToStep } = useWizardSteps(selectedId);

    // --- derived ------------------------------------------------------------

    const score = selected?.apiScore ?? {
        teachingLearning: 0,
        researchPublication: 0,
        academicContribution: 0,
        totalScore: 0,
    };
    const computedEligibility = selected?.eligibility ?? {
        isEligible: false,
        message: selectedId
            ? "Waiting for the server to recalculate this application's score."
            : "Create a CAS draft to calculate your authoritative API score and eligibility.",
    };

    const missingMandatory = documents.filter((doc) => doc.isMandatory && !doc.documentId?._id);

    const submitBlockingReason = !selectedId
        ? "Create and open a CAS draft before submitting."
        : !canEdit
          ? `Submission is only available from Draft or Rejected. This application is ${selected?.status ?? "in an unknown state"}.`
          : !parsed.success
            ? "Fix the highlighted fields on the earlier steps first."
            : missingMandatory.length
              ? `Upload ${missingMandatory.length} outstanding mandatory document${missingMandatory.length === 1 ? "" : "s"} on the Documents step.`
              : null;

    function stepHasErrors(index: number) {
        const step = casSteps[index];
        if (!step) return false;

        // The documents step owns no form fields — its "needs attention" state is
        // the mandatory-upload check. The original switched on the magic index 6.
        if (step.id === "documents") {
            return missingMandatory.length > 0;
        }

        return hasErrorsForPaths(form.formState.errors, step.fields);
    }

    // --- mutations ----------------------------------------------------------

    const persistDocument = useCallback(
        async (documentType: string, documentId: string) => {
            if (!selectedId) return;
            setDocMessage(null);

            try {
                const payload = await requestJson<{ documents?: CasDocumentItem[] }>(
                    `/api/cas/${selectedId}/documents`,
                    {
                        method: "POST",
                        body: { documentType, documentId },
                        fallbackMessage: "Unable to attach the document.",
                    }
                );

                if (payload.documents) {
                    documentsResource.setData(payload.documents);
                }
            } catch (cause) {
                setDocMessage(toErrorMessage(cause, "Unable to attach the document."));
            }
        },
        [selectedId, documentsResource]
    );

    async function handleCreate() {
        const created = await workspace.create(form.getValues());
        if (created) {
            goToStep(0);
        }
    }

    async function handleSubmit() {
        if (!selectedId || submitBlockingReason) return;

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

    // --- index view ---------------------------------------------------------

    if (!selectedId) {
        return (
            <WorkspaceIndex
                message={workspace.message}
                listTitle="Your CAS applications"
                listDescription="Career Advancement Scheme promotion applications, past and in progress."
                listActions={
                    <Button
                        type="button"
                        loading={workspace.isPending}
                        disabled={workspace.isPending}
                        onClick={() => void handleCreate()}
                    >
                        <Plus aria-hidden />
                        Start CAS draft
                    </Button>
                }
                overview={<CasEligibilityOverview eligibility={eligibility} />}
            >
                {applications.length ? (
                    <RecordGrid>
                        {applications.map((application) => (
                            <RecordCard
                                key={application._id}
                                title={application.applyingForDesignation}
                                subtitle={`From ${application.currentDesignation} · ${application.applicationYear}`}
                                status={application.status}
                                openLabel={`Open the ${application.applicationYear} CAS application`}
                                openHint={
                                    EDITABLE_STATUSES.includes(application.status)
                                        ? "Continue editing"
                                        : "View submission"
                                }
                                onOpen={() => workspace.select(application._id)}
                                meta={[
                                    { label: "API score", value: application.apiScore.totalScore },
                                    { label: "Experience", value: `${application.experienceYears} yrs` },
                                ]}
                            />
                        ))}
                    </RecordGrid>
                ) : (
                    <EmptyState
                        bordered
                        title="No CAS applications yet"
                        description={`Start a draft when you are ready to apply for promotion, ${facultyName}. Your approved PBAS reports supply most of the score.`}
                        action={
                            <Button type="button" loading={workspace.isPending} onClick={() => void handleCreate()}>
                                <Plus aria-hidden />
                                Start CAS draft
                            </Button>
                        }
                    />
                )}
            </WorkspaceIndex>
        );
    }

    // --- detail view --------------------------------------------------------

    const step = casSteps[currentIndex];

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
                            { label: "Application year", value: selected?.applicationYear },
                            { label: "Current", value: selected?.currentDesignation },
                            { label: "Applying for", value: selected?.applyingForDesignation },
                            { label: "Total API", value: score.totalScore },
                        ]}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Verification</CardTitle>
                    <CardDescription>Read-only status from the approval workflow.</CardDescription>
                </CardHeader>
                <CardContent>
                    {workflowResource.loading ? (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : workflowResource.error ? (
                        <InlineAlert message={{ type: "error", text: workflowResource.error }} />
                    ) : workflowResource.data ? (
                        <DetailList
                            columns={1}
                            items={[
                                { label: "Status", value: workflowResource.data.status },
                                { label: "With", value: workflowResource.data.currentApproverRole },
                                { label: "Updated", value: formatTimestamp(workflowResource.data.updatedAt) },
                                {
                                    label: "Remarks",
                                    value: workflowResource.data.remarks || "None recorded",
                                },
                            ]}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Verification starts once this application is submitted.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Status timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <StatusTimeline
                        entries={selected?.statusLogs ?? []}
                        emptyTitle="Not submitted yet"
                        emptyDescription="Workflow activity appears here after you submit."
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Committee trail</CardTitle>
                </CardHeader>
                <CardContent>
                    <CASCommitteeTimeline reviews={selected?.committeeReviews ?? []} />
                </CardContent>
            </Card>
        </>
    );

    return (
        <WorkspaceDetail
            onBack={() => workspace.select(null)}
            backLabel="All applications"
            title={selected?.applyingForDesignation ?? "CAS application"}
            subtitle={selected ? `${selected.currentDesignation} · ${selected.applicationYear}` : undefined}
            status={selected?.status}
            message={workspace.message}
            rail={rail}
            railTitle="Application details"
            headerAside={
                canEdit ? <AutosaveIndicator status={autosave.status} error={autosave.error} /> : null
            }
        >
            {docMessage ? <InlineAlert message={{ type: "error", text: docMessage }} /> : null}

            {selected?.status === "Rejected" ? (
                <InlineAlert tone="danger" title="Resubmission required">
                    Check the reviewer remarks in the status timeline and the committee trail, make the
                    corrections, then submit again.
                </InlineAlert>
            ) : null}

            {canEdit ? (
                <Form {...form}>
                    <APIScoreCalculator
                        score={score}
                        eligibility={computedEligibility}
                        breakup={selected?.apiBreakup}
                    />

                    <Wizard
                        steps={casSteps}
                        currentIndex={currentIndex}
                        visitedSteps={visitedSteps}
                        onStepChange={goToStep}
                        hasErrors={stepHasErrors}
                        finalAction={
                            <Button
                                type="button"
                                size="sm"
                                loading={workspace.isPending}
                                disabled={workspace.isPending || Boolean(submitBlockingReason)}
                                title={submitBlockingReason ?? undefined}
                                onClick={() => void handleSubmit()}
                            >
                                <Send aria-hidden />
                                Submit application
                            </Button>
                        }
                    >
                        {step?.id === "basic-details" ? (
                            <CasStepBasicDetails
                                canEdit={canEdit}
                                applicationYearOptions={applicationYearOptions}
                                designationProfile={designationProfile}
                                allowedPromotionTargets={allowedPromotionTargets}
                            />
                        ) : null}

                        {step?.id === "eligibility-period" ? (
                            <CasStepEligibilityPeriod canEdit={canEdit} />
                        ) : null}

                        {step?.id === "pbas-reports" ? (
                            <CasStepPbasReports
                                canEdit={canEdit}
                                linkedAchievements={linkedAchievements}
                                pbasOptions={pbasOptions}
                            />
                        ) : null}

                        {step?.id === "publications" ? (
                            <RepeatableSection config={casSections.publications} disabled={!canEdit} />
                        ) : null}

                        {step?.id === "books-projects" ? (
                            <div className="space-y-8">
                                <RepeatableSection config={casSections.books} disabled={!canEdit} />
                                <RepeatableSection config={casSections.researchProjects} disabled={!canEdit} />
                            </div>
                        ) : null}

                        {step?.id === "academic-contributions" ? (
                            <CasStepAcademicContributions
                                canEdit={canEdit}
                                designationProfile={designationProfile}
                            />
                        ) : null}

                        {step?.id === "documents" ? (
                            <CasStepDocumentsChecklist
                                canEdit={canEdit}
                                facultyId={facultyId}
                                documents={documents}
                                docLoading={documentsResource.loading}
                                docError={documentsResource.error}
                                onPersistDocument={(documentType, documentId) =>
                                    void persistDocument(documentType, documentId)
                                }
                            />
                        ) : null}

                        {step?.id === "review" ? (
                            <CasStepReviewSubmit
                                watchedValues={normalized}
                                linkedAchievements={linkedAchievements}
                                designationProfile={designationProfile}
                                selectedId={selectedId}
                                blockingReason={submitBlockingReason}
                            />
                        ) : null}
                    </Wizard>
                </Form>
            ) : selected ? (
                <CasSubmissionSummary
                    application={selected}
                    pbasOptions={pbasOptions}
                    documents={documents}
                    docLoading={documentsResource.loading}
                    docError={documentsResource.error}
                />
            ) : null}
        </WorkspaceDetail>
    );
}

/** Eligibility strip on the index view. */
function CasEligibilityOverview({ eligibility }: { eligibility: CasEligibility }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                    label="Eligibility"
                    value={eligibility.eligible ? "Eligible" : "Not eligible"}
                    helper={eligibility.reason}
                    icon={eligibility.eligible ? CheckCircle2 : AlertTriangle}
                    tone={eligibility.eligible ? "success" : "warning"}
                    dense
                />
                <StatCard
                    label="Required"
                    value={`${eligibility.requiredYears ?? "—"} yrs · API ${eligibility.requiredScore ?? "—"}`}
                    helper={`Next stage: ${eligibility.nextDesignation ?? "Not configured"}`}
                    dense
                    tone="info"
                />
                <StatCard
                    label="Approved PBAS"
                    value={eligibility.lastApprovedApiScore ?? 0}
                    helper={
                        eligibility.lastApprovedYear
                            ? `Year ${eligibility.lastApprovedYear} · ${eligibility.approvedPbasCount} approved`
                            : "No approved PBAS yet"
                    }
                    dense
                    tone="accent"
                />
            </div>

            {eligibility.missingProfileFields.length ? (
                <InlineAlert tone="warning" title="Your profile is incomplete">
                    Eligibility cannot be fully assessed until these are filled in:
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                        {eligibility.missingProfileFields.map((field) => (
                            <li key={field}>{field}</li>
                        ))}
                    </ul>
                </InlineAlert>
            ) : null}
        </div>
    );
}
