"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { RepeatableSection } from "@/components/forms/repeatable-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
import { AqarContributionTables } from "@/components/aqar/aqar-contribution-tables";
import { AqarStepOverview, type AqarYearOption } from "@/components/aqar/aqar-step-overview";
import { AqarStepReview } from "@/components/aqar/aqar-step-review";
import { getAcademicYearReportingPeriod } from "@/lib/academic-year";
import {
    aqarSections,
    aqarStepFieldPaths,
    aqarSteps,
    reviewChecklistItems,
} from "@/lib/aqar/form-config";
import { computeAqarMetrics, computeAqarReadiness } from "@/lib/aqar/metrics";
import { aqarApplicationSchema } from "@/lib/aqar/validators";
import { hasErrorsForPaths } from "@/lib/forms/has-errors-for-paths";
import { useAutosaveDraft, useUnsavedChangesWarning } from "@/lib/hooks/use-autosave-draft";
import { useRecordWorkspace } from "@/lib/hooks/use-record-workspace";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import { formatDateRange, formatTimestamp } from "@/lib/ui/dates";

type AqarFormValues = z.input<typeof aqarApplicationSchema>;
type AqarResolvedValues = z.output<typeof aqarApplicationSchema>;
type AqarContribution = AqarResolvedValues["facultyContribution"];

export type AqarApp = {
    _id: string;
    academicYearId?: string;
    academicYear: string;
    reportingPeriod: { fromDate: string; toDate: string };
    facultyContribution: AqarContribution;
    metrics: Record<string, number> & { totalContributionIndex: number };
    status: string;
    statusLogs: Array<{
        _id?: string;
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt: string;
    }>;
    updatedAt?: string;
    createdAt?: string;
    submittedAt?: string;
};

const EDITABLE_STATUSES = ["Draft", "Rejected"];

/**
 * Empty value for every contribution array, derived from the section config
 * rather than written out as twelve literal `[]`s.
 *
 * `Object.fromEntries` erases the key names, so TypeScript cannot see that this
 * produces exactly the twelve keys `AqarContribution` requires. The
 * `form-config.test.ts` case "covers every facultyContribution array in the
 * schema" is what actually holds the two in sync.
 */
function emptyContribution(): AqarContribution {
    return Object.fromEntries(
        Object.values(aqarSections).map((section) => [section.arrayName.split(".")[1], []])
    ) as unknown as AqarContribution;
}

function emptyForm(defaultAcademicYear = ""): AqarFormValues {
    const period = getAcademicYearReportingPeriod(defaultAcademicYear);

    return {
        academicYear: defaultAcademicYear,
        reportingPeriod: { fromDate: period?.fromDate ?? "", toDate: period?.toDate ?? "" },
        facultyContribution: emptyContribution(),
    };
}

function toFormValues(application: AqarApp): AqarFormValues {
    return {
        academicYearId: application.academicYearId,
        academicYear: application.academicYear,
        reportingPeriod: application.reportingPeriod,
        facultyContribution: application.facultyContribution,
    };
}

