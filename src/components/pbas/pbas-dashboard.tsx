"use client";

import { ShieldCheck, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDesignationProfile } from "@/lib/faculty/options";
import { pbasApplicationSchema, type PbasSnapshot } from "@/lib/pbas/validators";
import {
    uploadFile,
    validateFile,
    UploadValidationError,
    type UploadProgress,
} from "@/lib/upload/service";

type PbasFormValues = z.input<typeof pbasApplicationSchema>;

type PbasApp = {
    _id: string;
    academicYearId?: string;
    academicYear: string;
    currentDesignation: PbasFormValues["currentDesignation"];
    appraisalPeriod: {
        fromDate: string;
        toDate: string;
    };
    apiScore: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
    };
    snapshot?: PbasSnapshot;
    status: string;
    statusLogs: Array<{
        _id?: string;
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt: string;
    }>;
    updatedAt: string;
};

type PbasDraftReferences = {
    teachingSummaryId?: string;
    teachingLoadIds: string[];
    resultSummaryIds: string[];
    publicationIds: string[];
    bookIds: string[];
    patentIds: string[];
    researchProjectIds: string[];
    eventParticipationIds: string[];
    fdpIds: string[];
    moocCourseIds: string[];
    econtentIds: string[];
    phdGuidanceIds: string[];
    awardIds: string[];
    consultancyIds: string[];
    adminRoleIds: string[];
    institutionalContributionIds: string[];
    socialExtensionIds: string[];
};

type PbasCandidateOption = {
    id: string;
    label: string;
    sublabel?: string;
    note?: string;
};

type PbasReferenceKey = keyof Omit<PbasDraftReferences, "teachingSummaryId"> | "teachingSummaryId";

type PbasSourceRow = {
    id: string;
    sourceType: string;
    title: string;
    subtitle?: string;
    note?: string;
    included: boolean;
    referenceKey?: PbasReferenceKey;
    removable?: boolean;
    sourceHref: string;
};

type PbasSourceStep = "teaching" | "research" | "institutional";

type PbasSourceGroup = {
    title: string;
    description?: string;
    rows: PbasSourceRow[];
};

type PbasSourceStepConfig = {
    label: string;
    description: string;
    groups: PbasSourceGroup[];
};

type PbasSourceTables = Record<PbasSourceStep, PbasSourceStepConfig>;

type PbasCandidatePools = {
    category1: {
        teachingSummary?: PbasCandidateOption;
        teachingLoads: PbasCandidateOption[];
        resultSummaries: PbasCandidateOption[];
    };
    category2: {
        researchPapers: PbasCandidateOption[];
        books: PbasCandidateOption[];
        patents: PbasCandidateOption[];
        conferences: PbasCandidateOption[];
        projects: PbasCandidateOption[];
        moocCourses: PbasCandidateOption[];
        econtentItems: PbasCandidateOption[];
        phdGuidance: PbasCandidateOption[];
        awards: PbasCandidateOption[];
        consultancies: PbasCandidateOption[];
    };
    category3: {
        committees: PbasCandidateOption[];
        administrativeDuties: PbasCandidateOption[];
        examDuties: PbasCandidateOption[];
        studentGuidance: PbasCandidateOption[];
        extensionActivities: PbasCandidateOption[];
        fdps: PbasCandidateOption[];
    };
};

type PbasRevisionSummary = {
    _id: string;
    revisionNumber: number;
    submittedAt: string;
    approvedAt?: string;
    backfillIntegrity?: string;
    migrationSource?: string;
    createdFromStatus: string;
    apiScore: PbasApp["apiScore"];
};

type PbasDetail = PbasApp & {
    draftReferences: PbasDraftReferences;
    candidates: PbasCandidatePools;
    draftSnapshot: PbasSnapshot;
    activeRevision?: {
        _id: string;
        revisionNumber: number;
        submittedAt: string;
        approvedAt?: string;
        backfillIntegrity?: string;
        migrationSource?: string;
        createdFromStatus: string;
        apiScore: PbasApp["apiScore"];
        snapshot: PbasSnapshot;
        draftReferences: PbasDraftReferences;
    } | null;
    revisionHistory: PbasRevisionSummary[];
};

