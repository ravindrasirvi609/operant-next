"use client";

import { Building2, ClipboardCheck, FileText, FlaskConical, GraduationCap, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormMessage } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatTile } from "@/components/ui/stat-card";
import { Stepper, type StepDescriptor } from "@/components/ui/stepper";
import { getDesignationProfile } from "@/lib/faculty/options";
import { hasErrorsForPaths } from "@/lib/forms/has-errors-for-paths";
import { pbasApplicationSchema } from "@/lib/pbas/validators";
import { PbasStepDetails } from "@/components/pbas/steps/pbas-step-details";
import { PbasStepTeachingSources } from "@/components/pbas/steps/pbas-step-teaching-sources";
import { PbasStepResearchSources } from "@/components/pbas/steps/pbas-step-research-sources";
import { PbasStepInstitutionalSources } from "@/components/pbas/steps/pbas-step-institutional-sources";
import { PbasStepScoreReview } from "@/components/pbas/steps/pbas-step-score-review";
import { PbasSubmissionSummary } from "@/components/pbas/pbas-submission-summary";
import { PBASStatusTimeline } from "@/components/pbas/pbas-status-timeline";
import type {
    IndicatorEntry,
    PbasApp,
    PbasCandidateOption,
    PbasDetail,
    PbasDraftReferences,
    PbasFormValues,
    PbasReferenceKey,
    PbasSourceRow,
    PbasSourceTables,
    PbasSummary,
} from "@/components/pbas/pbas-types";

const STEPS: StepDescriptor[] = [
    { id: "details", title: "Application Details", description: "Year, designation, appraisal period", icon: FileText },
    { id: "teaching", title: "Teaching Sources", description: "Teaching load & summary records", icon: GraduationCap },
    { id: "research", title: "Research Sources", description: "Publications, books, projects", icon: FlaskConical },
    { id: "institutional", title: "Institutional Sources", description: "Committees & institutional duties", icon: Building2 },
    { id: "review", title: "Score & Review", description: "API score, evidence, submission", icon: ClipboardCheck },
];

const DETAILS_STEP_FIELD_PATHS = [
    "academicYearId",
    "academicYear",
    "currentDesignation",
    "appraisalPeriod.fromDate",
    "appraisalPeriod.toDate",
];

