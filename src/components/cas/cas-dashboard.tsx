"use client";

import { ShieldCheck, Trash2, Upload } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
};

type CasApp = {
    _id: string;
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
    achievements: {
        publications: Array<{ title: string; journal: string; year: number; issn?: string; indexing?: string }>;
        books: Array<{ title: string; publisher: string; isbn?: string; year: number }>;
        researchProjects: Array<{ title: string; fundingAgency: string; amount: number; year: number }>;
        phdGuided: number;
        conferences: number;
    };
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
    "Research Publications",
    "Books and Projects",
    "Academic Contributions",
    "Documents & Checklist",
    "Review and Submit",
] as const;

const designationOptions = [
    "Assistant Professor (Stage 1)",
    "Assistant Professor (Stage 2)",
    "Assistant Professor (Stage 3)",
    "Assistant Professor (Stage 4)",
    "Associate Professor",
    "Professor",
];

function emptyForm(): CasFormValues {
    const year = new Date().getFullYear();

    return {
        applicationYear: `${year}-${year + 1}`,
        currentDesignation: "Assistant Professor (Stage 1)",
        applyingForDesignation: "Assistant Professor (Stage 2)",
        eligibilityPeriod: {
            fromYear: year - 4,
            toYear: year,
        },
        experienceYears: 0,
        pbasReports: [],
        achievements: {
            publications: [],
            books: [],
            researchProjects: [],
            phdGuided: 0,
            conferences: 0,
        },
    };
}

function toFormValues(application?: CasApp): CasFormValues {
    if (!application) {
        return emptyForm();
    }

    return {
        applicationYear: application.applicationYear,
        currentDesignation: application.currentDesignation,
        applyingForDesignation: application.applyingForDesignation,
        eligibilityPeriod: application.eligibilityPeriod,
        experienceYears: application.experienceYears,
        pbasReports: application.pbasReports,
        achievements: application.achievements,
    };
}

function computeScore(values: CasResolvedValues, pbasOptions: PbasOption[]) {
    const selected = pbasOptions.filter((entry) => values.pbasReports.includes(entry._id));
    const teachingLearning = Math.min(100, selected.reduce((sum, item) => sum + Number(item.teachingScore ?? 0), 0));
    const researchFromPbas = selected.reduce((sum, item) => sum + Number(item.researchScore ?? 0), 0);
    const researchPublications = values.achievements.publications.reduce((sum, item) => {
        const indexing = (item.indexing ?? "").toLowerCase();
        if (indexing.includes("scopus") || indexing.includes("ugc care") || indexing.includes("web")) return sum + 12;
        if (indexing.includes("peer")) return sum + 8;
        return sum + 5;
    }, 0);
    const researchPublication = Math.min(
        150,
        researchFromPbas +
            researchPublications +
            values.achievements.books.length * 15 +
            values.achievements.researchProjects.length * 8 +
            values.achievements.phdGuided * 12 +
            values.achievements.conferences * 4
    );
    const academicContribution = Math.min(
        100,
        selected.reduce((sum, item) => sum + Number(item.institutionalScore ?? 0), 0) + values.achievements.conferences * 2
    );

    return {
        teachingLearning,
        researchPublication,
        academicContribution,
        totalScore: teachingLearning + researchPublication + academicContribution,
    };
}