type PbasSummary = {
    activeYear?: { id: string; label: string; yearStart: number; yearEnd: number };
    academicYearOptions: Array<{ id: string; label: string; isActive: boolean }>;
    submissionDeadline?: string;
    lastApprovedApiScore?: number;
    lastApprovedYear?: string;
    warnings: string[];
    stats: {
        teachingLoadHours: number;
        publicationCount: number;
        projectCount: number;
        fdpCount: number;
        adminRoleCount: number;
        extensionCount: number;
        evidenceCount: number;
    };
    meta: PbasFormValues;
    snapshot: PbasSnapshot;
    apiScore: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
    };
    scoringWeights: {
        caps: {
            teachingActivities: number;
            researchAcademicContribution: number;
            institutionalResponsibilities: number;
        };
        category1: {
            classesTaken: number;
            coursePreparationHours: number;
            coursesTaught: number;
            mentoringCount: number;
            labSupervisionCount: number;
        };
        category2: {
            researchPaperHigh: number;
            researchPaperMedium: number;
            researchPaperDefault: number;
            book: number;
            patentGranted: number;
            patentPublished: number;
            patentDefault: number;
            conferenceInternational: number;
            conferenceNational: number;
            conferenceDefault: number;
            projectLargeAmount: number;
            projectMediumAmount: number;
            projectLarge: number;
            projectMedium: number;
            projectDefault: number;
        };
        category3: {
            committee: number;
            administrativeDuty: number;
            examDuty: number;
            studentGuidancePerUnit: number;
            studentGuidanceMaxPerEntry: number;
            extensionActivity: number;
        };
    };
};

type IndicatorEntry = {
    indicatorId: string;
    indicatorCode: string;
    indicatorName: string;
    category?: { id?: string; code?: string; name?: string; maxScore?: number };
    maxScore: number;
    claimedScore: number;
    approvedScore?: number;
    evidenceDocument?: { _id?: string; fileName?: string; fileUrl?: string; fileType?: string } | null;
    remarks?: string;
};

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

export function PBASScoreCalculator({
    score,
}: {
    score: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
    };
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>API Score Calculator</CardTitle>
                <CardDescription>
                    PBAS API score is calculated from faculty records and captured on save or submit.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Metric label="Teaching" value={String(score.teachingActivities)} />
                <Metric label="Research" value={String(score.researchAcademicContribution)} />
                <Metric label="Institutional" value={String(score.institutionalResponsibilities)} />
                <Metric label="Total API" value={String(score.totalScore)} />
            </CardContent>
        </Card>
    );
}

