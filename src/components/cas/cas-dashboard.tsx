"use client";

import { ShieldCheck, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    designationOptions,
    getAllowedCasPromotionTargets,
    getDefaultCasTarget,
    getDesignationProfile,
} from "@/lib/faculty/options";
import { casApplicationSchema } from "@/lib/cas/validators";
import {
    uploadFile,
    validateFile,
    UploadValidationError,
    type UploadProgress,
} from "@/lib/upload/service";

type CasFormValues = z.input<typeof casApplicationSchema>;
type CasResolvedValues = z.output<typeof casApplicationSchema>;

type PbasOption = {
    _id: string;
    academicYear: string;
    totalApiScore?: number;
    teachingScore?: number;
    researchScore?: number;
    institutionalScore?: number;
    status?: string;
    usableForSubmit?: boolean;
};

type CasApp = {
    _id: string;
    applicationYearId?: string;
    applicationYear: string;
    currentDesignation: string;
    applyingForDesignation: string;
    eligibilityPeriod: { fromYear: number; toYear: number };
    experienceYears: number;
    pbasReports: string[];
    apiScore: {
        teachingLearning: number;
        researchPublication: number;
        academicContribution: number;
        totalScore: number;
    };
    eligibility?: {
        isEligible: boolean;
        message?: string;
        minimumExperienceYears?: number;
        minimumApiScore?: number;
    };
    linkedAchievements?: {
        publications: Array<{ title: string; journal: string; year: number; issn?: string; indexing?: string }>;
        books: Array<{ title: string; publisher: string; isbn?: string; year: number }>;
        researchProjects: Array<{ title: string; fundingAgency: string; amount: number; year: number }>;
        phdGuided: number;
        conferences: number;
    };
    manualAchievements?: {
        publications: Array<{ title: string; journal: string; year: number; issn?: string; indexing?: string }>;
        books: Array<{ title: string; publisher: string; isbn?: string; year: number }>;
        researchProjects: Array<{ title: string; fundingAgency: string; amount: number; year: number }>;
        phdGuided: number;
        conferences: number;
    };
    committeeReviews?: Array<{
        _id?: string;
        committeeMemberName: string;
        designation: string;
        role: string;
        reviewerRole?: string;
        stage: string;
        remarks?: string;
        decision?: string;
        decisionDate?: string;
        createdAt?: string;
    }>;
    apiBreakup?: Array<{
        _id?: string;
        categoryCode: string;
        scoreObtained: number;
        minimumRequired: number;
        eligible: boolean;
    }>;
    status: string;
    statusLogs: Array<{
        _id?: string;
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt: string;
    }>;
    submittedAt?: string;
    updatedAt: string;
};

type CasEligibility = {
    eligible: boolean;
    reason: string;
    requiredYears?: number;
    requiredScore?: number;
    currentDesignation?: string;
    nextDesignation?: string;
    experienceYears?: number;
    lastApprovedApiScore?: number;
    lastApprovedYear?: string;
    approvedPbasCount: number;
    missingProfileFields: string[];
};

type CasDocumentItem = {
    documentType: string;
    label: string;
    isMandatory: boolean;
    documentId?: { _id?: string; fileName?: string; fileUrl?: string; fileType?: string } | null;
    uploadedAt?: string | null;
};

type CasWorkflowStatus = {
    moduleName?: string;
    recordId?: string;
    currentApproverRole: string;
    status: string;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
};

const steps = [
    "Basic Details",
    "Eligibility Period",
    "PBAS Reports",
    "Publications (Optional)",
    "Books & Projects (Optional)",
    "Academic Contributions",
    "Documents & Checklist",
    "Review and Submit",
] as const;

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
        manualAchievements: {
            publications: [],
            books: [],
            researchProjects: [],
            phdGuided: 0,
            conferences: 0,
        },
    };
}

