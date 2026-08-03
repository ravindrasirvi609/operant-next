"use client";

import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormMessage } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import { Stepper } from "@/components/ui/stepper";
import { hasErrorsForPaths } from "@/lib/forms/has-errors-for-paths";
import {
    getAllowedCasPromotionTargets,
    getDefaultCasTarget,
    getDesignationProfile,
} from "@/lib/faculty/options";
import { casApplicationSchema } from "@/lib/cas/validators";

import { APIScoreCalculator } from "@/components/cas/cas-api-score-calculator";
import { CASCommitteeTimeline } from "@/components/cas/cas-committee-timeline";
import { CASStatusTimeline } from "@/components/cas/cas-status-timeline";
import { CasSubmissionSummary } from "@/components/cas/cas-submission-summary";
import {
    casStepFieldPaths,
    casSteps,
    emptyCasAchievementBucket,
    type CasApp,
    type CasDocumentItem,
    type CasEligibility,
    type CasFormValues,
    type CasResolvedValues,
    type CasWorkflowStatus,
    type PbasOption,
} from "@/components/cas/cas-types";

import { CasStepAcademicContributions } from "@/components/cas/steps/cas-step-academic-contributions";
import { CasStepBasicDetails } from "@/components/cas/steps/cas-step-basic-details";
import { CasStepBooksProjects } from "@/components/cas/steps/cas-step-books-projects";
import { CasStepDocumentsChecklist } from "@/components/cas/steps/cas-step-documents-checklist";
import { CasStepEligibilityPeriod } from "@/components/cas/steps/cas-step-eligibility-period";
import { CasStepPbasReports } from "@/components/cas/steps/cas-step-pbas-reports";
import { CasStepPublications } from "@/components/cas/steps/cas-step-publications";
import { CasStepReviewSubmit } from "@/components/cas/steps/cas-step-review-submit";