export function PBASStatusTimeline({
    logs,
}: {
    logs: PbasApp["statusLogs"];
}) {
    return (
        <div className="grid gap-3">
            {logs.length ? (
                logs.map((log) => (
                    <div
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                        key={log._id ?? `${log.status}-${log.changedAt}`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <p className="font-semibold text-zinc-950">{log.status}</p>
                            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                                {new Date(log.changedAt).toLocaleString()}
                            </p>
                        </div>
                        <p className="mt-2 text-sm text-zinc-600">
                            {log.actorName ? `${log.actorName} (${log.actorRole ?? "User"})` : "System"}
                        </p>
                        {log.remarks ? <p className="mt-1 text-sm text-zinc-500">{log.remarks}</p> : null}
                    </div>
                ))
            ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                    No PBAS status updates recorded yet.
                </div>
            )}
        </div>
    );
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
    const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress | null>>({});
    const [uploadError, setUploadError] = useState<Record<string, string>>({});
    const [activeSourceStep, setActiveSourceStep] = useState<PbasSourceStep>("teaching");
    const activeStatuses = useMemo(
        () => new Set(["Draft", "Rejected", "Submitted", "Under Review", "Committee Review"]),
        []
    );

    const displayEntries = useMemo(() => {
        const totals = entries.filter((entry) => entry.indicatorCode.endsWith("_TOTAL"));
        return totals.length ? totals : entries;
    }, [entries]);

    const selected = applications.find((item) => item._id === selectedId);
    const activeApplication = useMemo(
        () => applications.find((item) => activeStatuses.has(item.status)),
        [applications, activeStatuses]
    );
    const selectedSnapshot = selectedDetail?.snapshot ?? selected?.snapshot ?? summary.snapshot;
    const canEdit = !selected || ["Draft", "Rejected"].includes(selected.status);
    const academicYearOptions = useMemo(() => {
        if (summary.academicYearOptions?.length) {
            return summary.academicYearOptions;
        }

        if (summary.activeYear?.label) {
            return [{ id: summary.activeYear.id, label: summary.activeYear.label, isActive: true }];
        }

        return [{ id: summary.meta.academicYear, label: summary.meta.academicYear, isActive: true }];
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

    const sourceStepOrder: PbasSourceStep[] = ["teaching", "research", "institutional"];
    const activeSourceStepIndex = sourceStepOrder.indexOf(activeSourceStep);

    useEffect(() => {
        setActiveSourceStep("teaching");
    }, [selectedId]);

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

    async function handleEvidenceUpload(indicatorId: string, file: File) {
        setUploadError((current) => ({ ...current, [indicatorId]: "" }));

        try {
            validateFile(file, "evidence");
        } catch (err) {
            if (err instanceof UploadValidationError) {
                setUploadError((current) => ({ ...current, [indicatorId]: err.message }));
            }
            return;
        }

        setUploadProgress((current) => ({ ...current, [indicatorId]: null }));

        try {
            const result = await uploadFile(file, "evidence", facultyId, (progress) => {
                setUploadProgress((current) => ({ ...current, [indicatorId]: progress }));
            });

            const docResponse = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    fileUrl: result.downloadURL,
                    fileType: file.type,
                }),
            });

            const docData = (await docResponse.json()) as { document?: { _id?: string } };
            if (!docResponse.ok || !docData.document?._id) {
                throw new Error("Unable to save evidence document.");
            }

            await persistEntry(indicatorId, { evidenceDocumentId: docData.document._id });
            setUploadProgress((current) => ({ ...current, [indicatorId]: null }));
        } catch (err) {
            setUploadProgress((current) => ({ ...current, [indicatorId]: null }));
            setUploadError((current) => ({
                ...current,
                [indicatorId]: err instanceof Error ? err.message : "Evidence upload failed.",
            }));
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
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Active Year</p>
                            <p className="mt-2 text-lg font-semibold text-zinc-950">
                                {summary.activeYear?.label || "Not configured"}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Submission Deadline</p>
                            <p className="mt-2 text-lg font-semibold text-zinc-950">
                                {summary.submissionDeadline || "Not configured"}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Last Approved API</p>
                            <p className="mt-2 text-lg font-semibold text-zinc-950">
                                {summary.lastApprovedApiScore ?? 0}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                                {summary.lastApprovedYear ? `Year ${summary.lastApprovedYear}` : "No approved PBAS yet"}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-6">
                        <Metric label="Teaching Hours" value={String(summary.stats.teachingLoadHours)} />
                        <Metric label="Publications" value={String(summary.stats.publicationCount)} />
                        <Metric label="Projects" value={String(summary.stats.projectCount)} />
                        <Metric label="FDP Count" value={String(summary.stats.fdpCount)} />
                        <Metric label="Admin Roles" value={String(summary.stats.adminRoleCount)} />
                        <Metric label="Evidence" value={String(summary.stats.evidenceCount)} />
                    </div>
                    {summary.warnings.length ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
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
                                className="w-full"
                                onClick={createDraft}
                                type="button"
                                disabled={isPending || Boolean(activeApplication)}
                            >
                                {isPending ? <Spinner /> : null}
                                Start PBAS Draft
                            </Button>
                            {activeApplication ? (
                                <p className="text-xs text-amber-700">
                                    One PBAS form is already active ({activeApplication.academicYear}, {activeApplication.status}).
                                    Complete, approve, or reject it before starting a new form.
                                </p>
                            ) : null}
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
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
                                                        ? "border-zinc-400 bg-white"
                                                        : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-semibold text-zinc-950">
                                                        {application.academicYear}
                                                    </p>
                                                    <Badge variant="secondary">{application.status}</Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-zinc-600">
                                                    {application.currentDesignation}
                                                </p>
                                                <p className="mt-1 text-sm text-zinc-500">
                                                    API {application.apiScore.totalScore}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
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
                        <Card className="border-rose-200 bg-rose-50">
                            <CardHeader>
                                <CardTitle>Resubmission Required</CardTitle>
                                <CardDescription>
                                    This PBAS application was rejected. Review remarks in the timeline and resubmit after updates.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ) : null}

                    <PBASScoreCalculator score={score} />
                    <Separator />

                    <Card>
                        <CardHeader>
                            <CardTitle>PBAS Indicator Totals</CardTitle>
                            <CardDescription>
                                Evidence-linked indicator totals for the selected PBAS form.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {entryLoading ? (
                                <PbasIndicatorTableSkeleton />
                            ) : entryError ? (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                    {entryError}
                                </div>
                            ) : displayEntries.length ? (
                                <div className="rounded-lg border border-zinc-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Indicator</TableHead>
                                                <TableHead className="text-right">Claimed</TableHead>
                                                <TableHead className="text-right">Approved</TableHead>
                                                <TableHead>Evidence</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {displayEntries.map((entry) => (
                                                <TableRow key={entry.indicatorId}>
                                                    <TableCell className="align-top">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-zinc-950">
                                                                {entry.indicatorName}
                                                            </p>
                                                            <p className="text-xs text-zinc-500">
                                                                {entry.category?.name} • {entry.indicatorCode} • Max {entry.maxScore}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right align-top">
                                                        <span className="text-sm font-semibold text-zinc-900">{entry.claimedScore}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right align-top">
                                                        <span className="text-sm font-semibold text-emerald-700">
                                                            {entry.approvedScore ?? "--"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <input
                                                                type="file"
                                                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                                                className="hidden"
                                                                id={`pbas-evidence-${entry.indicatorId}`}
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0];
                                                                    if (!file) return;
                                                                    event.target.value = "";
                                                                    void handleEvidenceUpload(entry.indicatorId, file);
                                                                }}
                                                            />
                                                            <Button asChild size="sm" variant="secondary">
                                                                <label
                                                                    htmlFor={`pbas-evidence-${entry.indicatorId}`}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Upload className="mr-2 size-4" />
                                                                    Upload
                                                                </label>
                                                            </Button>
                                                            {entry.evidenceDocument?.fileUrl ? (
                                                                <a
                                                                    href={entry.evidenceDocument.fileUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700"
                                                                >
                                                                    <ShieldCheck className="size-4" />
                                                                    {entry.evidenceDocument.fileName || "Evidence linked"}
                                                                </a>
                                                            ) : (
                                                                <Badge variant="secondary">Missing</Badge>
                                                            )}
                                                            {uploadProgress[entry.indicatorId] ? (
                                                                <span className="text-xs text-zinc-500">
                                                                    Uploading {uploadProgress[entry.indicatorId]?.percent ?? 0}%
                                                                </span>
                                                            ) : null}
                                                            {uploadError[entry.indicatorId] ? (
                                                                <span className="text-xs text-rose-600">
                                                                    {uploadError[entry.indicatorId]}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                    Select a PBAS form to view indicator totals.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>PBAS Annual Appraisal Form</CardTitle>
                            <CardDescription>
                                Metadata and read-only snapshot of faculty records used for PBAS scoring.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="Academic Year">
                                    <Controller
                                        control={form.control}
                                        name="academicYearId"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value || undefined}
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    const matchingOption = academicYearOptions.find((option) => option.id === value);
                                                    form.setValue("academicYear", matchingOption?.label ?? "", {
                                                        shouldDirty: true,
                                                        shouldValidate: true,
                                                    });
                                                }}
                                                disabled={!canEdit}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select academic year" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {academicYearOptions.map((option) => (
                                                        <SelectItem key={option.id} value={option.id}>
                                                            {option.label}{option.isActive ? " (Active)" : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </Field>
                                <Field label="Current Designation">
                                    <Input
                                        {...form.register("currentDesignation")}
                                        disabled
                                        readOnly
                                    />
                                </Field>
                                <Field label="Appraisal From">
                                    <Input type="date" {...form.register("appraisalPeriod.fromDate")} disabled={!canEdit} />
                                </Field>
                                <Field label="Appraisal To">
                                    <Input type="date" {...form.register("appraisalPeriod.toDate")} disabled={!canEdit} />
                                </Field>
                            </div>

                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                PBAS scores are derived from faculty teaching, research, and institutional records. Update the source data in{" "}
                                <a className="font-semibold text-zinc-900 hover:underline" href="/faculty/profile">
                                    Faculty Workspace
                                </a>
                                .
                            </div>

                            <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-zinc-950">{designationProfile.label}</p>
                                    <Badge variant="secondary">{watchedValues.currentDesignation || selected?.currentDesignation || "PBAS"}</Badge>
                                </div>
                                <p className="mt-2 text-sm text-zinc-600">{designationProfile.pbasFocus}</p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-zinc-500">
                                    {designationProfile.key === "early_assistant" ? (
                                        <>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Teaching-heavy visibility</span>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Research growth</span>
                                        </>
                                    ) : null}
                                    {designationProfile.key === "advanced_assistant" ? (
                                        <>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Balanced teaching + research</span>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Institutional contribution visible</span>
                                        </>
                                    ) : null}
                                    {designationProfile.key === "associate" ? (
                                        <>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Research-first visibility</span>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Leadership contribution visible</span>
                                        </>
                                    ) : null}
                                    {designationProfile.key === "professor" ? (
                                        <>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Leadership-first visibility</span>
                                            <span className="rounded-full border border-zinc-200 px-3 py-1">Mentoring and stewardship</span>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            {detailLoading ? (
                                <PbasReferenceSkeleton />
                            ) : detailError ? (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                    {detailError}
                                </div>
                            ) : selectedDetail ? (
                                <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {sourceStepOrder.map((stepKey, index) => {
                                            const isActive = activeSourceStep === stepKey;
                                            const step = sourceTables?.[stepKey];
                                            const label = step?.label ?? stepKey;

                                            return (
                                                <Button
                                                    key={stepKey}
                                                    type="button"
                                                    size="sm"
                                                    variant={isActive ? "default" : "outline"}
                                                    onClick={() => setActiveSourceStep(stepKey)}
                                                >
                                                    {index + 1}. {label}
                                                </Button>
                                            );
                                        })}
                                    </div>

                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <p className="text-sm font-semibold text-zinc-950">
                                            Step {activeSourceStepIndex + 1}: {sourceTables?.[activeSourceStep]?.label}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-600">
                                            {sourceTables?.[activeSourceStep]?.description}
                                        </p>
                                    </div>

                                    <div className="grid gap-4">
                                        {(sourceTables?.[activeSourceStep]?.groups ?? []).map((group) => (
                                            <ReadonlySourceTable
                                                key={`${activeSourceStep}-${group.title}`}
                                                title={group.title}
                                                rows={group.rows}
                                                canEdit={canEdit}
                                                onRemove={removeFromPbas}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap justify-between gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={activeSourceStepIndex <= 0}
                                            onClick={() => {
                                                const previous = sourceStepOrder[activeSourceStepIndex - 1];
                                                if (previous) setActiveSourceStep(previous);
                                            }}
                                        >
                                            Previous Step
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={activeSourceStepIndex >= sourceStepOrder.length - 1}
                                            onClick={() => {
                                                const next = sourceStepOrder[activeSourceStepIndex + 1];
                                                if (next) setActiveSourceStep(next);
                                            }}
                                        >
                                            Next Step
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid gap-4 lg:grid-cols-3">
                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-zinc-950">Teaching Snapshot</p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Classes taken: {selectedSnapshot.category1.classesTaken}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        Courses taught: {selectedSnapshot.category1.coursesTaught.length}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        Mentoring: {selectedSnapshot.category1.mentoringCount} | Lab: {selectedSnapshot.category1.labSupervisionCount}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-zinc-950">Research Snapshot</p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Papers: {selectedSnapshot.category2.researchPapers.length} | Books: {selectedSnapshot.category2.books.length}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        Patents: {selectedSnapshot.category2.patents.length} | Projects: {selectedSnapshot.category2.projects.length}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        Conferences: {selectedSnapshot.category2.conferences.length}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-zinc-950">Institutional Snapshot</p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Committees: {selectedSnapshot.category3.committees.length} | Admin duties: {selectedSnapshot.category3.administrativeDuties.length}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        Exam duties: {selectedSnapshot.category3.examDuties.length} | Guidance: {selectedSnapshot.category3.studentGuidance.reduce((sum, item) => sum + item.count, 0)}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        Extension activities: {selectedSnapshot.category3.extensionActivities.length}
                                    </p>
                                </div>
                            </div>

                            {selectedDetail?.revisionHistory?.length ? (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="text-sm font-semibold text-zinc-950">Submission Revisions</p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        {selectedDetail.revisionHistory.map((revision) => (
                                            <div key={revision._id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-semibold text-zinc-950">Revision {revision.revisionNumber}</p>
                                                    <Badge variant="secondary">{revision.apiScore.totalScore}</Badge>
                                                </div>
                                                <p className="mt-2">
                                                    Submitted {new Date(revision.submittedAt).toLocaleString()}
                                                </p>
                                                <p>
                                                    {revision.approvedAt
                                                        ? `Approved ${new Date(revision.approvedAt).toLocaleString()}`
                                                        : revision.createdFromStatus}
                                                </p>
                                                {revision.backfillIntegrity || revision.migrationSource ? (
                                                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                                                        {[revision.backfillIntegrity, revision.migrationSource].filter(Boolean).join(" • ")}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex flex-wrap gap-3">
                                {selectedId ? (
                                    <Button asChild type="button" variant="secondary">
                                        <a href={`/api/pbas/${selectedId}/report`}>Download PBAS PDF</a>
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    onClick={submitApplication}
                                    disabled={isPending || !selectedId || !canEdit}
                                >
                                    {isPending ? <Spinner /> : null}
                                    Submit PBAS Application
                                </Button>
                            </div>
                            {submitDisabledReason ? (
                                <p className="text-sm text-amber-700">{submitDisabledReason}</p>
                            ) : null}
                        </CardContent>
                </Card>
            </div>
        </div>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <p className="text-sm font-medium text-zinc-950">{label}</p>
            {children}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function PbasIndicatorTableSkeleton() {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="grid gap-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}

function PbasReferenceSkeleton() {
    return (
        <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={`reference-skeleton-${index}`} className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ReadonlySourceTable({
    title,
    rows,
    canEdit,
    onRemove,
}: {
    title: string;
    rows: PbasSourceRow[];
    canEdit: boolean;
    onRemove: (row: PbasSourceRow) => void;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-950">{title}</p>
            {rows.length ? (
                <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Source</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={`${title}-${row.id}`}>
                                    <TableCell className="align-top text-sm font-medium text-zinc-900">
                                        {row.sourceType}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <p className="text-sm font-medium text-zinc-950">{row.title}</p>
                                        {row.subtitle ? <p className="text-xs text-zinc-500">{row.subtitle}</p> : null}
                                        {row.note ? (
                                            <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">{row.note}</p>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Badge variant={row.included ? "default" : "secondary"}>
                                            {row.included ? "Included" : "Excluded"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="align-top text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild type="button" size="sm" variant="outline">
                                                <a href={row.sourceHref}>Edit Source</a>
                                            </Button>
                                            {row.included && row.removable !== false ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={!canEdit}
                                                    onClick={() => onRemove(row)}
                                                >
                                                    Remove from PBAS
                                                </Button>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                    No records available in this section for the selected academic year.
                </div>
            )}
        </div>
    );
}