/** Most recent timestamp on the record, for the "last activity" line. */
function getLastActivity(application: AqarApp): string | undefined {
    const candidates = [
        application.updatedAt,
        application.submittedAt,
        application.createdAt,
        ...application.statusLogs.map((log) => log.changedAt),
    ].filter(Boolean) as string[];

    if (!candidates.length) return undefined;

    return candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

export function AqarDashboard({
    initialApplications,
    facultyName,
    facultyId,
    academicYearOptions,
    evidenceDefaults,
}: {
    initialApplications: AqarApp[];
    facultyName: string;
    facultyId: string;
    academicYearOptions: AqarYearOption[];
    evidenceDefaults: AqarContribution;
}) {
    const workspace = useRecordWorkspace<AqarApp>({
        initialRecords: initialApplications,
        endpoint: "/api/aqar",
        recordKey: "application",
        labels: { noun: "AQAR application" },
    });
    const { records: applications, selected, selectedId } = workspace;

    const [prefillDefaults, setPrefillDefaults] = useState(evidenceDefaults);
    const [prefillYear, setPrefillYear] = useState(initialApplications[0]?.academicYear ?? "");
    const [isPrefillLoading, setIsPrefillLoading] = useState(false);
    const [checks, setChecks] = useState<boolean[]>(() => reviewChecklistItems.map(() => false));

    const editable = !selected || EDITABLE_STATUSES.includes(selected.status);

    const activeYear = useMemo(
        () => academicYearOptions.find((option) => option.isActive) ?? academicYearOptions[0],
        [academicYearOptions]
    );

    /**
     * Year options, plus the selected record's own year when it predates the
     * academic-year collection — otherwise the Select would show a blank trigger
     * for a legitimately saved record.
     */
    const yearOptions = useMemo<AqarYearOption[]>(() => {
        const options = [...academicYearOptions];
        const recordYear = String(selected?.academicYear ?? "").trim();

        if (recordYear && !options.some((option) => option.label === recordYear)) {
            options.unshift({ id: selected?.academicYearId ?? recordYear, label: recordYear });
        }

        return options;
    }, [academicYearOptions, selected?.academicYear, selected?.academicYearId]);

    const defaultValues = useMemo<AqarFormValues>(() => {
        if (selected) {
            return toFormValues(selected);
        }

        const base = emptyForm(activeYear?.label ?? "");
        return {
            ...base,
            academicYearId: activeYear?.id,
            facultyContribution: { ...base.facultyContribution, ...prefillDefaults },
        };
    }, [selected, activeYear, prefillDefaults]);

    const form = useForm<AqarFormValues, unknown, AqarResolvedValues>({
        resolver: zodResolver(aqarApplicationSchema),
        defaultValues,
    });

    useEffect(() => {
        form.reset(defaultValues);
    }, [form, defaultValues]);

    const watched = useWatch({ control: form.control });
    const parsed = aqarApplicationSchema.safeParse(watched);

    // Metrics come off the raw watched values rather than a parsed copy: a draft
    // with one half-typed entry does not parse, and the counts should still update.
    const contribution = (watched.facultyContribution ?? {}) as unknown as Record<string, unknown[]>;
    const liveMetrics = useMemo(() => computeAqarMetrics(contribution), [contribution]);
    const readiness = useMemo(() => computeAqarReadiness(contribution), [contribution]);

    const autosave = useAutosaveDraft<AqarResolvedValues, AqarApp>({
        url: selectedId && editable ? `/api/aqar/${selectedId}` : null,
        values: parsed.success ? parsed.data : null,
        isDirty: form.formState.isDirty,
        enabled: Boolean(selectedId) && editable,
        recordKey: "application",
        onSaved: workspace.upsert,
    });
    useUnsavedChangesWarning(autosave.hasUnsavedChanges);

    const { currentIndex, visitedSteps, goToStep } = useWizardSteps(selectedId);

    // --- profile prefill ----------------------------------------------------

    const loadYearPrefill = useCallback(
        async (academicYear: string, options?: { announce?: boolean }) => {
            const year = academicYear.trim();
            if (!year) return;

            setIsPrefillLoading(true);

            try {
                const payload = await requestJson<{
                    defaults?: { aqar?: AqarContribution };
                }>(`/api/faculty/report-defaults?academicYear=${encodeURIComponent(year)}`, {
                    cache: "no-store",
                    fallbackMessage: `Unable to load your ${year} records.`,
                });

                if (!payload.defaults?.aqar) {
                    throw new Error(`No profile records found for ${year}.`);
                }

                setPrefillDefaults(payload.defaults.aqar);
                setPrefillYear(year);
                form.setValue("facultyContribution", payload.defaults.aqar, {
                    shouldDirty: Boolean(selectedId),
                    shouldTouch: true,
                });

                if (options?.announce ?? true) {
                    workspace.setMessage({
                        type: "success",
                        text: `Loaded your ${year} records from your faculty profile.`,
                    });
                }
            } catch (cause) {
                workspace.setMessage({
                    type: "error",
                    text: toErrorMessage(cause, `Unable to load your ${year} records.`),
                });
            } finally {
                setIsPrefillLoading(false);
            }
        },
        [form, selectedId, workspace]
    );

    const watchedYear = String(watched.academicYear ?? "");

    // Auto-prefill an untouched new draft when its year changes. Guarded on "no
    // rows yet" so it can never clobber typed-in entries.
    useEffect(() => {
        if (selected || !editable || !watchedYear || prefillYear === watchedYear) {
            return;
        }

        const hasRows = Object.values(form.getValues("facultyContribution") ?? {}).some(
            (value) => Array.isArray(value) && value.length > 0
        );
        if (hasRows) return;

        void loadYearPrefill(watchedYear, { announce: false });
    }, [selected, editable, watchedYear, prefillYear, form, loadYearPrefill]);

    // --- actions ------------------------------------------------------------

    const reviewReady = checks.every(Boolean);

    async function handleCreate() {
        const created = await workspace.create(form.getValues());
        if (created) {
            setChecks(reviewChecklistItems.map(() => false));
            goToStep(0);
        }
    }

    async function handleSubmit() {
        if (!selectedId) return;

        if (!reviewReady) {
            workspace.setMessage({
                type: "error",
                text: "Confirm all three checklist items before submitting.",
            });
            return;
        }

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

    function stepHasErrors(index: number) {
        const step = aqarSteps[index];
        return step ? hasErrorsForPaths(form.formState.errors, aqarStepFieldPaths(step)) : false;
    }

    /**
     * Advancing validates the fields of every step being skipped over, which is
     * how the original `goToStep` behaved. Going back never validates — being
     * unable to return to a previous step to fix something would be a trap.
     */
    async function handleStepChange(target: number) {
        if (target <= currentIndex) {
            goToStep(target);
            return;
        }

        for (let index = currentIndex; index < target; index += 1) {
            const step = aqarSteps[index];
            const valid = await form.trigger(aqarStepFieldPaths(step) as never, { shouldFocus: true });

            if (!valid) {
                goToStep(index);
                return;
            }
        }

        goToStep(target);
    }

    // --- index view ---------------------------------------------------------

    if (!selectedId) {
        return (
            <WorkspaceIndex
                message={workspace.message}
                listTitle="Your AQAR reports"
                listDescription="One report per academic year, prefilled from your faculty profile."
                listActions={
                    <Button
                        type="button"
                        loading={workspace.isPending}
                        disabled={workspace.isPending}
                        onClick={() => void handleCreate()}
                    >
                        <Plus aria-hidden />
                        Start AQAR draft
                    </Button>
                }
                overview={
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <StatCard
                            label="Reports"
                            value={applications.length}
                            helper="Drafts and submitted years"
                            dense
                            tone="info"
                        />
                        <StatCard
                            label="Active year"
                            value={activeYear?.label ?? "Not configured"}
                            dense
                            tone="accent"
                        />
                        <StatCard
                            label="Records available"
                            value={Object.values(prefillDefaults ?? {}).reduce(
                                (total, value) => total + (Array.isArray(value) ? value.length : 0),
                                0
                            )}
                            helper="In your profile for the active year"
                            dense
                            tone="success"
                        />
                    </div>
                }
            >
                {applications.length ? (
                    <RecordGrid>
                        {applications.map((application) => (
                            <RecordCard
                                key={application._id}
                                title={application.academicYear}
                                subtitle={formatDateRange(
                                    application.reportingPeriod.fromDate,
                                    application.reportingPeriod.toDate
                                )}
                                status={application.status}
                                openLabel={`Open the ${application.academicYear} AQAR report`}
                                openHint={
                                    EDITABLE_STATUSES.includes(application.status)
                                        ? "Continue editing"
                                        : "View report"
                                }
                                onOpen={() => workspace.select(application._id)}
                                meta={[
                                    {
                                        label: "Contribution index",
                                        value: application.metrics.totalContributionIndex,
                                    },
                                    {
                                        label: "Last activity",
                                        value: formatTimestamp(getLastActivity(application)),
                                    },
                                ]}
                                actions={
                                    EDITABLE_STATUSES.includes(application.status) ? (
                                        <ConfirmButton
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            loading={workspace.isPending}
                                            onConfirm={() => void workspace.remove(application._id)}
                                            title="Delete this AQAR draft?"
                                            description={`The ${application.academicYear} draft and its contributions will be removed permanently.`}
                                            aria-label={`Delete the ${application.academicYear} AQAR draft`}
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
                        title="No AQAR reports yet"
                        description={`Start a draft, ${facultyName} — your research, awards, patents, and outreach records are pulled in from your profile automatically.`}
                        action={
                            <Button type="button" loading={workspace.isPending} onClick={() => void handleCreate()}>
                                <Plus aria-hidden />
                                Start AQAR draft
                            </Button>
                        }
                    />
                )}
            </WorkspaceIndex>
        );
    }

    // --- detail view --------------------------------------------------------

    const step = aqarSteps[currentIndex];

    const rail = (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailList
                        columns={1}
                        items={[
                            { label: "Academic year", value: selected?.academicYear },
                            {
                                label: "Reporting period",
                                value: formatDateRange(
                                    selected?.reportingPeriod.fromDate,
                                    selected?.reportingPeriod.toDate
                                ),
                            },
                            { label: "Contribution index", value: liveMetrics.totalContributionIndex },
                            { label: "Last activity", value: formatTimestamp(selected ? getLastActivity(selected) : undefined) },
                        ]}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Status timeline</CardTitle>
                    <CardDescription>Every AQAR workflow transition.</CardDescription>
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
            backLabel="All reports"
            title={selected?.academicYear ?? "AQAR report"}
            subtitle={`Contribution index ${liveMetrics.totalContributionIndex}`}
            status={selected?.status}
            message={workspace.message}
            rail={rail}
            railTitle="Report details"
            headerAside={
                editable ? <AutosaveIndicator status={autosave.status} error={autosave.error} /> : null
            }
        >
            {!editable ? (
                <InlineAlert tone="info" title="This report is read-only">
                    It is {selected?.status.toLowerCase()} and cannot be edited until it returns to Draft or is
                    rejected.
                </InlineAlert>
            ) : null}

            {selected?.status === "Rejected" ? (
                <InlineAlert tone="danger" title="Resubmission required">
                    Check the reviewer remarks in the status timeline, make the corrections, then submit again.
                </InlineAlert>
            ) : null}

            <Form {...form}>
                <Wizard
                    steps={aqarSteps}
                    currentIndex={currentIndex}
                    visitedSteps={visitedSteps}
                    onStepChange={(index) => void handleStepChange(index)}
                    hasErrors={stepHasErrors}
                    finalAction={
                        <Button
                            type="button"
                            size="sm"
                            loading={workspace.isPending}
                            disabled={workspace.isPending || !editable || !reviewReady}
                            title={reviewReady ? undefined : "Complete the submission checklist first"}
                            onClick={() => void handleSubmit()}
                        >
                            <CheckCircle2 aria-hidden />
                            Submit report
                        </Button>
                    }
                >
                    {step?.id === "overview" ? (
                        <AqarStepOverview
                            yearOptions={yearOptions}
                            editable={editable}
                            prefillYear={prefillYear}
                            isPrefillLoading={isPrefillLoading}
                            onReloadPrefill={(year) => void loadYearPrefill(year)}
                        />
                    ) : null}

                    {step && step.sections.length ? (
                        <div className="space-y-8">
                            {step.sections.map((key) => (
                                <RepeatableSection
                                    key={key}
                                    config={aqarSections[key]}
                                    disabled={!editable}
                                    ownerId={facultyId}
                                />
                            ))}
                        </div>
                    ) : null}

                    {step?.id === "review" ? (
                        <div className="space-y-6">
                            <AqarStepReview
                                metrics={liveMetrics}
                                readiness={readiness}
                                academicYear={watchedYear}
                                reportingPeriod={{
                                    fromDate: watched.reportingPeriod?.fromDate,
                                    toDate: watched.reportingPeriod?.toDate,
                                }}
                                checks={checks}
                                onCheckChange={(index, value) =>
                                    setChecks((current) =>
                                        current.map((item, itemIndex) => (itemIndex === index ? value : item))
                                    )
                                }
                                onJumpToStep={(stepId) => {
                                    const target = aqarSteps.findIndex((item) => item.id === stepId);
                                    if (target >= 0) goToStep(target);
                                }}
                                editable={editable}
                                selectedId={selectedId}
                            />
                            <AqarContributionTables contribution={contribution} />
                        </div>
                    ) : null}
                </Wizard>
            </Form>
        </WorkspaceDetail>
    );
}