function computeEligibility(values: CasResolvedValues, totalScore: number) {
    const from = values.currentDesignation.toLowerCase();
    const to = values.applyingForDesignation.toLowerCase();
    const rules = [
        { ok: from.includes("stage 1") && to.includes("stage 2"), exp: 4, api: 120 },
        { ok: from.includes("stage 2") && to.includes("stage 3"), exp: 5, api: 140 },
        { ok: from.includes("stage 3") && (to.includes("stage 4") || to.includes("associate professor")), exp: 3, api: 180 },
        { ok: from.includes("associate professor") && to.includes("professor"), exp: 3, api: 220 },
    ].find((item) => item.ok);

    if (!rules) {
        return {
            isEligible: false,
            message: "This promotion path is not configured in the CAS rules.",
        };
    }

    const isEligible = values.experienceYears >= rules.exp && totalScore >= rules.api;

    return {
        isEligible,
        message: isEligible
            ? `Eligible for submission. Minimum experience ${rules.exp} years and API ${rules.api} satisfied.`
            : `Not yet eligible. This path requires minimum ${rules.exp} years experience and API score ${rules.api}.`,
        minimumExperienceYears: rules.exp,
        minimumApiScore: rules.api,
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
                                        {item.status}
                                    </p>
                                ) : null}
                            </div>
                            <Badge>{isSelected ? "Selected" : "Available"}</Badge>
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
}: {
    score: { teachingLearning: number; researchPublication: number; academicContribution: number; totalScore: number };
    eligibility: { isEligible: boolean; message: string; minimumExperienceYears?: number; minimumApiScore?: number };
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>API Score Calculator</CardTitle>
                <CardDescription>UGC-oriented score calculation updates in real time from PBAS and achievement data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ScoreCard label="Teaching Learning" value={score.teachingLearning} />
                <ScoreCard label="Research Publications" value={score.researchPublication} />
                <ScoreCard label="Academic Contribution" value={score.academicContribution} />
                <ScoreCard label="Total API Score" value={score.totalScore} />
                <div className={`md:col-span-2 xl:col-span-4 rounded-lg border p-4 ${eligibility.isEligible ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <p className="text-sm font-semibold">{eligibility.isEligible ? "Eligible" : "Not Eligible"}</p>
                    <p className="mt-1 text-sm">{eligibility.message}</p>
                </div>
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

export function CasDashboard({
    initialApplications,
    pbasOptions,
    facultyName,
    facultyId,
    evidenceDefaults,
    eligibility,
}: {
    initialApplications: CasApp[];
    pbasOptions: PbasOption[];
    facultyName: string;
    facultyId: string;
    evidenceDefaults: {
        publications: CasFormValues["achievements"]["publications"];
        books: CasFormValues["achievements"]["books"];
        researchProjects: CasFormValues["achievements"]["researchProjects"];
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
    const form = useForm<CasFormValues, unknown, CasResolvedValues>({
        resolver: zodResolver(casApplicationSchema),
        defaultValues: selected
            ? toFormValues(selected)
            : {
                  ...emptyForm(),
                  achievements: {
                      ...emptyForm().achievements,
                      ...evidenceDefaults,
                      phdGuided: 0,
                  },
              },
    });

    const publicationFields = useFieldArray({ control: form.control, name: "achievements.publications" });
    const bookFields = useFieldArray({ control: form.control, name: "achievements.books" });
    const projectFields = useFieldArray({ control: form.control, name: "achievements.researchProjects" });

    useEffect(() => {
        form.reset(
            selected
                ? toFormValues(selected)
                : {
                      ...emptyForm(),
                      achievements: {
                          ...emptyForm().achievements,
                          ...evidenceDefaults,
                          phdGuided: 0,
                      },
                  }
        );
    }, [selectedId, selected, form, evidenceDefaults]);

    const watchedValues = useWatch({ control: form.control });
    const resolved = casApplicationSchema.safeParse(watchedValues);
    const normalizedValues = resolved.success ? resolved.data : casApplicationSchema.parse(emptyForm());
    const score = computeScore(normalizedValues, pbasOptions);
    const computedEligibility = computeEligibility(normalizedValues, score.totalScore);

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
                <APIScoreCalculator score={score} eligibility={computedEligibility} />

                <Card>
                    <CardHeader>
                        <CardTitle>CAS Application Form</CardTitle>
                        <CardDescription>
                            Multi-step UGC-oriented CAS promotion application with PBAS linkage, eligibility validation, and workflow-ready achievements.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {currentStep === 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Field label="Application Year"><Input {...form.register("applicationYear")} /></Field>
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
                        ) : null}

                        {currentStep === 3 ? (
                            <AchievementTable title="Research Publications" description="Add journal and publication records to support CAS research evidence.">
                                {publicationFields.fields.map((field, index) => (
                                    <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-5" key={field.id}>
                                        <Input placeholder="Title" {...form.register(`achievements.publications.${index}.title`)} />
                                        <Input placeholder="Journal" {...form.register(`achievements.publications.${index}.journal`)} />
                                        <Input placeholder="Year" type="number" {...form.register(`achievements.publications.${index}.year`, { valueAsNumber: true })} />
                                        <Input placeholder="ISSN" {...form.register(`achievements.publications.${index}.issn`)} />
                                        <Input placeholder="Indexing" {...form.register(`achievements.publications.${index}.indexing`)} />
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
                                    Add Publication
                                </Button>
                            </AchievementTable>
                        ) : null}

                        {currentStep === 4 ? (
                            <div className="space-y-6">
                                <AchievementTable title="Books" description="Record published books and chapters relevant to CAS review.">
                                    {bookFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4" key={field.id}>
                                            <Input placeholder="Title" {...form.register(`achievements.books.${index}.title`)} />
                                            <Input placeholder="Publisher" {...form.register(`achievements.books.${index}.publisher`)} />
                                            <Input placeholder="ISBN" {...form.register(`achievements.books.${index}.isbn`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`achievements.books.${index}.year`, { valueAsNumber: true })} />
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
                                        Add Book
                                    </Button>
                                </AchievementTable>
                                <AchievementTable title="Research Projects" description="Capture funded projects for CAS evidence and scoring.">
                                    {projectFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4" key={field.id}>
                                            <Input placeholder="Title" {...form.register(`achievements.researchProjects.${index}.title`)} />
                                            <Input placeholder="Funding Agency" {...form.register(`achievements.researchProjects.${index}.fundingAgency`)} />
                                            <Input placeholder="Amount" type="number" {...form.register(`achievements.researchProjects.${index}.amount`, { valueAsNumber: true })} />
                                            <Input placeholder="Year" type="number" {...form.register(`achievements.researchProjects.${index}.year`, { valueAsNumber: true })} />
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
                                        Add Project
                                    </Button>
                                </AchievementTable>
                            </div>
                        ) : null}

                        {currentStep === 5 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="PhD Guided"><Input type="number" {...form.register("achievements.phdGuided", { valueAsNumber: true })} /></Field>
                                <Field label="Conferences"><Input type="number" {...form.register("achievements.conferences", { valueAsNumber: true })} /></Field>
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
                                        Publications: {(watchedValues.achievements?.publications ?? []).length} | Books: {(watchedValues.achievements?.books ?? []).length} | Projects: {(watchedValues.achievements?.researchProjects ?? []).length}
                                    </p>
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