function emptyAchievements() {
    return {
        publications: [],
        books: [],
        researchProjects: [],
        phdGuided: 0,
        conferences: 0,
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
        manualAchievements: application.manualAchievements ?? emptyAchievements(),
    };
}

export function CASProgressStepper({
    currentStep,
}: {
    currentStep: number;
}) {
    return (
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            {steps.map((step, index) => (
                <div className={`rounded-lg border p-3 text-sm ${index <= currentStep ? "border-zinc-300 bg-white text-zinc-950" : "border-zinc-200 bg-zinc-50 text-zinc-500"}`} key={step}>
                    <p className="text-xs uppercase tracking-[0.16em]">Step {index + 1}</p>
                    <p className="mt-2 font-medium">{step}</p>
                </div>
            ))}
        </div>
    );
}

export function AchievementTable({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">{children}</CardContent>
        </Card>
    );
}

function LinkedAchievementsReadonly({
    linkedAchievements,
}: {
    linkedAchievements: NonNullable<CasApp["linkedAchievements"]>;
}) {
    return (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            <div>
                <p className="font-semibold text-zinc-950">Linked profile achievements (read-only)</p>
                <p className="mt-1 text-zinc-600">
                    These records are reused from profile data and are not editable in CAS.
                </p>
            </div>

            <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <summary className="cursor-pointer font-medium text-zinc-900">
                    Publications ({linkedAchievements.publications.length})
                </summary>
                {linkedAchievements.publications.length ? (
                    <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                            <thead className="text-zinc-500">
                                <tr>
                                    <th className="px-2 py-1 font-medium">Title</th>
                                    <th className="px-2 py-1 font-medium">Journal</th>
                                    <th className="px-2 py-1 font-medium">Year</th>
                                    <th className="px-2 py-1 font-medium">ISSN</th>
                                    <th className="px-2 py-1 font-medium">Indexing</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linkedAchievements.publications.map((item, index) => (
                                    <tr key={`${item.title}-${index}`} className="border-t border-zinc-200">
                                        <td className="px-2 py-1 text-zinc-900">{item.title}</td>
                                        <td className="px-2 py-1">{item.journal || "-"}</td>
                                        <td className="px-2 py-1">{item.year}</td>
                                        <td className="px-2 py-1">{item.issn || "-"}</td>
                                        <td className="px-2 py-1">{item.indexing || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="mt-2 text-xs text-zinc-500">No linked publications available.</p>
                )}
            </details>

            <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <summary className="cursor-pointer font-medium text-zinc-900">
                    Books ({linkedAchievements.books.length})
                </summary>
                {linkedAchievements.books.length ? (
                    <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                            <thead className="text-zinc-500">
                                <tr>
                                    <th className="px-2 py-1 font-medium">Title</th>
                                    <th className="px-2 py-1 font-medium">Publisher</th>
                                    <th className="px-2 py-1 font-medium">Year</th>
                                    <th className="px-2 py-1 font-medium">ISBN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linkedAchievements.books.map((item, index) => (
                                    <tr key={`${item.title}-${index}`} className="border-t border-zinc-200">
                                        <td className="px-2 py-1 text-zinc-900">{item.title}</td>
                                        <td className="px-2 py-1">{item.publisher || "-"}</td>
                                        <td className="px-2 py-1">{item.year}</td>
                                        <td className="px-2 py-1">{item.isbn || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="mt-2 text-xs text-zinc-500">No linked books available.</p>
                )}
            </details>

            <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <summary className="cursor-pointer font-medium text-zinc-900">
                    Research Projects ({linkedAchievements.researchProjects.length})
                </summary>
                {linkedAchievements.researchProjects.length ? (
                    <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                            <thead className="text-zinc-500">
                                <tr>
                                    <th className="px-2 py-1 font-medium">Title</th>
                                    <th className="px-2 py-1 font-medium">Funding Agency</th>
                                    <th className="px-2 py-1 font-medium">Amount</th>
                                    <th className="px-2 py-1 font-medium">Year</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linkedAchievements.researchProjects.map((item, index) => (
                                    <tr key={`${item.title}-${index}`} className="border-t border-zinc-200">
                                        <td className="px-2 py-1 text-zinc-900">{item.title}</td>
                                        <td className="px-2 py-1">{item.fundingAgency || "-"}</td>
                                        <td className="px-2 py-1">{item.amount}</td>
                                        <td className="px-2 py-1">{item.year}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="mt-2 text-xs text-zinc-500">No linked research projects available.</p>
                )}
            </details>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                Linked conference count: {linkedAchievements.conferences}
            </div>
        </div>
    );
}

export function PBASSelector({
    options,
    selectedIds,
    onToggle,
}: {
    options: PbasOption[];
    selectedIds: string[];
    onToggle: (id: string) => void;
}) {
    return (
        <div className="grid gap-3">
            {options.length ? options.map((item) => {
                const isSelected = selectedIds.includes(item._id);
                return (
                    <button
                        type="button"
                        onClick={() => onToggle(item._id)}
                        key={item._id}
                        className={`rounded-lg border p-4 text-left ${isSelected ? "border-zinc-400 bg-white" : "border-zinc-200 bg-zinc-50"}`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-zinc-950">{item.academicYear}</p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Teaching {item.teachingScore ?? 0} | Research {item.researchScore ?? 0} | Institutional {item.institutionalScore ?? 0}
                                </p>
                                {item.status ? (
                                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-400">
                                        {item.status}{item.usableForSubmit === false ? " • Preview only" : ""}
                                    </p>
                                ) : null}
                            </div>
                            <Badge>{isSelected ? "Selected" : item.usableForSubmit === false ? "Preview" : "Available"}</Badge>
                        </div>
                    </button>
                );
            }) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                    No PBAS reports are available yet. Create and submit PBAS applications first in the PBAS module.
                </div>
            )}
        </div>
    );
}

export function APIScoreCalculator({
    score,
    eligibility,
    breakup,
}: {
    score: { teachingLearning: number; researchPublication: number; academicContribution: number; totalScore: number };
    eligibility: { isEligible: boolean; message?: string; minimumExperienceYears?: number; minimumApiScore?: number };
    breakup?: CasApp["apiBreakup"];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>API Score Calculator</CardTitle>
                <CardDescription>Authoritative CAS scoring comes from the saved server-side PBAS and achievement mapping.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ScoreCard label="Teaching Learning" value={score.teachingLearning} />
                <ScoreCard label="Research Publications" value={score.researchPublication} />
                <ScoreCard label="Academic Contribution" value={score.academicContribution} />
                <ScoreCard label="Total API Score" value={score.totalScore} />
                <div className={`md:col-span-2 xl:col-span-4 rounded-lg border p-4 ${eligibility.isEligible ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <p className="text-sm font-semibold">{eligibility.isEligible ? "Eligible" : "Not Eligible"}</p>
                    <p className="mt-1 text-sm">{eligibility.message ?? "Eligibility is being recalculated from the saved CAS record."}</p>
                </div>
                {breakup?.length ? (
                    <div className="md:col-span-2 xl:col-span-4 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-white text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Category</th>
                                    <th className="px-4 py-3 font-medium">Obtained</th>
                                    <th className="px-4 py-3 font-medium">Minimum</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breakup.map((entry) => (
                                    <tr className="border-t border-zinc-200" key={entry._id ?? entry.categoryCode}>
                                        <td className="px-4 py-3 font-medium text-zinc-900">{entry.categoryCode}</td>
                                        <td className="px-4 py-3">{entry.scoreObtained}</td>
                                        <td className="px-4 py-3">{entry.minimumRequired}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={entry.eligible ? "default" : "secondary"}>
                                                {entry.eligible ? "Met" : "Pending"}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

export function CASStatusTimeline({
    logs,
}: {
    logs: CasApp["statusLogs"];
}) {
    return (
        <div className="grid gap-3">
            {logs.length ? logs.map((log) => (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={log._id ?? `${log.status}-${log.changedAt}`}>
                    <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-zinc-950">{log.status}</p>
                        <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{new Date(log.changedAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">{log.actorName ? `${log.actorName} (${log.actorRole ?? "User"})` : "System"}</p>
                    {log.remarks ? <p className="mt-1 text-sm text-zinc-500">{log.remarks}</p> : null}
                </div>
            )) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                    No CAS status updates recorded yet.
                </div>
            )}
        </div>
    );
}

export function CASCommitteeTimeline({
    reviews,
}: {
    reviews: NonNullable<CasApp["committeeReviews"]>;
}) {
    return (
        <div className="grid gap-3">
            {reviews.length ? reviews.map((review) => (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={review._id ?? `${review.stage}-${review.createdAt}`}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-zinc-950">{review.stage}</p>
                            <p className="mt-1 text-sm text-zinc-600">
                                {review.committeeMemberName} ({review.reviewerRole ?? review.role})
                            </p>
                        </div>
                        <Badge>{review.decision ?? "Recorded"}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">{review.designation}</p>
                    {review.remarks ? <p className="mt-2 text-sm text-zinc-500">{review.remarks}</p> : null}
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-400">
                        {new Date(review.decisionDate ?? review.createdAt ?? Date.now()).toLocaleString()}
                    </p>
                </div>
            )) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                    No committee reviews recorded yet.
                </div>
            )}
        </div>
    );
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
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [documents, setDocuments] = useState<CasDocumentItem[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    const [docError, setDocError] = useState<string | null>(null);
    const [docProgress, setDocProgress] = useState<Record<string, UploadProgress | null>>({});
    const [docUploadError, setDocUploadError] = useState<Record<string, string>>({});
    const [workflow, setWorkflow] = useState<CasWorkflowStatus | null>(null);
    const [workflowLoading, setWorkflowLoading] = useState(false);
    const [workflowError, setWorkflowError] = useState<string | null>(null);

    const selected = applications.find((item) => item._id === selectedId);
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
        ...emptyAchievements(),
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

    async function handleDocumentUpload(documentType: string, file: File) {
        setDocUploadError((current) => ({ ...current, [documentType]: "" }));

        try {
            validateFile(file, "document");
        } catch (err) {
            if (err instanceof UploadValidationError) {
                setDocUploadError((current) => ({ ...current, [documentType]: err.message }));
            }
            return;
        }

        setDocProgress((current) => ({ ...current, [documentType]: null }));

        try {
            const result = await uploadFile(file, "document", facultyId, (progress) => {
                setDocProgress((current) => ({ ...current, [documentType]: progress }));
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
                throw new Error("Unable to save CAS document.");
            }

            await persistDocument(documentType, docData.document._id);
            setDocProgress((current) => ({ ...current, [documentType]: null }));
        } catch (err) {
            setDocProgress((current) => ({ ...current, [documentType]: null }));
            setDocUploadError((current) => ({
                ...current,
                [documentType]: err instanceof Error ? err.message : "Document upload failed.",
            }));
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
                    <div className={`rounded-lg border p-4 ${eligibility.eligible ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Eligibility</p>
                        <p className="mt-2 text-lg font-semibold text-zinc-950">
                            {eligibility.eligible ? "Eligible" : "Not Eligible"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{eligibility.reason}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Required</p>
                        <p className="mt-2 text-lg font-semibold text-zinc-950">
                            {eligibility.requiredYears ?? "--"} yrs | API {eligibility.requiredScore ?? "--"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                            Next: {eligibility.nextDesignation ?? "Not configured"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Approved PBAS</p>
                        <p className="mt-2 text-lg font-semibold text-zinc-950">
                            {eligibility.lastApprovedApiScore ?? 0}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                            {eligibility.lastApprovedYear ? `Year ${eligibility.lastApprovedYear}` : "No approved PBAS yet"}
                        </p>
                    </div>
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
                        <Button className="w-full" onClick={createDraft} type="button" disabled={isPending}>
                            {isPending ? <Spinner /> : null}
                            Start CAS Draft
                        </Button>
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
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
                                }}
                                key={application._id}
                                className={`rounded-lg border p-4 text-left ${selectedId === application._id ? "border-zinc-400 bg-white" : "border-zinc-200 bg-zinc-50"}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-zinc-950">{application.applyingForDesignation}</p>
                                    <Badge>{application.status}</Badge>
                                </div>
                                <p className="mt-2 text-sm text-zinc-600">
                                    {application.currentDesignation} | {application.applicationYear}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    API {application.apiScore.totalScore} | Experience {application.experienceYears} years
                                </p>
                            </button>
                        )) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
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
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                Loading verification status...
                            </div>
                        ) : workflowError ? (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                {workflowError}
                            </div>
                        ) : workflow ? (
                            <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Status</p>
                                        <p className="mt-1 text-base font-semibold text-zinc-950">{workflow.status}</p>
                                    </div>
                                    <Badge>{workflow.currentApproverRole}</Badge>
                                </div>
                                <div className="text-xs text-zinc-500">
                                    Last updated{" "}
                                    {workflow.updatedAt
                                        ? new Date(workflow.updatedAt).toLocaleString()
                                        : "Not available"}
                                </div>
                                {workflow.remarks ? (
                                    <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                                        {workflow.remarks}
                                    </div>
                                ) : (
                                    <div className="text-xs text-zinc-500">
                                        No verification remarks recorded yet.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                Verification workflow has not started yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {message ? <FormMessage message={message.text} type={message.type} /> : null}

                {selected?.status === "Rejected" ? (
                    <Card className="border-rose-200 bg-rose-50">
                        <CardHeader>
                            <CardTitle>Resubmission Required</CardTitle>
                            <CardDescription>
                                This CAS application was rejected. Review remarks and resubmit once corrections are made.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : null}

                <CASProgressStepper currentStep={currentStep} />
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
                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <Field label="Application Year">
                                        <Controller
                                            control={form.control}
                                            name="applicationYearId"
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value || undefined}
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        const matchingOption = applicationYearOptions.find((option) => option.id === value);
                                                        form.setValue("applicationYear", matchingOption?.label ?? "", {
                                                            shouldDirty: true,
                                                            shouldValidate: true,
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select application year" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {applicationYearOptions.map((option) => (
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
                                        <Controller
                                            control={form.control}
                                            name="currentDesignation"
                                            render={({ field }) => (
                                                <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select designation" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {designationOptions.map((option) => (
                                                            <SelectItem key={option} value={option}>
                                                                {option}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </Field>
                                    <Field label="Applying For">
                                        <Controller
                                            control={form.control}
                                            name="applyingForDesignation"
                                            render={({ field }) => (
                                                <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select designation" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allowedPromotionTargets.map((option) => (
                                                            <SelectItem key={option} value={option}>
                                                                {option}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </Field>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    <p className="font-semibold text-zinc-950">{designationProfile.label}</p>
                                    <p className="mt-1">{designationProfile.casFocus}</p>
                                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-500">
                                        Allowed promotion path: {allowedPromotionTargets.join(" / ")}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {currentStep === 1 ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                <Field label="Eligibility From Year"><Input type="number" {...form.register("eligibilityPeriod.fromYear", { valueAsNumber: true })} /></Field>
                                <Field label="Eligibility To Year"><Input type="number" {...form.register("eligibilityPeriod.toYear", { valueAsNumber: true })} /></Field>
                                <Field label="Experience Years"><Input type="number" {...form.register("experienceYears", { valueAsNumber: true })} /></Field>
                            </div>
                        ) : null}

                        {currentStep === 2 ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    Select approved PBAS reports. CAS API scoring primarily reuses linked PBAS data, so you only
                                    add achievements below when something is not already captured.
                                </div>
                                <LinkedAchievementsReadonly linkedAchievements={linkedAchievements} />
                                <PBASSelector
                                    options={pbasOptions}
                                    selectedIds={watchedValues.pbasReports ?? []}
                                    onToggle={(id) => {
                                        const current = form.getValues("pbasReports") ?? [];
                                        form.setValue(
                                            "pbasReports",
                                            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                                            { shouldDirty: true }
                                        );
                                    }}
                                />
                            </div>
                        ) : null}

                        {currentStep === 3 ? (
                            <AchievementTable title="Research Publications (Optional Additions)" description="Add only missing publications that are not already covered in your PBAS-linked data.">
                                {publicationFields.fields.map((field, index) => (
                                    <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-5" key={field.id}>
                                        <Input placeholder="Title" {...form.register(`manualAchievements.publications.${index}.title`)} />
                                        <Input placeholder="Journal" {...form.register(`manualAchievements.publications.${index}.journal`)} />
                                        <Input placeholder="Year" type="number" {...form.register(`manualAchievements.publications.${index}.year`, { valueAsNumber: true })} />
                                        <Input placeholder="ISSN" {...form.register(`manualAchievements.publications.${index}.issn`)} />
                                        <Input placeholder="Indexing" {...form.register(`manualAchievements.publications.${index}.indexing`)} />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => publicationFields.remove(index)}
                                            aria-label={`Delete publication ${index + 1}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => publicationFields.append({ title: "", journal: "", year: new Date().getFullYear(), issn: "", indexing: "" })}>
                                    Add Extra Publication
                                </Button>
                            </AchievementTable>
                        ) : null}

                        {currentStep === 4 ? (
                            <div className="space-y-6">
                                <AchievementTable title="Books" description="Record published books and chapters relevant to CAS review.">
                                    {bookFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4" key={field.id}>
                                            <Input placeholder="Title" {...form.register(`manualAchievements.books.${index}.title`)} />
                                            <Input placeholder="Publisher" {...form.register(`manualAchievements.books.${index}.publisher`)} />
                                            <Input placeholder="ISBN" {...form.register(`manualAchievements.books.${index}.isbn`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`manualAchievements.books.${index}.year`, { valueAsNumber: true })} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => bookFields.remove(index)}
                                                aria-label={`Delete book ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => bookFields.append({ title: "", publisher: "", isbn: "", year: new Date().getFullYear() })}>
                                        Add Extra Book
                                    </Button>
                                </AchievementTable>
                                <AchievementTable title="Research Projects" description="Capture only additional funded projects that are not already represented in PBAS-linked records.">
                                    {projectFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4" key={field.id}>
                                            <Input placeholder="Title" {...form.register(`manualAchievements.researchProjects.${index}.title`)} />
                                            <Input placeholder="Funding Agency" {...form.register(`manualAchievements.researchProjects.${index}.fundingAgency`)} />
                                            <Input placeholder="Amount" type="number" {...form.register(`manualAchievements.researchProjects.${index}.amount`, { valueAsNumber: true })} />
                                            <Input placeholder="Year" type="number" {...form.register(`manualAchievements.researchProjects.${index}.year`, { valueAsNumber: true })} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => projectFields.remove(index)}
                                                aria-label={`Delete project ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => projectFields.append({ title: "", fundingAgency: "", amount: 0, year: new Date().getFullYear() })}>
                                        Add Extra Project
                                    </Button>
                                </AchievementTable>
                            </div>
                        ) : null}

                        {currentStep === 5 ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    {designationProfile.showCasPhdGuided
                                        ? "This promotion path includes doctoral guidance as a visible CAS contribution field."
                                        : "This promotion path keeps the academic contribution section lighter, with PBAS, publications, books, projects, and conference activity carrying most of the score."}
                                </div>
                                <div className={`grid gap-4 ${designationProfile.showCasPhdGuided && designationProfile.showCasConferenceCount ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                                    {designationProfile.showCasPhdGuided ? (
                                        <Field label="PhD Guided"><Input type="number" {...form.register("manualAchievements.phdGuided", { valueAsNumber: true })} /></Field>
                                    ) : null}
                                    {designationProfile.showCasConferenceCount ? (
                                        <Field label="Conferences"><Input type="number" {...form.register("manualAchievements.conferences", { valueAsNumber: true })} /></Field>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        {currentStep === 6 ? (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>CAS Document Checklist</CardTitle>
                                        <CardDescription>
                                            Upload mandatory documents to complete CAS submission.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {docLoading ? (
                                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                                Loading CAS documents...
                                            </div>
                                        ) : docError ? (
                                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                                {docError}
                                            </div>
                                        ) : documents.length ? (
                                            documents.map((doc) => (
                                                <div key={doc.documentType} className="rounded-lg border border-zinc-200 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-zinc-950">{doc.label}</p>
                                                            <p className="text-xs text-zinc-500">
                                                                {doc.isMandatory ? "Mandatory" : "Optional"}
                                                            </p>
                                                        </div>
                                                        {doc.documentId?.fileUrl ? (
                                                            <a
                                                                href={doc.documentId.fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700"
                                                            >
                                                                <ShieldCheck className="size-4" />
                                                                {doc.documentId.fileName || "Uploaded"}
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-zinc-500">Not uploaded</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                                        <input
                                                            type="file"
                                                            accept="application/pdf"
                                                            className="hidden"
                                                            id={`cas-doc-${doc.documentType}`}
                                                            onChange={(event) => {
                                                                const file = event.target.files?.[0];
                                                                if (!file) return;
                                                                event.target.value = "";
                                                                void handleDocumentUpload(doc.documentType, file);
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={`cas-doc-${doc.documentType}`}
                                                            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                                        >
                                                            <Upload className="size-4" />
                                                            Upload Document
                                                        </label>
                                                        {docProgress[doc.documentType] ? (
                                                            <span className="text-xs text-zinc-500">
                                                                Uploading {docProgress[doc.documentType]?.percent ?? 0}%
                                                            </span>
                                                        ) : null}
                                                        {docUploadError[doc.documentType] ? (
                                                            <span className="text-xs text-rose-600">{docUploadError[doc.documentType]}</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                                No CAS documents defined yet.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : null}

                        {currentStep === 7 ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="text-sm font-semibold text-zinc-950">Review Summary</p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        {watchedValues.currentDesignation ?? ""} to {watchedValues.applyingForDesignation ?? ""} | PBAS linked: {(watchedValues.pbasReports ?? []).length}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Linked publications/books/projects: {linkedAchievements.publications.length}/{linkedAchievements.books.length}/{linkedAchievements.researchProjects.length}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Manual additions publications/books/projects: {(watchedValues.manualAchievements?.publications ?? []).length}/{(watchedValues.manualAchievements?.books ?? []).length}/{(watchedValues.manualAchievements?.researchProjects ?? []).length}
                                    </p>
                                    {designationProfile.showCasPhdGuided ? (
                                        <p className="mt-1 text-sm text-zinc-600">
                                            PhD guided: {Number(watchedValues.manualAchievements?.phdGuided ?? 0)}
                                        </p>
                                    ) : null}
                                    {designationProfile.showCasConferenceCount ? (
                                        <p className="mt-1 text-sm text-zinc-600">
                                            Conference contributions: {Number(watchedValues.manualAchievements?.conferences ?? 0)}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button type="button" onClick={submitApplication} disabled={isPending || !selectedId}>
                                        {isPending ? <Spinner /> : null}
                                        Submit CAS Application
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                            <Button type="button" variant="secondary" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0}>
                                Previous
                            </Button>
                            <Button type="button" onClick={() => setCurrentStep((step) => Math.min(steps.length - 1, step + 1))} disabled={currentStep === steps.length - 1}>
                                Next
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