function emptyForm(prefill?: Partial<PbasFormValues>): PbasFormValues {
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    const base: PbasFormValues = {
        academicYear: `${year}-${nextYear}`,
        currentDesignation: "Assistant Professor (Stage 1)",
        appraisalPeriod: {
            fromDate: `${year}-06-01`,
            toDate: `${nextYear}-05-31`,
        },
    };

    if (!prefill) {
        return base;
    }

    return {
        ...base,
        ...prefill,
        appraisalPeriod: {
            ...base.appraisalPeriod,
            ...prefill.appraisalPeriod,
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

function buildProfileEditHref(section: string, id: string) {
    return `/faculty/profile?section=${encodeURIComponent(section)}&editId=${encodeURIComponent(id)}`;
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
    const [applications, setApplications] = useState(initialApplications);
    const [selectedId, setSelectedId] = useState<string | null>(initialApplications[0]?._id ?? null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [selectedDetail, setSelectedDetail] = useState<PbasDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [entries, setEntries] = useState<IndicatorEntry[]>([]);
    const [entryLoading, setEntryLoading] = useState(false);
    const [entryError, setEntryError] = useState<string | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
    const activeStatuses = useMemo(
        () => new Set(["Draft", "Rejected", "Submitted", "Under Review", "Committee Review"]),
        []
    );

    const selected = applications.find((item) => item._id === selectedId);
    const activeApplication = useMemo(
        () => applications.find((item) => activeStatuses.has(item.status)),
        [applications, activeStatuses]
    );
    const selectedSnapshot = selectedDetail?.snapshot ?? selected?.snapshot ?? summary.snapshot;
    const canEdit = !selected || ["Draft", "Rejected"].includes(selected.status);
    const academicYearOptions = useMemo<Array<{ id: string; label: string; isActive: boolean }>>(() => {
        if (summary.academicYearOptions?.length) {
            return summary.academicYearOptions;
        }

        if (summary.activeYear?.label) {
            return [
                {
                    id: summary.activeYear.id ?? summary.activeYear.label,
                    label: summary.activeYear.label,
                    isActive: true,
                },
            ];
        }

        if (summary.meta.academicYear) {
            return [
                {
                    id: summary.meta.academicYear,
                    label: summary.meta.academicYear,
                    isActive: true,
                },
            ];
        }

        return [];
    }, [summary]);
    const submitDisabledReason = !selectedId
        ? "Create and select a PBAS draft to submit."
        : !canEdit
            ? `Submission is available only in Draft or Rejected status. Current status: ${selected?.status ?? "Unknown"}.`
            : null;
    const defaultDraft = useMemo(() => {
        const fallbackYear = academicYearOptions.find((option) => option.isActive) ?? academicYearOptions[0];
        return emptyForm({
            ...summary?.meta,
            academicYearId: fallbackYear?.id,
            academicYear: fallbackYear?.label ?? summary?.meta?.academicYear,
        });
    }, [academicYearOptions, summary]);

    function deleteApplication(applicationId: string) {
        if (!confirm("Are you sure you want to delete this PBAS draft?")) {
            return;
        }

        startTransition(async () => {
            const response = await fetch(`/api/pbas/${applicationId}`, { method: "DELETE" });
            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                setMessage({ type: "error", text: data.message ?? "Unable to delete PBAS application." });
                return;
            }

            setApplications((current) => current.filter((item) => item._id !== applicationId));
            if (selectedId === applicationId) {
                setSelectedId(null);
            }
            setMessage({ type: "success", text: data.message ?? "PBAS application deleted." });
        });
    }
    const form = useForm<PbasFormValues>({
        resolver: zodResolver(pbasApplicationSchema),
        defaultValues: selected
            ? toFormValues(selected, summary?.meta)
            : defaultDraft,
    });

    useEffect(() => {
        form.reset(
            selected
                ? toFormValues(selected, summary?.meta)
                : defaultDraft
        );
    }, [selectedId, selected, form, defaultDraft, summary]);

    useEffect(() => {
        if (selected) {
            return;
        }

        const selectedYear = String(form.getValues("academicYear") ?? "").trim();
        const hasMatchingOption = academicYearOptions.some((option) => option.label === selectedYear);
        if (hasMatchingOption || !academicYearOptions.length) {
            return;
        }

        const fallback = academicYearOptions.find((option) => option.isActive) ?? academicYearOptions[0];
        form.setValue("academicYear", fallback.label, { shouldDirty: false, shouldValidate: true });
        form.setValue("academicYearId", fallback.id, { shouldDirty: false, shouldValidate: true });
    }, [academicYearOptions, form, selected]);

    const watchedValues = useWatch({ control: form.control });
    const designationProfile = useMemo(
        () => getDesignationProfile(watchedValues.currentDesignation ?? selected?.currentDesignation ?? summary.meta.currentDesignation),
        [watchedValues.currentDesignation, selected?.currentDesignation, summary.meta.currentDesignation]
    );
    const resolved = pbasApplicationSchema.safeParse(watchedValues);
    const watchedAcademicYear = useWatch({ control: form.control, name: "academicYear" });

    useEffect(() => {
        const selectedYear = String(watchedAcademicYear ?? "").trim();
        if (!selectedYear) {
            return;
        }

        const matchingOption = academicYearOptions.find((option) => option.label === selectedYear);
        if (!matchingOption) {
            return;
        }

        if (form.getValues("academicYearId") === matchingOption.id) {
            return;
        }

        form.setValue("academicYearId", matchingOption.id, { shouldDirty: false });
    }, [academicYearOptions, form, watchedAcademicYear]);

    const score = useMemo(
        () => selectedDetail?.apiScore ?? selected?.apiScore ?? summary.apiScore,
        [selectedDetail, selected, summary.apiScore]
    );
    const sourceTables = useMemo<PbasSourceTables | null>(() => {
        if (!selectedDetail) {
            return null;
        }

        const { draftReferences, candidates } = selectedDetail;

        const toRows = (
            options: PbasCandidateOption[],
            sourceType: string,
            referenceKey: PbasReferenceKey,
            includedIds: string[],
            section: string
        ): PbasSourceRow[] =>
            options.map((item) => ({
                id: item.id,
                sourceType,
                title: item.label,
                subtitle: item.sublabel,
                note: item.note,
                included: includedIds.includes(item.id),
                referenceKey,
                sourceHref: buildProfileEditHref(section, item.id),
            }));

        const teachingSummaryRows: PbasSourceRow[] = candidates.category1.teachingSummary
            ? [
                {
                    id: candidates.category1.teachingSummary.id,
                    sourceType: "Teaching Summary",
                    title: candidates.category1.teachingSummary.label,
                    subtitle: candidates.category1.teachingSummary.sublabel,
                    note: candidates.category1.teachingSummary.note,
                    included:
                        draftReferences.teachingSummaryId === candidates.category1.teachingSummary.id,
                    referenceKey: "teachingSummaryId" as const,
                    sourceHref: buildProfileEditHref("teaching-summary", candidates.category1.teachingSummary.id),
                },
            ]
            : [];

        const teachingLoadRows = toRows(
            candidates.category1.teachingLoads,
            "Teaching Load",
            "teachingLoadIds",
            draftReferences.teachingLoadIds,
            "teaching-load"
        );

        const resultSummaryRows: PbasSourceRow[] = candidates.category1.resultSummaries.map((item) => ({
            id: item.id,
            sourceType: "Result Summary",
            title: item.label,
            subtitle: item.sublabel,
            note: item.note,
            included: draftReferences.resultSummaryIds.includes(item.id),
            referenceKey: "resultSummaryIds",
            sourceHref: buildProfileEditHref("result-summary", item.id),
        }));

        return {
            teaching: {
                label: "Teaching Sources",
                description:
                    designationProfile.key === "professor"
                        ? "Senior-role PBAS focuses on how teaching complements leadership and mentoring."
                        : "Teaching summary and load records for this PBAS draft.",
                groups: [
                    { title: "Teaching Summary", rows: teachingSummaryRows },
                    { title: "Teaching Load", rows: teachingLoadRows },
                    { title: "Result Summary", rows: resultSummaryRows },
                ],
            },
            research: {
                label: "Research Sources",
                description:
                    designationProfile.key === "early_assistant"
                        ? "Publications, books, patents, projects, and conferences included in this PBAS."
                        : "Research records are emphasized for PBAS differentiation at your designation.",
                groups: [
                    {
                        title: "Publications",
                        rows: toRows(
                            candidates.category2.researchPapers,
                            "Publication",
                            "publicationIds",
                            draftReferences.publicationIds,
                            "publications"
                        ),
                    },
                    {
                        title: "Books",
                        rows: toRows(candidates.category2.books, "Book", "bookIds", draftReferences.bookIds, "books"),
                    },
                    {
                        title: "Patents",
                        rows: toRows(candidates.category2.patents, "Patent", "patentIds", draftReferences.patentIds, "patents"),
                    },
                    {
                        title: "Research Projects",
                        rows: toRows(
                            candidates.category2.projects,
                            "Research Project",
                            "researchProjectIds",
                            draftReferences.researchProjectIds,
                            "projects"
                        ),
                    },
                    {
                        title: "Conferences / Events",
                        rows: toRows(
                            candidates.category2.conferences,
                            "Conference/Event",
                            "eventParticipationIds",
                            draftReferences.eventParticipationIds,
                            "events"
                        ),
                    },
                    {
                        title: "PhD Guidance",
                        rows: toRows(
                            candidates.category2.phdGuidance,
                            "PhD Guidance",
                            "phdGuidanceIds",
                            draftReferences.phdGuidanceIds,
                            "phd-guidance"
                        ),
                    },
                    {
                        title: "Consultancy",
                        rows: toRows(
                            candidates.category2.consultancies,
                            "Consultancy",
                            "consultancyIds",
                            draftReferences.consultancyIds,
                            "consultancy"
                        ),
                    },
                    {
                        title: "E-content",
                        rows: toRows(
                            candidates.category2.econtentItems,
                            "E-content",
                            "econtentIds",
                            draftReferences.econtentIds,
                            "econtent"
                        ),
                    },
                    {
                        title: "MOOC / SWAYAM",
                        rows: toRows(
                            candidates.category2.moocCourses,
                            "MOOC Course",
                            "moocCourseIds",
                            draftReferences.moocCourseIds,
                            "mooc-courses"
                        ),
                    },
                    {
                        title: "Awards",
                        rows: toRows(
                            candidates.category2.awards,
                            "Award",
                            "awardIds",
                            draftReferences.awardIds,
                            "awards"
                        ),
                    },
                ],
            },
            institutional: {
                label: "Institutional Sources",
                description:
                    designationProfile.key === "early_assistant"
                        ? "Admin roles, guidance, and extension entries included in this PBAS."
                        : "Leadership and stewardship records included for institutional contribution.",
                groups: [
                    {
                        title: "Committees",
                        rows: toRows(
                            candidates.category3.committees,
                            "Committee",
                            "adminRoleIds",
                            draftReferences.adminRoleIds,
                            "admin-roles"
                        ),
                    },
                    {
                        title: "Administrative Duties",
                        rows: toRows(
                            candidates.category3.administrativeDuties,
                            "Administrative Duty",
                            "adminRoleIds",
                            draftReferences.adminRoleIds,
                            "admin-roles"
                        ),
                    },
                    {
                        title: "Exam Duties",
                        rows: toRows(
                            candidates.category3.examDuties,
                            "Exam Duty",
                            "adminRoleIds",
                            draftReferences.adminRoleIds,
                            "admin-roles"
                        ),
                    },
                    {
                        title: "Student Guidance",
                        rows: toRows(
                            candidates.category3.studentGuidance,
                            "Student Guidance",
                            "institutionalContributionIds",
                            draftReferences.institutionalContributionIds,
                            "institutional-contributions"
                        ),
                    },
                    {
                        title: "Extension Activities",
                        rows: toRows(
                            candidates.category3.extensionActivities,
                            "Extension Activity",
                            "socialExtensionIds",
                            draftReferences.socialExtensionIds,
                            "social-extension"
                        ),
                    },
                    {
                        title: "FDP / Workshops",
                        rows: toRows(
                            candidates.category3.fdps,
                            "FDP / Workshop",
                            "fdpIds",
                            draftReferences.fdpIds,
                            "fdp-conducted"
                        ),
                    },
                ],
            },
        };
    }, [designationProfile.key, selectedDetail]);

    useEffect(() => {
        setCurrentStepIndex(0);
        setVisitedSteps(new Set([0]));
    }, [selectedId]);

    function handleStepChange(index: number) {
        setCurrentStepIndex(index);
        setVisitedSteps((current) => new Set(current).add(index));
    }

    function hasErrorsForStep(index: number): boolean {
        if (index !== 0) {
            return false;
        }

        return hasErrorsForPaths(form.formState.errors, DETAILS_STEP_FIELD_PATHS);
    }

    function removeFromPbas(row: PbasSourceRow) {
        if (!row.referenceKey) {
            return;
        }

        if (row.referenceKey === "teachingSummaryId") {
            toggleTeachingSummary(row.id);
            return;
        }

        toggleReference(row.referenceKey, row.id);
    }

    useEffect(() => {
        if (!selectedId) {
            setSelectedDetail(null);
            setDetailError(null);
            return;
        }

        let cancelled = false;
        setDetailLoading(true);
        setDetailError(null);

        fetch(`/api/pbas/${selectedId}`)
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                if (!data?.application) {
                    setDetailError("Unable to load PBAS application details.");
                    setDetailLoading(false);
                    return;
                }

                setSelectedDetail(data.application as PbasDetail);
                setApplications((current) =>
                    current.map((item) =>
                        item._id === selectedId ? { ...item, ...(data.application as PbasApp) } : item
                    )
                );
                setDetailLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setDetailError("Unable to load PBAS application details.");
                setDetailLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedId]);

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

            const response = await fetch(`/api/pbas/${selectedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resolved.data),
            });

            const data = (await response.json()) as { application?: PbasApp };

            if (response.ok && data.application) {
                setApplications((current) =>
                    current.map((item) => (item._id === selectedId ? data.application! : item))
                );
                if (selectedId === data.application._id) {
                    setSelectedDetail(data.application as PbasDetail);
                }
                setAutoSaveState("saved");
            } else {
                setAutoSaveState("idle");
            }
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [resolved, selectedId, form.formState.isDirty, selected]);

    useEffect(() => {
        if (!selectedId) {
            setEntries([]);
            return;
        }

        let cancelled = false;
        setEntryLoading(true);
        setEntryError(null);

        fetch(`/api/pbas/${selectedId}/entries`)
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                if (!data?.entries?.items) {
                    setEntryError("Unable to load PBAS indicator entries.");
                    setEntryLoading(false);
                    return;
                }
                setEntries(data.entries.items as IndicatorEntry[]);
                setEntryLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setEntryError("Unable to load PBAS indicator entries.");
                setEntryLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    function createDraft() {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch("/api/pbas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form.getValues()),
            });

            const data = (await response.json()) as { message?: string; application?: PbasApp };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to create PBAS draft." });
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
            setSelectedDetail(data.application as PbasDetail);
            setMessage({ type: "success", text: data.message ?? "PBAS draft created." });
        });
    }

    function submitApplication() {
        if (!selectedId) {
            setMessage({ type: "error", text: "Create a draft before submitting." });
            return;
        }

        startTransition(async () => {
            const response = await fetch(`/api/pbas/${selectedId}/submit`, { method: "POST" });
            const data = (await response.json()) as { message?: string; application?: PbasApp };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to submit PBAS application." });
                return;
            }

            setApplications((current) =>
                current.map((item) => (item._id === selectedId ? data.application! : item))
            );
            setSelectedDetail(data.application as PbasDetail);
            setMessage({ type: "success", text: data.message ?? "PBAS application submitted." });
        });
    }

    async function persistReferences(nextReferences: PbasDraftReferences) {
        if (!selectedId) return;

        const response = await fetch(`/api/pbas/${selectedId}/references`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextReferences),
        });
        const data = (await response.json()) as { message?: string; application?: PbasDetail };

        if (!response.ok || !data.application) {
            throw new Error(data.message ?? "Unable to update PBAS references.");
        }

        setSelectedDetail(data.application);
        setApplications((current) =>
            current.map((item) => (item._id === selectedId ? data.application! : item))
        );
    }

    function toggleReference(key: keyof Omit<PbasDraftReferences, "teachingSummaryId">, id: string) {
        if (!selectedDetail) return;
        const current = new Set(selectedDetail.draftReferences[key]);
        if (current.has(id)) {
            current.delete(id);
        } else {
            current.add(id);
        }

        const nextReferences = {
            ...selectedDetail.draftReferences,
            [key]: Array.from(current),
        };

        setSelectedDetail((currentDetail) =>
            currentDetail
                ? {
                    ...currentDetail,
                    draftReferences: nextReferences,
                }
                : currentDetail
        );

        void persistReferences(nextReferences).catch((error) => {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to update references." });
        });
    }

    function toggleTeachingSummary(id: string) {
        if (!selectedDetail) return;
        const nextReferences = {
            ...selectedDetail.draftReferences,
            teachingSummaryId:
                selectedDetail.draftReferences.teachingSummaryId === id ? undefined : id,
        };

        setSelectedDetail((currentDetail) =>
            currentDetail
                ? {
                    ...currentDetail,
                    draftReferences: nextReferences,
                }
                : currentDetail
        );

        void persistReferences(nextReferences).catch((error) => {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to update references." });
        });
    }

    function updateEntryState(items: IndicatorEntry[]) {
        setEntries(items);
    }

    async function persistEntry(indicatorId: string, payload: Record<string, unknown>) {
        if (!selectedId) return;
        const response = await fetch(`/api/pbas/${selectedId}/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ indicatorId, ...payload }),
        });
        const data = (await response.json()) as { entries?: { items?: IndicatorEntry[] } };
        if (response.ok && data.entries?.items) {
            updateEntryState(data.entries.items);
        } else {
            throw new Error(data?.entries ? "Unable to update PBAS entries." : "Unable to update PBAS entries.");
        }
    }

    function handleUploadEvidence(indicatorId: string, documentId: string) {
        void persistEntry(indicatorId, { evidenceDocumentId: documentId }).catch(() => {
            setMessage({ type: "error", text: "Unable to update PBAS entries." });
        });
    }

    const submittedAt = useMemo(() => {
        const submittedLog = [...(selected?.statusLogs ?? [])]
            .reverse()
            .find((log) => log.status === "Submitted");
        return submittedLog?.changedAt ?? selectedDetail?.activeRevision?.submittedAt;
    }, [selected, selectedDetail]);

    function renderActiveStep() {
        switch (STEPS[currentStepIndex]?.id) {
            case "details":
                return (
                    <PbasStepDetails
                        form={form}
                        academicYearOptions={academicYearOptions}
                        canEdit={canEdit}
                        designationProfile={designationProfile}
                        designationBadgeLabel={String(watchedValues.currentDesignation ?? selected?.currentDesignation ?? "")}
                    />
                );
            case "teaching":
                return (
                    <PbasStepTeachingSources
                        config={sourceTables?.teaching}
                        snapshot={selectedSnapshot.category1}
                        canEdit={canEdit}
                        onRemove={removeFromPbas}
                        loading={detailLoading}
                        error={detailError}
                        hasDetail={Boolean(selectedDetail)}
                    />
                );
            case "research":
                return (
                    <PbasStepResearchSources
                        config={sourceTables?.research}
                        snapshot={selectedSnapshot.category2}
                        canEdit={canEdit}
                        onRemove={removeFromPbas}
                        loading={detailLoading}
                        error={detailError}
                        hasDetail={Boolean(selectedDetail)}
                    />
                );
            case "institutional":
                return (
                    <PbasStepInstitutionalSources
                        config={sourceTables?.institutional}
                        snapshot={selectedSnapshot.category3}
                        canEdit={canEdit}
                        onRemove={removeFromPbas}
                        loading={detailLoading}
                        error={detailError}
                        hasDetail={Boolean(selectedDetail)}
                    />
                );
            case "review":
                return (
                    <PbasStepScoreReview
                        score={score}
                        entries={entries}
                        entryLoading={entryLoading}
                        entryError={entryError}
                        canEdit={canEdit}
                        facultyId={facultyId}
                        onUploadEvidence={handleUploadEvidence}
                        revisionHistory={selectedDetail?.revisionHistory ?? []}
                        selectedId={selectedId}
                        isPending={isPending}
                        onSubmit={submitApplication}
                        submitDisabledReason={submitDisabledReason}
                    />
                );
            default:
                return null;
        }
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>PBAS Year Overview</CardTitle>
                    <CardDescription>
                        Active academic year readiness, submission window, and performance highlights.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <StatTile label="Active Year" value={summary.activeYear?.label || "Not configured"} />
                        <StatTile label="Submission Deadline" value={summary.submissionDeadline || "Not configured"} />
                        <StatTile
                            label="Last Approved API"
                            value={summary.lastApprovedApiScore ?? 0}
                            helper={summary.lastApprovedYear ? `Year ${summary.lastApprovedYear}` : "No approved PBAS yet"}
                        />
                    </div>
                    <div className="grid gap-3 md:grid-cols-6">
                        <StatTile label="Teaching Hours" value={summary.stats.teachingLoadHours} />
                        <StatTile label="Publications" value={summary.stats.publicationCount} />
                        <StatTile label="Projects" value={summary.stats.projectCount} />
                        <StatTile label="FDP Count" value={summary.stats.fdpCount} />
                        <StatTile label="Admin Roles" value={summary.stats.adminRoleCount} />
                        <StatTile label="Evidence" value={summary.stats.evidenceCount} />
                    </div>
                    {summary.warnings.length ? (
                        <div className="rounded-lg border border-warning-border bg-warning-muted p-4 text-sm text-warning-muted-foreground">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-warning-muted-foreground">
                                Attention Needed
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-4">
                                {summary.warnings.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>PBAS Dashboard</CardTitle>
                            <CardDescription>
                                Manage yearly PBAS applications, API scores, and approval workflow for {facultyName}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                loading={isPending}
                                className="w-full"
                                onClick={createDraft}
                                type="button"
                                disabled={isPending || Boolean(activeApplication)}
                            >
                                Start PBAS Draft
                            </Button>
                            {activeApplication ? (
                                <p className="text-xs text-warning-muted-foreground">
                                    One PBAS form is already active ({activeApplication.academicYear}, {activeApplication.status}).
                                    Complete, approve, or reject it before starting a new form.
                                </p>
                            ) : null}
                            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                                Auto save: {selectedId ? autoSaveState : "Create a draft to enable auto save"}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Applications</CardTitle>
                            <CardDescription>Active academic-year records and PBAS workflow history.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {applications.length ? (
                                <ScrollArea className="h-[280px] pr-2">
                                    <div className="grid gap-3">
                                        {applications.map((application) => (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedId(application._id);
                                                }}
                                                key={application._id}
                                                className={`rounded-lg border p-4 text-left transition ${
                                                    selectedId === application._id
                                                        ? "border-border bg-card"
                                                        : "border-border bg-muted/50 hover:border-border hover:bg-card"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-semibold text-foreground">
                                                        {application.academicYear}
                                                    </p>
                                                    <Badge variant="secondary">{application.status}</Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    {application.currentDesignation}
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    API {application.apiScore.totalScore}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                                    No PBAS applications created yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selected ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <div className="space-y-1.5">
                                    <CardTitle>Status Timeline</CardTitle>
                                    <CardDescription>Every PBAS status transition is logged here.</CardDescription>
                                </div>
                                {selected.status === "Draft" ? (
                                    <Button
                                        loading={isPending}
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => deleteApplication(selected._id)}
                                        disabled={isPending}
                                        title="Delete Draft"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                ) : null}
                            </CardHeader>
                            <CardContent>
                                <PBASStatusTimeline logs={selected.statusLogs} />
                            </CardContent>
                        </Card>
                    ) : null}
                </div>

                <div className="space-y-6">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    {selected?.status === "Rejected" ? (
                        <Card className="border-destructive-border bg-destructive-muted">
                            <CardHeader>
                                <CardTitle>Resubmission Required</CardTitle>
                                <CardDescription>
                                    This PBAS application was rejected. Review remarks in the timeline and resubmit after updates.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ) : null}

                    {canEdit ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>PBAS Annual Appraisal Form</CardTitle>
                                <CardDescription>
                                    Step through application details, source records, and score review for PBAS scoring.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Stepper
                                    steps={STEPS}
                                    currentIndex={currentStepIndex}
                                    visitedSteps={visitedSteps}
                                    hasErrors={hasErrorsForStep}
                                    onStepChange={handleStepChange}
                                />
                                {renderActiveStep()}
                            </CardContent>
                        </Card>
                    ) : selected ? (
                        <PbasSubmissionSummary
                            application={selected}
                            submittedAt={submittedAt}
                            sourceTables={sourceTables}
                            sourcesLoading={detailLoading}
                            sourcesError={detailError}
                            snapshot={selectedSnapshot}
                            entries={entries}
                            entryLoading={entryLoading}
                            entryError={entryError}
                            revisionHistory={selectedDetail?.revisionHistory ?? []}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