function emptyForm(): CasFormValues {
    const year = new Date().getFullYear();
    const currentDesignation = "Assistant Professor (Stage 1)";

    return {
        applicationYear: `${year}-${year + 1}`,
        currentDesignation,
        applyingForDesignation: getDefaultCasTarget(currentDesignation),
        eligibilityPeriod: {
            fromYear: year - 4,
            toYear: year,
        },
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
    const [applications, setApplications] = useState(initialApplications);
    const [selectedId, setSelectedId] = useState<string | null>(initialApplications[0]?._id ?? null);
    const [currentStep, setCurrentStep] = useState(0);
    const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [documents, setDocuments] = useState<CasDocumentItem[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    const [docError, setDocError] = useState<string | null>(null);
    const [workflow, setWorkflow] = useState<CasWorkflowStatus | null>(null);
    const [workflowLoading, setWorkflowLoading] = useState(false);
    const [workflowError, setWorkflowError] = useState<string | null>(null);

    const selected = applications.find((item) => item._id === selectedId);
    const canEdit = !selected || ["Draft", "Rejected"].includes(selected.status);
    const applicationYearOptions = useMemo(() => {
        const options = [...academicYearOptions];
        const selectedYear = String(selected?.applicationYear ?? "").trim();

        if (selectedYear && !options.some((option) => option.label === selectedYear)) {
            options.unshift({
                id: selected?.applicationYearId ?? selectedYear,
                label: selectedYear,
            });
        }

        return options;
    }, [academicYearOptions, selected?.applicationYear, selected?.applicationYearId]);
    const linkedAchievements = selected?.linkedAchievements ?? {
        ...emptyCasAchievementBucket(),
        ...evidenceDefaults,
        phdGuided: evidenceDefaults.phdGuided ?? 0,
    };
    const form = useForm<CasFormValues, unknown, CasResolvedValues>({
        resolver: zodResolver(casApplicationSchema),
        defaultValues: selected ? toFormValues(selected) : emptyForm(),
    });

    const publicationFields = useFieldArray({ control: form.control, name: "manualAchievements.publications" });
    const bookFields = useFieldArray({ control: form.control, name: "manualAchievements.books" });
    const projectFields = useFieldArray({ control: form.control, name: "manualAchievements.researchProjects" });

    function goToStep(index: number) {
        const clamped = Math.max(0, Math.min(casSteps.length - 1, index));
        setCurrentStep(clamped);
        setVisitedSteps((prev) => {
            if (prev.has(clamped)) return prev;
            const next = new Set(prev);
            next.add(clamped);
            return next;
        });
    }

    useEffect(() => {
        form.reset(selected ? toFormValues(selected) : emptyForm());
    }, [selectedId, selected, form, evidenceDefaults]);

    useEffect(() => {
        if (selected) {
            return;
        }

        const selectedYear = String(form.getValues("applicationYear") ?? "").trim();
        const hasMatchingOption = applicationYearOptions.some((option) => option.label === selectedYear);
        if (hasMatchingOption || !applicationYearOptions.length) {
            return;
        }

        const fallback = applicationYearOptions.find((option) => option.isActive) ?? applicationYearOptions[0];
        form.setValue("applicationYear", fallback.label, { shouldDirty: false, shouldValidate: true });
        form.setValue("applicationYearId", fallback.id, { shouldDirty: false, shouldValidate: true });
    }, [applicationYearOptions, form, selected]);

    const watchedValues = useWatch({ control: form.control });
    const watchedApplicationYear = useWatch({ control: form.control, name: "applicationYear" });
    const resolved = casApplicationSchema.safeParse(watchedValues);
    const normalizedValues = resolved.success ? resolved.data : casApplicationSchema.parse(emptyForm());
    const designationProfile = useMemo(
        () => getDesignationProfile(normalizedValues.currentDesignation),
        [normalizedValues.currentDesignation]
    );
    const allowedPromotionTargets = useMemo(
        () => getAllowedCasPromotionTargets(normalizedValues.currentDesignation),
        [normalizedValues.currentDesignation]
    );
    const score = selected?.apiScore ?? {
        teachingLearning: 0,
        researchPublication: 0,
        academicContribution: 0,
        totalScore: 0,
    };
    const computedEligibility = selected?.eligibility ?? {
        isEligible: false,
        message: selectedId
            ? "Waiting for the latest CAS calculation from the server."
            : "Create a CAS draft to calculate the authoritative API score and eligibility.",
    };
    const hasMissingMandatoryDocument = documents.some((doc) => doc.isMandatory && !doc.documentId?._id);

    function hasStepErrors(index: number): boolean {
        if (index === 6) return hasMissingMandatoryDocument;
        if (index === 7) return false;
        return hasErrorsForPaths(form.formState.errors, casStepFieldPaths[index] ?? []);
    }

    useEffect(() => {
        const selectedYear = String(watchedApplicationYear ?? "").trim();
        if (!selectedYear) {
            return;
        }

        const matchingOption = applicationYearOptions.find((option) => option.label === selectedYear);
        if (!matchingOption) {
            return;
        }

        if (form.getValues("applicationYearId") === matchingOption.id) {
            return;
        }

        form.setValue("applicationYearId", matchingOption.id, { shouldDirty: false });
    }, [applicationYearOptions, form, watchedApplicationYear]);

    useEffect(() => {
        const nextOptions = getAllowedCasPromotionTargets(form.getValues("currentDesignation"));
        const selectedTarget = form.getValues("applyingForDesignation");
        if (!nextOptions.includes(selectedTarget as (typeof nextOptions)[number])) {
            form.setValue("applyingForDesignation", nextOptions[0], { shouldDirty: true, shouldValidate: true });
        }
    }, [form, watchedValues.currentDesignation]);

    useEffect(() => {
        if (!designationProfile.showCasPhdGuided && form.getValues("manualAchievements.phdGuided") !== 0) {
            form.setValue("manualAchievements.phdGuided", 0, { shouldDirty: true, shouldValidate: true });
        }
        if (!designationProfile.showCasConferenceCount && form.getValues("manualAchievements.conferences") !== 0) {
            form.setValue("manualAchievements.conferences", 0, { shouldDirty: true, shouldValidate: true });
        }
    }, [designationProfile, form]);

    useEffect(() => {
        if (!selectedId || !form.formState.isDirty) {
            return;
        }

        if (!selected || !["Draft", "Rejected"].includes(selected.status)) {
            return;
        }

        const timer = window.setTimeout(async () => {
            if (!resolved.success) {
                return;
            }

            setAutoSaveState("saving");

            const response = await fetch(`/api/cas/${selectedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resolved.data),
            });

            const data = (await response.json()) as { application?: CasApp };

            if (response.ok && data.application) {
                setApplications((current) =>
                    current.map((item) => (item._id === selectedId ? data.application! : item))
                );
                setAutoSaveState("saved");
            } else {
                setAutoSaveState("idle");
            }
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [resolved, selectedId, form.formState.isDirty, selected]);

    useEffect(() => {
        if (!selectedId) {
            setDocuments([]);
            return;
        }

        let cancelled = false;
        setDocLoading(true);
        setDocError(null);

        fetch(`/api/cas/${selectedId}/documents`)
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                if (!data?.documents) {
                    setDocError("Unable to load CAS documents.");
                    setDocLoading(false);
                    return;
                }
                setDocuments(data.documents as CasDocumentItem[]);
                setDocLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setDocError("Unable to load CAS documents.");
                setDocLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    useEffect(() => {
        if (!selectedId) {
            setWorkflow(null);
            return;
        }

        let cancelled = false;
        setWorkflowLoading(true);
        setWorkflowError(null);

        fetch(`/api/cas/${selectedId}/workflow`)
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                setWorkflow(data?.workflow ?? null);
                setWorkflowLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setWorkflowError("Unable to load verification status.");
                setWorkflowLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    function createDraft() {
        setMessage(null);

        startTransition(async () => {
            const payload = form.getValues();
            const response = await fetch("/api/cas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = (await response.json()) as { message?: string; application?: CasApp };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to create CAS draft." });
                return;
            }

            setApplications((current) => {
                const exists = current.some((item) => item._id === data.application!._id);
                if (!exists) {
                    return [data.application!, ...current];
                }
                return current.map((item) => (item._id === data.application!._id ? data.application! : item));
            });
            setSelectedId(data.application._id);
            setCurrentStep(0);
            setVisitedSteps(new Set([0]));
            setMessage({ type: "success", text: data.message ?? "CAS draft created." });
        });
    }

    function submitApplication() {
        if (!selectedId) {
            setMessage({ type: "error", text: "Create a draft before submitting." });
            return;
        }

        const missingMandatory = documents.filter((doc) => doc.isMandatory && !doc.documentId?._id);
        if (missingMandatory.length) {
            setMessage({ type: "error", text: "Upload all mandatory documents before submitting." });
            return;
        }

        startTransition(async () => {
            const response = await fetch(`/api/cas/${selectedId}/submit`, { method: "POST" });
            const data = (await response.json()) as { message?: string; application?: CasApp };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to submit CAS application." });
                return;
            }

            setApplications((current) =>
                current.map((item) => (item._id === selectedId ? data.application! : item))
            );
            setMessage({ type: "success", text: data.message ?? "CAS application submitted." });
        });
    }

    async function persistDocument(documentType: string, documentId: string) {
        if (!selectedId) return;
        const response = await fetch(`/api/cas/${selectedId}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentType, documentId }),
        });
        const data = (await response.json()) as { documents?: CasDocumentItem[] };
        if (response.ok && data.documents) {
            setDocuments(data.documents);
        } else {
            throw new Error("Unable to save CAS document.");
        }
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>CAS Eligibility Snapshot</CardTitle>
                    <CardDescription>
                        Eligibility is based on approved PBAS history and service tenure.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <StatTile
                        label="Eligibility"
                        value={eligibility.eligible ? "Eligible" : "Not Eligible"}
                        helper={eligibility.reason}
                        icon={eligibility.eligible ? CheckCircle2 : AlertTriangle}
                        tone={eligibility.eligible ? "success" : "warning"}
                    />
                    <StatTile
                        label="Required"
                        value={`${eligibility.requiredYears ?? "--"} yrs | API ${eligibility.requiredScore ?? "--"}`}
                        helper={`Next: ${eligibility.nextDesignation ?? "Not configured"}`}
                    />
                    <StatTile
                        label="Approved PBAS"
                        value={eligibility.lastApprovedApiScore ?? 0}
                        helper={eligibility.lastApprovedYear ? `Year ${eligibility.lastApprovedYear}` : "No approved PBAS yet"}
                    />
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>CAS Dashboard</CardTitle>
                            <CardDescription>
                                Manage active and past CAS promotion applications for {facultyName}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button loading={isPending} className="w-full" onClick={createDraft} type="button" disabled={isPending}>
                                Start CAS Draft
                            </Button>
                            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                                Auto save: {selectedId ? autoSaveState : "Create a draft to enable auto save"}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Applications</CardTitle>
                            <CardDescription>Active applications, history, and current workflow states.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {applications.length ? applications.map((application) => (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(application._id);
                                        setCurrentStep(0);
                                        setVisitedSteps(new Set([0]));
                                    }}
                                    key={application._id}
                                    className={`rounded-lg border p-4 text-left ${selectedId === application._id ? "border-border bg-card" : "border-border bg-muted/50"}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-foreground">{application.applyingForDesignation}</p>
                                        <Badge>{application.status}</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {application.currentDesignation} | {application.applicationYear}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        API {application.apiScore.totalScore} | Experience {application.experienceYears} years
                                    </p>
                                </button>
                            )) : (
                                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                                    No CAS applications created yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selected ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Status Timeline</CardTitle>
                                <CardDescription>Every status transition for this CAS application is logged here.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CASStatusTimeline logs={selected.statusLogs} />
                            </CardContent>
                        </Card>
                    ) : null}

                    {selected ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Committee Review Trail</CardTitle>
                                <CardDescription>Department, committee, and admin decisions are stored in the dedicated CAS committee register.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CASCommitteeTimeline reviews={selected.committeeReviews ?? []} />
                            </CardContent>
                        </Card>
                    ) : null}

                    <Card>
                        <CardHeader>
                            <CardTitle>Document Verification Status</CardTitle>
                            <CardDescription>Read-only status from the approval workflow.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {workflowLoading ? (
                                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                                    Loading verification status...
                                </div>
                            ) : workflowError ? (
                                <div className="rounded-lg border border-destructive-border bg-destructive-muted p-4 text-sm text-destructive-muted-foreground">
                                    {workflowError}
                                </div>
                            ) : workflow ? (
                                <div className="grid gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                                            <p className="mt-1 text-base font-semibold text-foreground">{workflow.status}</p>
                                        </div>
                                        <Badge>{workflow.currentApproverRole}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Last updated{" "}
                                        {workflow.updatedAt
                                            ? new Date(workflow.updatedAt).toLocaleString()
                                            : "Not available"}
                                    </div>
                                    {workflow.remarks ? (
                                        <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
                                            {workflow.remarks}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground">
                                            No verification remarks recorded yet.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                                    Verification workflow has not started yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    {canEdit ? (
                        <>
                            {selected?.status === "Rejected" ? (
                                <Card className="border-destructive-border bg-destructive-muted">
                                    <CardHeader>
                                        <CardTitle>Resubmission Required</CardTitle>
                                        <CardDescription>
                                            This CAS application was rejected. Review remarks and resubmit once corrections are made.
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            ) : null}

                            <Stepper
                                steps={casSteps}
                                currentIndex={currentStep}
                                visitedSteps={visitedSteps}
                                hasErrors={hasStepErrors}
                                onStepChange={goToStep}
                            />
                            <APIScoreCalculator score={score} eligibility={computedEligibility} breakup={selected?.apiBreakup} />

                            <Card>
                                <CardHeader>
                                    <CardTitle>CAS Application Form</CardTitle>
                                    <CardDescription>
                                        Multi-step UGC-oriented CAS promotion application with PBAS linkage, eligibility validation, and workflow-ready achievements.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {currentStep === 0 ? (
                                        <CasStepBasicDetails
                                            form={form}
                                            canEdit={canEdit}
                                            applicationYearOptions={applicationYearOptions}
                                            designationProfile={designationProfile}
                                            allowedPromotionTargets={allowedPromotionTargets}
                                        />
                                    ) : null}

                                    {currentStep === 1 ? <CasStepEligibilityPeriod form={form} canEdit={canEdit} /> : null}

                                    {currentStep === 2 ? (
                                        <CasStepPbasReports
                                            form={form}
                                            canEdit={canEdit}
                                            linkedAchievements={linkedAchievements}
                                            pbasOptions={pbasOptions}
                                            selectedPbasReportIds={watchedValues.pbasReports ?? []}
                                        />
                                    ) : null}

                                    {currentStep === 3 ? (
                                        <CasStepPublications form={form} canEdit={canEdit} publicationFields={publicationFields} />
                                    ) : null}

                                    {currentStep === 4 ? (
                                        <CasStepBooksProjects form={form} canEdit={canEdit} bookFields={bookFields} projectFields={projectFields} />
                                    ) : null}

                                    {currentStep === 5 ? (
                                        <CasStepAcademicContributions form={form} canEdit={canEdit} designationProfile={designationProfile} />
                                    ) : null}

                                    {currentStep === 6 ? (
                                        <CasStepDocumentsChecklist
                                            canEdit={canEdit}
                                            facultyId={facultyId}
                                            documents={documents}
                                            docLoading={docLoading}
                                            docError={docError}
                                            onPersistDocument={(documentType, documentId) => {
                                                void persistDocument(documentType, documentId);
                                            }}
                                        />
                                    ) : null}

                                    {currentStep === 7 ? (
                                        <CasStepReviewSubmit
                                            watchedValues={normalizedValues}
                                            linkedAchievements={linkedAchievements}
                                            designationProfile={designationProfile}
                                            isPending={isPending}
                                            selectedId={selectedId}
                                            onSubmit={submitApplication}
                                        />
                                    ) : null}

                                    <div className="flex flex-wrap gap-3">
                                        <Button type="button" variant="secondary" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0}>
                                            <ChevronLeft aria-hidden />
                                            Previous
                                        </Button>
                                        <Button type="button" onClick={() => goToStep(currentStep + 1)} disabled={currentStep === casSteps.length - 1}>
                                            <ChevronRight aria-hidden />
                                            Next
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : selected ? (
                        <CasSubmissionSummary
                            application={selected}
                            pbasOptions={pbasOptions}
                            documents={documents}
                            docLoading={docLoading}
                            docError={docError}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
