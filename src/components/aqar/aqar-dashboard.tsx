"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid, parseISO } from "date-fns";
import {
    ArrowRight,
    BookOpenText,
    CalendarClock,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    FileText,
    FolderKanban,
    GraduationCap,
    Layers3,
    Plus,
    Sparkles,
    Trash2,
    Trophy,
    Upload,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    SelectContent,
    SelectItem,
    Select,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAcademicYearReportingPeriod } from "@/lib/academic-year";
import { aqarApplicationSchema } from "@/lib/aqar/validators";
import { uploadFile, UploadValidationError, validateFile, type UploadProgress } from "@/lib/upload/service";
import { cn } from "@/lib/utils";

type AqarFormValues = z.input<typeof aqarApplicationSchema>;
type AqarResolvedValues = z.output<typeof aqarApplicationSchema>;
type AqarFormApi = UseFormReturn<AqarFormValues, unknown, AqarResolvedValues>;

type AqarApp = {
    _id: string;
    academicYearId?: string;
    academicYear: string;
    reportingPeriod: {
        fromDate: string;
        toDate: string;
    };
    facultyContribution: AqarResolvedValues["facultyContribution"];
    metrics: {
        researchPaperCount: number;
        seedMoneyProjectCount: number;
        awardRecognitionCount: number;
        fellowshipCount: number;
        researchFellowCount: number;
        patentCount: number;
        phdAwardCount: number;
        bookChapterCount: number;
        eContentCount: number;
        consultancyCount: number;
        financialSupportCount: number;
        fdpCount: number;
        totalContributionIndex: number;
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
    updatedAt?: string;
    createdAt?: string;
    submittedAt?: string;
};

type StepConfig = {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    fields: string[];
};

type Option = {
    label: string;
    value: string;
};

type AcademicYearOption = {
    id: string;
    label: string;
    isActive?: boolean;
};

const editableStatuses = new Set(["Draft", "Rejected"]);

const steps: StepConfig[] = [
    {
        id: "overview",
        title: "Overview",
        description: "Academic year and reporting period.",
        icon: Sparkles,
        fields: ["academicYear", "reportingPeriod.fromDate", "reportingPeriod.toDate"],
    },
    {
        id: "research-papers",
        title: "Research Papers",
        description: "UGC-notified journal output.",
        icon: BookOpenText,
        fields: ["facultyContribution.researchPapers"],
    },
    {
        id: "projects",
        title: "Seed Money Projects",
        description: "Institution-supported projects.",
        icon: FolderKanban,
        fields: ["facultyContribution.seedMoneyProjects"],
    },
    {
        id: "awards",
        title: "Awards and Fellows",
        description: "Awards, fellowships, research fellows.",
        icon: Trophy,
        fields: [
            "facultyContribution.awardsRecognition",
            "facultyContribution.fellowships",
            "facultyContribution.researchFellows",
        ],
    },
    {
        id: "ip-phd",
        title: "Patents and PhD",
        description: "Patents and doctoral outcomes.",
        icon: GraduationCap,
        fields: ["facultyContribution.patents", "facultyContribution.phdAwards"],
    },
    {
        id: "knowledge-transfer",
        title: "Books and Outreach",
        description: "Books, e-content, consultancy, support, FDP.",
        icon: Layers3,
        fields: [
            "facultyContribution.booksChapters",
            "facultyContribution.eContentDeveloped",
            "facultyContribution.consultancyServices",
            "facultyContribution.financialSupport",
            "facultyContribution.facultyDevelopmentProgrammes",
        ],
    },
    {
        id: "review",
        title: "Review and Submit",
        description: "Final checks and submission.",
        icon: ClipboardCheck,
        fields: [],
    },
];

const fundingAgencyOptions: Option[] = [
    { label: "Government", value: "Government" },
    { label: "Non-Government", value: "Non-Government" },
];

const projectCategoryOptions: Option[] = [
    { label: "Major", value: "Major" },
    { label: "Minor", value: "Minor" },
];

const awardLevelOptions: Option[] = [
    { label: "State", value: "State" },
    { label: "National", value: "National" },
    { label: "International", value: "International" },
];

const levelOptions: Option[] = [
    { label: "National", value: "National" },
    { label: "International", value: "International" },
];

const phdStatusOptions: Option[] = [
    { label: "Awarded", value: "Awarded" },
    { label: "Submitted", value: "Submitted" },
];

const reviewChecklistItems = [
    "I verified dates, academic years, and faculty names across all AQAR sections.",
    "I confirmed the evidence references, links, and proof notes are ready for NAAC review.",
    "I reviewed the summary counts and I am ready to submit this AQAR contribution.",
] as const;

function emptyForm(defaultAcademicYear = ""): AqarFormValues {
    const defaultPeriod = getAcademicYearReportingPeriod(defaultAcademicYear);

    return {
        academicYear: defaultAcademicYear,
        reportingPeriod: {
            fromDate: defaultPeriod?.fromDate ?? "",
            toDate: defaultPeriod?.toDate ?? "",
        },
        facultyContribution: {
            researchPapers: [],
            seedMoneyProjects: [],
            awardsRecognition: [],
            fellowships: [],
            researchFellows: [],
            patents: [],
            phdAwards: [],
            booksChapters: [],
            eContentDeveloped: [],
            consultancyServices: [],
            financialSupport: [],
            facultyDevelopmentProgrammes: [],
        },
    };
}

function toFormValues(application?: AqarApp): AqarFormValues {
    if (!application) return emptyForm();

    return {
        academicYearId: application.academicYearId,
        academicYear: application.academicYear,
        reportingPeriod: application.reportingPeriod,
        facultyContribution: application.facultyContribution,
    };
}

function computeMetrics(values: AqarResolvedValues) {
    const facultyContribution = values.facultyContribution;

    return {
        researchPaperCount: facultyContribution.researchPapers.length,
        seedMoneyProjectCount: facultyContribution.seedMoneyProjects.length,
        awardRecognitionCount: facultyContribution.awardsRecognition.length,
        fellowshipCount: facultyContribution.fellowships.length,
        researchFellowCount: facultyContribution.researchFellows.length,
        patentCount: facultyContribution.patents.length,
        phdAwardCount: facultyContribution.phdAwards.length,
        bookChapterCount: facultyContribution.booksChapters.length,
        eContentCount: facultyContribution.eContentDeveloped.length,
        consultancyCount: facultyContribution.consultancyServices.length,
        financialSupportCount: facultyContribution.financialSupport.length,
        fdpCount: facultyContribution.facultyDevelopmentProgrammes.length,
        totalContributionIndex:
            facultyContribution.researchPapers.length * 5 +
            facultyContribution.seedMoneyProjects.length * 5 +
            facultyContribution.awardsRecognition.length * 4 +
            facultyContribution.fellowships.length * 4 +
            facultyContribution.researchFellows.length * 4 +
            facultyContribution.patents.length * 6 +
            facultyContribution.phdAwards.length * 5 +
            facultyContribution.booksChapters.length * 4 +
            facultyContribution.eContentDeveloped.length * 3 +
            facultyContribution.consultancyServices.length * 4 +
            facultyContribution.financialSupport.length * 2 +
            facultyContribution.facultyDevelopmentProgrammes.length * 2,
    };
}

function getValueAtPath(source: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, key) => {
        if (current === null || current === undefined) return undefined;
        if (Array.isArray(current)) {
            const index = Number(key);
            return Number.isNaN(index) ? undefined : current[index];
        }

        if (typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }

        return undefined;
    }, source);
}

function getErrorMessage(errors: FieldErrors<AqarFormValues>, path: string) {
    const value = getValueAtPath(errors, path);

    if (value && typeof value === "object" && "message" in (value as Record<string, unknown>)) {
        return (value as { message?: string }).message;
    }

    return undefined;
}

function hasErrorsForPaths(errors: FieldErrors<AqarFormValues>, paths: string[]) {
    return paths.some((path) => {
        const value = getValueAtPath(errors, path);

        if (!value) return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    });
}

function parseDateValue(value?: string) {
    if (!value) return undefined;

    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
}

function formatDateLabel(value?: string) {
    const parsed = parseDateValue(value);
    return parsed ? format(parsed, "PPP") : "Select date";
}

function toDateInputValue(value?: Date) {
    return value ? format(value, "yyyy-MM-dd") : "";
}

function formatTimestamp(value?: string) {
    if (!value) return "No activity yet";

    const parsed = parseDateValue(value) ?? new Date(value);
    if (!isValid(parsed)) return "No activity yet";

    return parsed.toLocaleString();
}

function parseAcademicYearLabel(value?: string) {
    const trimmed = String(value ?? "").trim();
    const match = trimmed.match(/^(\d{4})\D+(\d{4})$/);

    if (!match) return null;

    const startYear = Number(match[1]);
    const endYear = Number(match[2]);

    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
        return null;
    }

    return { startYear, endYear };
}

function getLastActivity(application: AqarApp) {
    const statusDates = application.statusLogs.map((log) => log.changedAt).filter(Boolean);
    const candidates = [application.updatedAt, application.submittedAt, application.createdAt, ...statusDates].filter(Boolean) as string[];

    if (!candidates.length) return undefined;

    return candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

function getStatusBadgeClass(status: string) {
    switch (status) {
        case "Approved":
            return "bg-emerald-100 text-emerald-700";
        case "Submitted":
        case "Under Review":
        case "Committee Review":
            return "bg-amber-100 text-amber-700";
        case "Rejected":
            return "bg-red-100 text-red-700";
        default:
            return "bg-zinc-100 text-zinc-700";
    }
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
    academicYearOptions: AcademicYearOption[];
    evidenceDefaults: AqarFormValues["facultyContribution"];
}) {
    const formSectionRef = useRef<HTMLElement | null>(null);
    const lastSavedPayloadRef = useRef<string>("");
    const [applications, setApplications] = useState(initialApplications);
    const [selectedId, setSelectedId] = useState<string | null>(initialApplications[0]?._id ?? null);
    const [currentStep, setCurrentStep] = useState(0);
    const [visitedSteps, setVisitedSteps] = useState<number[]>([0]);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [reviewChecks, setReviewChecks] = useState<boolean[]>(() => reviewChecklistItems.map(() => false));
    const defaultAcademicYear =
        academicYearOptions.find((item) => item.isActive)?.label ?? academicYearOptions[0]?.label ?? "";
    const defaultAcademicYearId =
        academicYearOptions.find((item) => item.isActive)?.id ??
        academicYearOptions.find((item) => item.label === defaultAcademicYear)?.id ??
        "";
    const [prefillDefaults, setPrefillDefaults] = useState(evidenceDefaults);
    const [prefillYear, setPrefillYear] = useState(
        initialApplications[0]?.academicYear ?? defaultAcademicYear
    );
    const [isPrefillLoading, setIsPrefillLoading] = useState(false);

    const selected = applications.find((item) => item._id === selectedId);
    const academicYearSelectOptions = useMemo(() => {
        const options = academicYearOptions.map((item) => ({
            label: item.isActive ? `${item.label} (Active)` : item.label,
            value: item.id,
            yearLabel: item.label,
        }));
        const selectedYear = String(selected?.academicYear ?? prefillYear ?? "").trim();

        if (selectedYear && !options.some((item) => item.yearLabel === selectedYear)) {
            options.unshift({
                label: `${selectedYear} (Current record)`,
                value: selected?.academicYearId ?? selectedYear,
                yearLabel: selectedYear,
            });
        }

        return options;
    }, [academicYearOptions, prefillYear, selected?.academicYear, selected?.academicYearId]);
    const initialValues = useMemo(
        () =>
            selected
                ? toFormValues(selected)
                : {
                      academicYearId: defaultAcademicYearId,
                      ...emptyForm(defaultAcademicYear),
                      facultyContribution: {
                          ...emptyForm(defaultAcademicYear).facultyContribution,
                          ...prefillDefaults,
                      },
                  },
        [defaultAcademicYear, defaultAcademicYearId, selected, prefillDefaults]
    );

    const form = useForm<AqarFormValues, unknown, AqarResolvedValues>({
        resolver: zodResolver(aqarApplicationSchema),
        defaultValues: initialValues,
    });

    const researchPaperFields = useFieldArray({ control: form.control, name: "facultyContribution.researchPapers" });
    const seedMoneyFields = useFieldArray({ control: form.control, name: "facultyContribution.seedMoneyProjects" });
    const awardFields = useFieldArray({ control: form.control, name: "facultyContribution.awardsRecognition" });
    const fellowshipFields = useFieldArray({ control: form.control, name: "facultyContribution.fellowships" });
    const fellowFields = useFieldArray({ control: form.control, name: "facultyContribution.researchFellows" });
    const patentFields = useFieldArray({ control: form.control, name: "facultyContribution.patents" });
    const phdAwardFields = useFieldArray({ control: form.control, name: "facultyContribution.phdAwards" });
    const bookChapterFields = useFieldArray({ control: form.control, name: "facultyContribution.booksChapters" });
    const eContentFields = useFieldArray({ control: form.control, name: "facultyContribution.eContentDeveloped" });
    const consultancyFields = useFieldArray({ control: form.control, name: "facultyContribution.consultancyServices" });
    const financialSupportFields = useFieldArray({ control: form.control, name: "facultyContribution.financialSupport" });
    const fdpFields = useFieldArray({
        control: form.control,
        name: "facultyContribution.facultyDevelopmentProgrammes",
    });

    useEffect(() => {
        form.reset(initialValues);
        lastSavedPayloadRef.current = selected ? JSON.stringify(toFormValues(selected)) : "";
    }, [form, initialValues, selected]);

    useEffect(() => {
        if (selected) {
            return;
        }

        let cancelled = false;

        const loadDefaults = async () => {
            try {
                const response = await fetch(
                    `/api/faculty/report-defaults?academicYear=${encodeURIComponent(form.getValues("academicYear") ?? "")}`,
                    { cache: "no-store" }
                );
                if (!response.ok) return;
                const data = (await response.json()) as {
                    defaults?: { aqar?: AqarFormValues["facultyContribution"] };
                };
                if (cancelled || form.formState.isDirty || !data.defaults?.aqar) return;
                setPrefillDefaults(data.defaults.aqar);
                setPrefillYear(form.getValues("academicYear") ?? "");
            } catch {
                // Ignore prefill refresh failures; keep initial server defaults.
            }
        };

        loadDefaults();

        return () => {
            cancelled = true;
        };
    }, [selected]);

    const watchedValues = useWatch({ control: form.control });
    const watchedAcademicYear = useWatch({ control: form.control, name: "academicYear" });
    const resolved = aqarApplicationSchema.safeParse(watchedValues);
    const normalizedValues = resolved.success ? resolved.data : aqarApplicationSchema.parse(emptyForm());
    const liveMetrics = computeMetrics(normalizedValues);
    const dashboardMetrics = selected?.metrics ?? liveMetrics;
    const editable = !selected || editableStatuses.has(selected.status);
    const reviewReady = reviewChecks.every(Boolean);

    useEffect(() => {
        const selectedYear = String(watchedAcademicYear ?? "").trim();
        if (!selectedYear) {
            return;
        }

        const matchingOption = academicYearSelectOptions.find((option) => option.yearLabel === selectedYear);
        if (!matchingOption) {
            return;
        }

        if (form.getValues("academicYearId") === matchingOption.value) {
            return;
        }

        form.setValue("academicYearId", matchingOption.value, { shouldDirty: false });
    }, [academicYearSelectOptions, form, watchedAcademicYear]);

    const summarySections = useMemo(
        () => [
            { label: "Research papers", count: normalizedValues.facultyContribution.researchPapers.length },
            { label: "Seed money projects", count: normalizedValues.facultyContribution.seedMoneyProjects.length },
            {
                label: "Awards, fellowships, research fellows",
                count:
                    normalizedValues.facultyContribution.awardsRecognition.length +
                    normalizedValues.facultyContribution.fellowships.length +
                    normalizedValues.facultyContribution.researchFellows.length,
            },
            {
                label: "Patents and PhD awards",
                count:
                    normalizedValues.facultyContribution.patents.length +
                    normalizedValues.facultyContribution.phdAwards.length,
            },
            {
                label: "Books and outreach records",
                count:
                    normalizedValues.facultyContribution.booksChapters.length +
                    normalizedValues.facultyContribution.eContentDeveloped.length +
                    normalizedValues.facultyContribution.consultancyServices.length +
                    normalizedValues.facultyContribution.financialSupport.length +
                    normalizedValues.facultyContribution.facultyDevelopmentProgrammes.length,
            },
        ],
        [normalizedValues]
    );

    const reviewWarnings = summarySections.filter((section) => section.count === 0);

    async function loadYearPrefill(academicYear: string, options?: { announce?: boolean }) {
        const normalizedYear = academicYear.trim();
        if (!normalizedYear) {
            return;
        }

        setIsPrefillLoading(true);

        try {
            const response = await fetch(
                `/api/faculty/report-defaults?academicYear=${encodeURIComponent(normalizedYear)}`,
                { cache: "no-store" }
            );
            const data = (await response.json()) as {
                defaults?: { aqar?: AqarFormValues["facultyContribution"] };
                message?: string;
            };

            if (!response.ok || !data.defaults?.aqar) {
                throw new Error(data.message ?? "Unable to load AQAR defaults for the selected year.");
            }

            setPrefillDefaults(data.defaults.aqar);
            setPrefillYear(normalizedYear);
            form.setValue("facultyContribution", data.defaults.aqar, {
                shouldDirty: Boolean(selectedId),
                shouldTouch: true,
            });

            if (options?.announce ?? true) {
                setMessage({
                    type: "success",
                    text: `AQAR records for ${normalizedYear} were loaded from your faculty profile.`,
                });
            }
        } catch (error) {
            setMessage({
                type: "error",
                text: error instanceof Error ? error.message : "Unable to load selected-year AQAR data.",
            });
        } finally {
            setIsPrefillLoading(false);
        }
    }

    useEffect(() => {
        if (selected || !editable) {
            return;
        }

        const hasExistingRows = Object.values(form.getValues("facultyContribution")).some(
            (value) => Array.isArray(value) && value.length > 0
        );

        if (hasExistingRows || prefillYear === (normalizedValues.academicYear ?? "")) {
            return;
        }

        void loadYearPrefill(normalizedValues.academicYear ?? "", { announce: false });
    }, [editable, form, normalizedValues.academicYear, prefillYear, selected]);

    useEffect(() => {
        if (!selectedId || !selected || !editable || !form.formState.isDirty || !resolved.success) return;

        const payload = JSON.stringify(resolved.data);
        if (payload === lastSavedPayloadRef.current) {
            return;
        }

        const timer = window.setTimeout(async () => {
            setAutoSaveState("saving");

            const response = await fetch(`/api/aqar/${selectedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: payload,
            });

            const data = (await response.json()) as { application?: AqarApp };

            if (response.ok && data.application) {
                lastSavedPayloadRef.current = payload;
                setApplications((current) => current.map((item) => (item._id === selectedId ? data.application! : item)));
                form.reset(resolved.data);
                setAutoSaveState("saved");
                return;
            }

            setAutoSaveState("idle");
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [editable, form, resolved, selected, selectedId]);

    function markVisited(...indexes: number[]) {
        setVisitedSteps((current) => Array.from(new Set([...current, ...indexes])));
    }

    function focusFormWorkspace() {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function goToStep(targetStep: number) {
        if (targetStep === currentStep) return;

        if (targetStep < currentStep) {
            markVisited(targetStep);
            setCurrentStep(targetStep);
            return;
        }

        for (let index = currentStep; index < targetStep; index += 1) {
            const valid = await form.trigger(steps[index].fields as never, { shouldFocus: true });
            markVisited(index);

            if (!valid) {
                setCurrentStep(index);
                return;
            }
        }

        markVisited(targetStep);
        setCurrentStep(targetStep);
    }

    async function handleNext() {
        if (currentStep >= steps.length - 1) return;
        await goToStep(currentStep + 1);
    }

    function handlePrevious() {
        if (currentStep === 0) return;
        goToStep(currentStep - 1);
    }

    function selectApplication(applicationId: string) {
        setSelectedId(applicationId);
        setMessage(null);
        setReviewChecks(reviewChecklistItems.map(() => false));
        setCurrentStep(0);
        setVisitedSteps([0]);
        setAutoSaveState("idle");
    }

    function handleApplicationKeyDown(event: KeyboardEvent<HTMLDivElement>, applicationId: string) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectApplication(applicationId);
    }

    function createDraft() {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch("/api/aqar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form.getValues()),
            });

            const data = (await response.json()) as { message?: string; application?: AqarApp };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to create AQAR draft." });
                return;
            }

            setApplications((current) => [data.application!, ...current]);
            setSelectedId(data.application._id);
            setMessage({ type: "success", text: data.message ?? "AQAR draft created." });
            setReviewChecks(reviewChecklistItems.map(() => false));
            setCurrentStep(0);
            setVisitedSteps([0]);
            setAutoSaveState("idle");
            requestAnimationFrame(() => focusFormWorkspace());
        });
    }

    function deleteApplication(applicationId: string) {
        if (!confirm("Delete this AQAR draft? This cannot be undone.")) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            const response = await fetch(`/api/aqar/${applicationId}`, { method: "DELETE" });
            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                setMessage({ type: "error", text: data.message ?? "Unable to delete AQAR application." });
                return;
            }

            setApplications((current) => {
                const remaining = current.filter((item) => item._id !== applicationId);
                if (selectedId === applicationId) {
                    const nextId = remaining[0]?._id ?? null;
                    setSelectedId(nextId);
                    setReviewChecks(reviewChecklistItems.map(() => false));
                    setCurrentStep(0);
                    setVisitedSteps([0]);
                    setAutoSaveState("idle");
                }
                return remaining;
            });

            setMessage({ type: "success", text: data.message ?? "AQAR application deleted." });
        });
    }

    function submitApplication() {
        if (!selectedId) {
            setMessage({ type: "error", text: "Create a draft before submitting." });
            return;
        }

        if (!reviewReady) {
            setMessage({ type: "error", text: "Complete the final review checklist before submission." });
            return;
        }

        startTransition(async () => {
            const response = await fetch(`/api/aqar/${selectedId}/submit`, { method: "POST" });
            const data = (await response.json()) as { message?: string; application?: AqarApp };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to submit AQAR application." });
                return;
            }

            setApplications((current) => current.map((item) => (item._id === selectedId ? data.application! : item)));
            setMessage({ type: "success", text: data.message ?? "AQAR application submitted." });
        });
    }

    return (
        <div className="space-y-8">
            <section className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card className="overflow-hidden border-zinc-200 bg-gradient-to-br from-white via-white to-amber-50/70">
                        <CardHeader className="gap-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <Badge className="bg-zinc-900 text-zinc-50">AQAR Faculty Dashboard</Badge>
                                    <div className="space-y-2">
                                        <CardTitle className="text-3xl">Modern AQAR workspace for {facultyName}</CardTitle>
                                        <CardDescription className="max-w-2xl text-base text-zinc-600">
                                            Keep the dashboard and form workspace separate while managing every AQAR contribution from one full-width faculty module.
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm">
                                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Active Year</p>
                                    <p className="mt-2 text-lg font-semibold text-zinc-950">
                                        {selected?.academicYear ?? normalizedValues.academicYear}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        Status {selected ? selected.status : "Unsaved workspace"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <DashboardStat
                                    label="AQAR applications"
                                    value={String(applications.length)}
                                    detail="Drafts and submitted annual records"
                                />
                                <DashboardStat
                                    label="Contribution index"
                                    value={String(dashboardMetrics.totalContributionIndex)}
                                    detail="Live summary of AQAR contribution weight"
                                />
                                <DashboardStat
                                    label="Research and IP"
                                    value={String(dashboardMetrics.researchPaperCount + dashboardMetrics.patentCount)}
                                    detail="Combined research papers and patents"
                                />
                                <DashboardStat
                                    label="Autosave"
                                    value={selectedId ? autoSaveState : "Inactive"}
                                    detail={
                                        editable
                                            ? "Draft edits are stored automatically"
                                            : "Submission is locked for review"
                                    }
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button type="button" size="lg" onClick={createDraft} disabled={isPending}>
                                    {isPending ? <Spinner /> : <Plus className="h-4 w-4" />}
                                    {selectedId ? "Create New AQAR Draft" : "Start AQAR Draft"}
                                </Button>
                                <Button type="button" variant="outline" size="lg" onClick={focusFormWorkspace}>
                                    Continue in Form Workspace
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle className="text-xl">Selected AQAR Snapshot</CardTitle>
                            <CardDescription>
                                Quick status, timeline, and readiness context for the currently active AQAR record.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <SummaryTile
                                    label="Last activity"
                                    value={formatTimestamp(selected ? getLastActivity(selected) : undefined)}
                                />
                                <SummaryTile
                                    label="Reporting period"
                                    value={`${formatDateLabel(normalizedValues.reportingPeriod.fromDate)} to ${formatDateLabel(normalizedValues.reportingPeriod.toDate)}`}
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <MetricCard label="Awards" value={String(dashboardMetrics.awardRecognitionCount)} />
                                <MetricCard label="FDP records" value={String(dashboardMetrics.fdpCount)} />
                                <MetricCard label="Consultancy" value={String(dashboardMetrics.consultancyCount)} />
                                <MetricCard label="Books and chapters" value={String(dashboardMetrics.bookChapterCount)} />
                            </div>
                            {!editable && selected ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    This AQAR application is in <strong>{selected.status}</strong> state. The form stays view-only until it returns to Draft or Rejected.
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                                    {selectedId
                                        ? "Draft edits are auto-saved while you stay in an editable AQAR status."
                                        : "The form is prefilled from faculty category records. Create a draft to enable autosave and workflow tracking."}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <Card className="border-zinc-200">
                        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="text-xl">AQAR Applications</CardTitle>
                                <CardDescription>
                                    Select an AQAR record to continue editing or review its workflow status.
                                </CardDescription>
                            </div>
                            <Badge className="bg-zinc-100 text-zinc-700">{applications.length} records</Badge>
                        </CardHeader>
                        <CardContent>
                            {applications.length ? (
                                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                    {applications.map((application) => {
                                        const isActive = selectedId === application._id;
                                        const lastActivity = getLastActivity(application);

                                        return (
                                            <div
                                                key={application._id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => selectApplication(application._id)}
                                                onKeyDown={(event) => handleApplicationKeyDown(event, application._id)}
                                                className={cn(
                                                    "rounded-2xl border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30",
                                                    isActive
                                                        ? "border-zinc-900 bg-zinc-900 text-zinc-50 shadow-lg"
                                                        : "border-zinc-200 bg-zinc-50/80 text-zinc-950 hover:border-zinc-300 hover:bg-white"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.18em] text-current/60">
                                                            Academic year
                                                        </p>
                                                        <p className="mt-2 text-lg font-semibold">{application.academicYear}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {editableStatuses.has(application.status) ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    "h-9 w-9",
                                                                    isActive
                                                                        ? "text-white/90 hover:bg-white/10 hover:text-white"
                                                                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                                                )}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    deleteApplication(application._id);
                                                                }}
                                                                aria-label="Delete AQAR draft"
                                                                disabled={isPending}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        ) : null}
                                                        <Badge className={cn("shrink-0", isActive ? "bg-white/15 text-white" : getStatusBadgeClass(application.status))}>
                                                            {application.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                    <SummaryChip
                                                        label="Contribution index"
                                                        value={String(application.metrics.totalContributionIndex)}
                                                        inverse={isActive}
                                                    />
                                                    <SummaryChip
                                                        label="Last activity"
                                                        value={formatTimestamp(lastActivity)}
                                                        inverse={isActive}
                                                    />
                                                </div>
                                                <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                                                    {isActive ? "Currently selected" : "Select this AQAR"}
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    title="No AQAR drafts yet"
                                    description="Start your first AQAR draft to turn the prefilled workspace into a tracked faculty submission."
                                    actionLabel="Create AQAR Draft"
                                    onAction={createDraft}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle className="text-xl">Status Timeline</CardTitle>
                            <CardDescription>Every AQAR workflow transition for the selected record is listed here.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AQARStatusTimeline logs={selected?.statusLogs ?? []} />
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section ref={formSectionRef} className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 xl:p-8">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-zinc-100 text-zinc-700">Form Workspace</Badge>
                                    <Badge className={getStatusBadgeClass(selected?.status ?? "Draft")}>
                                        {selected?.status ?? "Prepared"}
                                    </Badge>
                                </div>
                                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
                                    AQAR Faculty Contribution Form
                                </h2>
                                <p className="max-w-3xl text-sm text-zinc-600">
                                    Complete the AQAR contribution in guided steps. The dashboard stays above for context, while this workspace stays focused on data entry and review.
                                </p>
                            </div>
                            <div className="grid gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                                <div className="flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4" />
                                    Academic year {normalizedValues.academicYear}
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {editable
                                        ? selectedId
                                            ? `Autosave ${autoSaveState}`
                                            : "Create a draft to enable autosave"
                                        : "View-only workflow state"}
                                </div>
                            </div>
                        </div>

                        {message ? <FormMessage message={message.text} type={message.type} /> : null}

                        <div className="sticky top-4 z-20 rounded-[1.5rem] border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                        Step {currentStep + 1} of {steps.length}
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-zinc-950">{steps[currentStep].title}</p>
                                    <p className="text-sm text-zinc-500">{steps[currentStep].description}</p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
                                        Previous
                                    </Button>
                                    {currentStep === steps.length - 1 ? (
                                        <Button
                                            type="button"
                                            onClick={submitApplication}
                                            disabled={isPending || !selectedId || !reviewReady}
                                        >
                                            {isPending ? <Spinner /> : null}
                                            Submit AQAR Application
                                        </Button>
                                    ) : (
                                        <Button type="button" onClick={handleNext}>
                                            Next Step
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <AQARProgressStepper
                                currentStep={currentStep}
                                visitedSteps={visitedSteps}
                                errors={form.formState.errors}
                                onStepChange={goToStep}
                            />
                        </div>
                    </div>

                    <AQARDataTables values={normalizedValues} />

                    {currentStep === 0 ? (
                        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                            <SectionCard
                                title="Reporting Overview"
                                description="Set the annual AQAR context before adding detailed faculty contribution records."
                            >
                                <div className="grid gap-4 md:grid-cols-3">
                                    <SelectField
                                        form={form}
                                        name="academicYearId"
                                        label="Academic year"
                                        options={academicYearSelectOptions}
                                        placeholder="Select academic year"
                                        disabled={!editable}
                                        onValueChange={(value) => {
                                            const selectedOption = academicYearSelectOptions.find((option) => option.value === value);
                                            if (!selectedOption) {
                                                return;
                                            }

                                            form.setValue("academicYear", selectedOption.yearLabel, {
                                                shouldDirty: true,
                                                shouldTouch: true,
                                                shouldValidate: true,
                                            });

                                            const range = parseAcademicYearLabel(selectedOption.yearLabel);
                                            if (!range) return;

                                            form.setValue("reportingPeriod.fromDate", `${range.startYear}-06-01`, {
                                                shouldDirty: true,
                                                shouldTouch: true,
                                            });
                                            form.setValue("reportingPeriod.toDate", `${range.endYear}-05-31`, {
                                                shouldDirty: true,
                                                shouldTouch: true,
                                            });
                                        }}
                                    />
                                    <DatePickerField form={form} name="reportingPeriod.fromDate" label="Reporting from" disabled={!editable} />
                                    <DatePickerField form={form} name="reportingPeriod.toDate" label="Reporting to" disabled={!editable} />
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void loadYearPrefill(normalizedValues.academicYear ?? "")}
                                        disabled={!editable || isPrefillLoading}
                                    >
                                        {isPrefillLoading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                                        Autofill selected year
                                    </Button>
                                    <Badge variant="secondary">
                                        Profile data mapped for {prefillYear}
                                    </Badge>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                                    AQAR defaults are now tied to the selected academic year. Use the autofill action to refresh publications, projects, awards, FDPs, and other faculty records for the chosen cycle before submission.
                                </div>
                            </SectionCard>

                            <SectionCard
                                title="Live AQAR Summary"
                                description="A real-time preview of key counts pulled from the current form state."
                            >
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <MetricCard label="Research papers" value={String(liveMetrics.researchPaperCount)} />
                                    <MetricCard label="Projects" value={String(liveMetrics.seedMoneyProjectCount)} />
                                    <MetricCard label="Awards" value={String(liveMetrics.awardRecognitionCount)} />
                                    <MetricCard label="Patents" value={String(liveMetrics.patentCount)} />
                                    <MetricCard label="Books" value={String(liveMetrics.bookChapterCount)} />
                                    <MetricCard label="Consultancy" value={String(liveMetrics.consultancyCount)} />
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Total contribution index</p>
                                    <p className="mt-2 text-3xl font-semibold text-zinc-950">{liveMetrics.totalContributionIndex}</p>
                                </div>
                            </SectionCard>
                        </div>
                    ) : null}

                    {currentStep === 1 ? (
                        <SectionCard
                            title="Research Papers in UGC-Notified Journals"
                            description="Capture journal publications with indexing, impact factor, and supporting evidence references."
                        >
                            {researchPaperFields.fields.length ? (
                                <div className="grid gap-4">
                                    {researchPaperFields.fields.map((field, index) => (
                                        <EntryCard
                                            key={field.id}
                                            index={index}
                                            title="Research Paper"
                                            onRemove={() => researchPaperFields.remove(index)}
                                            disabled={!editable}
                                        >
                                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.paperTitle`} label="Paper title" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.journalName`} label="Journal name" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.authors`} label="Author(s)" disabled={!editable} />
                                                <TextField
                                                    form={form}
                                                    name={`facultyContribution.researchPapers.${index}.publicationYear`}
                                                    label="Publication year"
                                                    type="number"
                                                    disabled={!editable}
                                                    registerOptions={{ valueAsNumber: true }}
                                                />
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.issnNumber`} label="ISSN number" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.impactFactor`} label="Impact factor" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.indexedIn`} label="Indexed in" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.researchPapers.${index}.links`} label="Links" disabled={!editable} />
                                                <ProofUploadField form={form} name={`facultyContribution.researchPapers.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                <ProofUploadField form={form} name={`facultyContribution.researchPapers.${index}.ifProof`} label="Impact factor proof" facultyId={facultyId} disabled={!editable} />
                                            </div>
                                        </EntryCard>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    title="No research papers added"
                                    description="Add journal publications here to build the AQAR research output summary."
                                    actionLabel="Add First Research Paper"
                                    onAction={() =>
                                        researchPaperFields.append({
                                            paperTitle: "",
                                            journalName: "",
                                            authors: "",
                                            publicationYear: new Date().getFullYear(),
                                            issnNumber: "",
                                            year: "",
                                            impactFactor: "",
                                            indexedIn: "",
                                            links: "",
                                            proof: "",
                                            ifProof: "",
                                        })
                                    }
                                    disabled={!editable}
                                />
                            )}

                            {researchPaperFields.fields.length ? (
                                <SectionAction onClick={() =>
                                    researchPaperFields.append({
                                        paperTitle: "",
                                        journalName: "",
                                        authors: "",
                                        publicationYear: new Date().getFullYear(),
                                        issnNumber: "",
                                        year: "",
                                        impactFactor: "",
                                        indexedIn: "",
                                        links: "",
                                        proof: "",
                                        ifProof: "",
                                    })
                                } disabled={!editable}>
                                    Add Research Paper
                                </SectionAction>
                            ) : null}
                        </SectionCard>
                    ) : null}

                    {currentStep === 2 ? (
                        <SectionCard
                            title="Seed Money Projects"
                            description="Record institution-supported research or innovation projects with funding source and award details."
                        >
                            {seedMoneyFields.fields.length ? (
                                <div className="grid gap-4">
                                    {seedMoneyFields.fields.map((field, index) => (
                                        <EntryCard
                                            key={field.id}
                                            index={index}
                                            title="Seed Money Project"
                                            onRemove={() => seedMoneyFields.remove(index)}
                                            disabled={!editable}
                                        >
                                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                <TextField form={form} name={`facultyContribution.seedMoneyProjects.${index}.schemeOrProjectTitle`} label="Scheme or project title" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.seedMoneyProjects.${index}.principalInvestigatorName`} label="Principal investigator" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.seedMoneyProjects.${index}.coInvestigator`} label="Co-investigator" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.seedMoneyProjects.${index}.fundingAgencyName`} label="Funding agency" disabled={!editable} />
                                                <SelectField
                                                    form={form}
                                                    name={`facultyContribution.seedMoneyProjects.${index}.fundingAgencyType`}
                                                    label="Funding agency type"
                                                    options={fundingAgencyOptions}
                                                    disabled={!editable}
                                                />
                                                <TextField
                                                    form={form}
                                                    name={`facultyContribution.seedMoneyProjects.${index}.awardYear`}
                                                    label="Award year"
                                                    type="number"
                                                    disabled={!editable}
                                                    registerOptions={{ valueAsNumber: true }}
                                                />
                                                <TextField form={form} name={`facultyContribution.seedMoneyProjects.${index}.projectDuration`} label="Project duration" disabled={!editable} />
                                                <TextField
                                                    form={form}
                                                    name={`facultyContribution.seedMoneyProjects.${index}.fundsInInr`}
                                                    label="Funds (INR)"
                                                    type="number"
                                                    disabled={!editable}
                                                    registerOptions={{ valueAsNumber: true }}
                                                />
                                                <SelectField
                                                    form={form}
                                                    name={`facultyContribution.seedMoneyProjects.${index}.projectCategory`}
                                                    label="Project category"
                                                    options={projectCategoryOptions}
                                                    placeholder="Select category"
                                                    disabled={!editable}
                                                />
                                                <TextField form={form} name={`facultyContribution.seedMoneyProjects.${index}.status`} label="Project status" disabled={!editable} />
                                                <TextField form={form} name={`facultyContribution.seedMoneyProjects.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                <ProofUploadField form={form} name={`facultyContribution.seedMoneyProjects.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                            </div>
                                        </EntryCard>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    title="No seed money projects added"
                                    description="Add institution-supported projects to strengthen the AQAR funding and innovation section."
                                    actionLabel="Add First Project"
                                    onAction={() =>
                                        seedMoneyFields.append({
                                            schemeOrProjectTitle: "",
                                            principalInvestigatorName: "",
                                            coInvestigator: "",
                                            fundingAgencyName: "",
                                            fundingAgencyType: "Government",
                                            awardYear: new Date().getFullYear(),
                                            projectDuration: "",
                                            fundsInInr: 0,
                                            projectCategory: "Minor",
                                            status: "",
                                            year: "",
                                            proof: "",
                                        })
                                    }
                                    disabled={!editable}
                                />
                            )}

                            {seedMoneyFields.fields.length ? (
                                <SectionAction
                                    onClick={() =>
                                        seedMoneyFields.append({
                                            schemeOrProjectTitle: "",
                                            principalInvestigatorName: "",
                                            coInvestigator: "",
                                            fundingAgencyName: "",
                                            fundingAgencyType: "Government",
                                            awardYear: new Date().getFullYear(),
                                            projectDuration: "",
                                            fundsInInr: 0,
                                            projectCategory: "Minor",
                                            status: "",
                                            year: "",
                                            proof: "",
                                        })
                                    }
                                    disabled={!editable}
                                >
                                    Add Seed Money Project
                                </SectionAction>
                            ) : null}
                        </SectionCard>
                    ) : null}

                    {currentStep === 3 ? (
                        <div className="grid gap-6">
                            <SectionCard
                                title="Awards and Recognition"
                                description="Capture teacher awards, recognition, and incentive details."
                            >
                                {awardFields.fields.length ? (
                                    <div className="grid gap-4">
                                        {awardFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="Award or Recognition"
                                                onRemove={() => awardFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.awardsRecognition.${index}.teacherName`} label="Teacher name" disabled={!editable} />
                                                    <DatePickerField form={form} name={`facultyContribution.awardsRecognition.${index}.awardDate`} label="Award date" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.awardsRecognition.${index}.pan`} label="PAN" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.awardsRecognition.${index}.designation`} label="Designation" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.awardsRecognition.${index}.awardName`} label="Award name" disabled={!editable} />
                                                    <SelectField
                                                        form={form}
                                                        name={`facultyContribution.awardsRecognition.${index}.level`}
                                                        label="Level"
                                                        options={awardLevelOptions}
                                                        disabled={!editable}
                                                    />
                                                    <TextField form={form} name={`facultyContribution.awardsRecognition.${index}.awardAgencyName`} label="Award agency" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.awardsRecognition.${index}.incentiveDetails`} label="Incentive details" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.awardsRecognition.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.awardsRecognition.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="No awards added"
                                        description="Add teacher awards and recognition to strengthen the quality profile for the year."
                                        actionLabel="Add First Award"
                                        onAction={() =>
                                            awardFields.append({
                                                teacherName: "",
                                                awardDate: "",
                                                pan: "",
                                                designation: "",
                                                awardName: "",
                                                level: "National",
                                                awardAgencyName: "",
                                                incentiveDetails: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    />
                                )}

                                {awardFields.fields.length ? (
                                    <SectionAction
                                        onClick={() =>
                                            awardFields.append({
                                                teacherName: "",
                                                awardDate: "",
                                                pan: "",
                                                designation: "",
                                                awardName: "",
                                                level: "National",
                                                awardAgencyName: "",
                                                incentiveDetails: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        Add Award or Recognition
                                    </SectionAction>
                                ) : null}
                            </SectionCard>

                            <SectionCard
                                title="Fellowships and Research Fellows"
                                description="Track faculty fellowships and research fellows enrolled or supported during the reporting year."
                            >
                                <div className="grid gap-6">
                                    <div className="grid gap-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-semibold text-zinc-950">Faculty Fellowships</h3>
                                                <p className="text-sm text-zinc-500">Awards or fellowships received by faculty members.</p>
                                            </div>
                                        </div>
                                        {fellowshipFields.fields.length ? (
                                            fellowshipFields.fields.map((field, index) => (
                                                <EntryCard
                                                    key={field.id}
                                                    index={index}
                                                    title="Fellowship"
                                                    onRemove={() => fellowshipFields.remove(index)}
                                                    disabled={!editable}
                                                >
                                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                        <TextField form={form} name={`facultyContribution.fellowships.${index}.teacherName`} label="Teacher name" disabled={!editable} />
                                                        <TextField form={form} name={`facultyContribution.fellowships.${index}.fellowshipName`} label="Fellowship name" disabled={!editable} />
                                                        <TextField form={form} name={`facultyContribution.fellowships.${index}.awardingAgency`} label="Awarding agency" disabled={!editable} />
                                                        <TextField
                                                            form={form}
                                                            name={`facultyContribution.fellowships.${index}.awardYear`}
                                                            label="Award year"
                                                            type="number"
                                                            disabled={!editable}
                                                            registerOptions={{ valueAsNumber: true }}
                                                        />
                                                        <SelectField
                                                            form={form}
                                                            name={`facultyContribution.fellowships.${index}.level`}
                                                            label="Level"
                                                            options={levelOptions}
                                                            disabled={!editable}
                                                        />
                                                        <TextField form={form} name={`facultyContribution.fellowships.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                        <ProofUploadField form={form} name={`facultyContribution.fellowships.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                    </div>
                                                </EntryCard>
                                            ))
                                        ) : (
                                            <EmptyState
                                                title="No fellowships added"
                                                description="Add fellowships received by faculty members during this reporting cycle."
                                                actionLabel="Add First Fellowship"
                                                onAction={() =>
                                                    fellowshipFields.append({
                                                        teacherName: "",
                                                        fellowshipName: "",
                                                        awardingAgency: "",
                                                        awardYear: new Date().getFullYear(),
                                                        level: "National",
                                                        year: "",
                                                        proof: "",
                                                    })
                                                }
                                                disabled={!editable}
                                            />
                                        )}
                                        {fellowshipFields.fields.length ? (
                                            <SectionAction
                                                onClick={() =>
                                                    fellowshipFields.append({
                                                        teacherName: "",
                                                        fellowshipName: "",
                                                        awardingAgency: "",
                                                        awardYear: new Date().getFullYear(),
                                                        level: "National",
                                                        year: "",
                                                        proof: "",
                                                    })
                                                }
                                                disabled={!editable}
                                            >
                                                Add Fellowship
                                            </SectionAction>
                                        ) : null}
                                    </div>

                                    <Separator />

                                    <div className="grid gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-zinc-950">Research Fellows</h3>
                                            <p className="text-sm text-zinc-500">Research scholars or fellows enrolled with faculty supervision or support.</p>
                                        </div>
                                        {fellowFields.fields.length ? (
                                            fellowFields.fields.map((field, index) => (
                                                <EntryCard
                                                    key={field.id}
                                                    index={index}
                                                    title="Research Fellow"
                                                    onRemove={() => fellowFields.remove(index)}
                                                    disabled={!editable}
                                                >
                                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                        <TextField form={form} name={`facultyContribution.researchFellows.${index}.fellowName`} label="Research fellow name" disabled={!editable} />
                                                        <DatePickerField form={form} name={`facultyContribution.researchFellows.${index}.enrolmentDate`} label="Enrolment date" disabled={!editable} />
                                                        <TextField form={form} name={`facultyContribution.researchFellows.${index}.fellowshipDuration`} label="Fellowship duration" disabled={!editable} />
                                                        <TextField form={form} name={`facultyContribution.researchFellows.${index}.fellowshipType`} label="Fellowship type" disabled={!editable} />
                                                        <TextField form={form} name={`facultyContribution.researchFellows.${index}.grantingAgency`} label="Granting agency" disabled={!editable} />
                                                        <TextField form={form} name={`facultyContribution.researchFellows.${index}.qualifyingExam`} label="Qualifying exam" disabled={!editable} />
                                                        <TextField form={form} name={`facultyContribution.researchFellows.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                        <ProofUploadField form={form} name={`facultyContribution.researchFellows.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                    </div>
                                                </EntryCard>
                                            ))
                                        ) : (
                                            <EmptyState
                                                title="No research fellows added"
                                                description="Add research fellows to represent doctoral or fellowship-linked supervision activity."
                                                actionLabel="Add First Research Fellow"
                                                onAction={() =>
                                                    fellowFields.append({
                                                        fellowName: "",
                                                        enrolmentDate: "",
                                                        fellowshipDuration: "",
                                                        fellowshipType: "",
                                                        grantingAgency: "",
                                                        qualifyingExam: "",
                                                        year: "",
                                                        proof: "",
                                                    })
                                                }
                                                disabled={!editable}
                                            />
                                        )}
                                        {fellowFields.fields.length ? (
                                            <SectionAction
                                                onClick={() =>
                                                    fellowFields.append({
                                                        fellowName: "",
                                                        enrolmentDate: "",
                                                        fellowshipDuration: "",
                                                        fellowshipType: "",
                                                        grantingAgency: "",
                                                        qualifyingExam: "",
                                                        year: "",
                                                        proof: "",
                                                    })
                                                }
                                                disabled={!editable}
                                            >
                                                Add Research Fellow
                                            </SectionAction>
                                        ) : null}
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    ) : null}

                    {currentStep === 4 ? (
                        <div className="grid gap-6">
                            <SectionCard
                                title="Patents"
                                description="Capture patents, publication status, level, and evidence references."
                            >
                                {patentFields.fields.length ? (
                                    <div className="grid gap-4">
                                        {patentFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="Patent"
                                                onRemove={() => patentFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.patents.${index}.type`} label="Type" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.patents.${index}.patenterName`} label="Patenter name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.patents.${index}.patentNumber`} label="Patent number" disabled={!editable} />
                                                    <DatePickerField form={form} name={`facultyContribution.patents.${index}.filingDate`} label="Filing date" disabled={!editable} />
                                                    <DatePickerField form={form} name={`facultyContribution.patents.${index}.publishedDate`} label="Published date" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.patents.${index}.title`} label="Title" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.patents.${index}.status`} label="Patent status" disabled={!editable} />
                                                    <SelectField
                                                        form={form}
                                                        name={`facultyContribution.patents.${index}.level`}
                                                        label="Level"
                                                        options={levelOptions}
                                                        disabled={!editable}
                                                    />
                                                    <TextField
                                                        form={form}
                                                        name={`facultyContribution.patents.${index}.awardYear`}
                                                        label="Award year"
                                                        type="number"
                                                        disabled={!editable}
                                                        registerOptions={{ valueAsNumber: true }}
                                                    />
                                                    <TextField form={form} name={`facultyContribution.patents.${index}.academicYear`} label="Academic year label" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.patents.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="No patents added"
                                        description="Add patents to represent IP output and innovation activity in the AQAR cycle."
                                        actionLabel="Add First Patent"
                                        onAction={() =>
                                            patentFields.append({
                                                type: "Patent",
                                                patenterName: "",
                                                patentNumber: "",
                                                filingDate: "",
                                                publishedDate: "",
                                                title: "",
                                                status: "",
                                                level: "National",
                                                awardYear: new Date().getFullYear(),
                                                academicYear: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    />
                                )}

                                {patentFields.fields.length ? (
                                    <SectionAction
                                        onClick={() =>
                                            patentFields.append({
                                                type: "Patent",
                                                patenterName: "",
                                                patentNumber: "",
                                                filingDate: "",
                                                publishedDate: "",
                                                title: "",
                                                status: "",
                                                level: "National",
                                                awardYear: new Date().getFullYear(),
                                                academicYear: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        Add Patent
                                    </SectionAction>
                                ) : null}
                            </SectionCard>

                            <SectionCard
                                title="PhD Awards"
                                description="Record doctoral registration, thesis supervision, and award status for the reporting year."
                            >
                                {phdAwardFields.fields.length ? (
                                    <div className="grid gap-4">
                                        {phdAwardFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="PhD Award"
                                                onRemove={() => phdAwardFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.scholarName`} label="Scholar name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.departmentName`} label="Department name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.guideName`} label="Guide name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.thesisTitle`} label="Thesis title" disabled={!editable} />
                                                    <DatePickerField form={form} name={`facultyContribution.phdAwards.${index}.registrationDate`} label="Registration date" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.gender`} label="Gender" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.category`} label="Category" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.degree`} label="Degree" disabled={!editable} />
                                                    <SelectField
                                                        form={form}
                                                        name={`facultyContribution.phdAwards.${index}.awardStatus`}
                                                        label="Award status"
                                                        options={phdStatusOptions}
                                                        disabled={!editable}
                                                    />
                                                    <TextField
                                                        form={form}
                                                        name={`facultyContribution.phdAwards.${index}.scholarRegistrationYear`}
                                                        label="Registration year"
                                                        type="number"
                                                        disabled={!editable}
                                                        registerOptions={{ valueAsNumber: true }}
                                                    />
                                                    <TextField
                                                        form={form}
                                                        name={`facultyContribution.phdAwards.${index}.awardYear`}
                                                        label="Award year"
                                                        type="number"
                                                        disabled={!editable}
                                                        registerOptions={{ valueAsNumber: true }}
                                                    />
                                                    <TextField form={form} name={`facultyContribution.phdAwards.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.phdAwards.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="No PhD awards added"
                                        description="Add PhD completion and supervision records to represent doctoral outcome quality indicators."
                                        actionLabel="Add First PhD Award"
                                        onAction={() =>
                                            phdAwardFields.append({
                                                scholarName: "",
                                                departmentName: "",
                                                guideName: "",
                                                thesisTitle: "",
                                                registrationDate: "",
                                                gender: "",
                                                category: "",
                                                degree: "",
                                                awardStatus: "Awarded",
                                                scholarRegistrationYear: new Date().getFullYear(),
                                                awardYear: new Date().getFullYear(),
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    />
                                )}

                                {phdAwardFields.fields.length ? (
                                    <SectionAction
                                        onClick={() =>
                                            phdAwardFields.append({
                                                scholarName: "",
                                                departmentName: "",
                                                guideName: "",
                                                thesisTitle: "",
                                                registrationDate: "",
                                                gender: "",
                                                category: "",
                                                degree: "",
                                                awardStatus: "Awarded",
                                                scholarRegistrationYear: new Date().getFullYear(),
                                                awardYear: new Date().getFullYear(),
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        Add PhD Award
                                    </SectionAction>
                                ) : null}
                            </SectionCard>
                        </div>
                    ) : null}

                    {currentStep === 5 ? (
                        <div className="grid gap-6">
                            <SectionCard
                                title="Books, Chapters, and Proceedings"
                                description="Record books, chapters, translated works, and conference proceedings."
                            >
                                {bookChapterFields.fields.length ? (
                                    <div className="grid gap-4">
                                        {bookChapterFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="Book or Chapter"
                                                onRemove={() => bookChapterFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.type`} label="Type" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.titleOfWork`} label="Title of work" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.titleOfChapter`} label="Title of chapter" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.paperTitle`} label="Paper title" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.translationWork`} label="Translation work" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.proceedingsTitle`} label="Proceedings title" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.conferenceName`} label="Conference name" disabled={!editable} />
                                                    <SelectField
                                                        form={form}
                                                        name={`facultyContribution.booksChapters.${index}.level`}
                                                        label="Level"
                                                        options={levelOptions}
                                                        placeholder="Select level"
                                                        disabled={!editable}
                                                    />
                                                    <TextField
                                                        form={form}
                                                        name={`facultyContribution.booksChapters.${index}.publicationYear`}
                                                        label="Publication year"
                                                        type="number"
                                                        disabled={!editable}
                                                        registerOptions={{ valueAsNumber: true }}
                                                    />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.isbnIssnNumber`} label="ISBN / ISSN" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.affiliationInstitute`} label="Affiliation institute" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.publisherName`} label="Publisher name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.booksChapters.${index}.academicYear`} label="Academic year label" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.booksChapters.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="No books or chapters added"
                                        description="Add published books, chapters, or proceedings to complete the academic output section."
                                        actionLabel="Add First Book or Chapter"
                                        onAction={() =>
                                            bookChapterFields.append({
                                                type: "Book",
                                                titleOfWork: "",
                                                titleOfChapter: "",
                                                paperTitle: "",
                                                translationWork: "",
                                                proceedingsTitle: "",
                                                conferenceName: "",
                                                level: "National",
                                                publicationYear: new Date().getFullYear(),
                                                isbnIssnNumber: "",
                                                affiliationInstitute: "",
                                                publisherName: "",
                                                academicYear: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    />
                                )}

                                {bookChapterFields.fields.length ? (
                                    <SectionAction
                                        onClick={() =>
                                            bookChapterFields.append({
                                                type: "Book",
                                                titleOfWork: "",
                                                titleOfChapter: "",
                                                paperTitle: "",
                                                translationWork: "",
                                                proceedingsTitle: "",
                                                conferenceName: "",
                                                level: "National",
                                                publicationYear: new Date().getFullYear(),
                                                isbnIssnNumber: "",
                                                affiliationInstitute: "",
                                                publisherName: "",
                                                academicYear: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        Add Book or Chapter
                                    </SectionAction>
                                ) : null}
                            </SectionCard>

                            <SectionCard
                                title="E-Content, Consultancy, Support, and FDP"
                                description="Complete the practice-oriented and outreach-oriented AQAR sections."
                            >
                                <div className="grid gap-6">
                                    <GroupedEntries
                                        title="E-Content Developed"
                                        description="Digital content, modules, or courses developed by faculty."
                                        hasItems={eContentFields.fields.length > 0}
                                        emptyTitle="No e-content entries added"
                                        emptyDescription="Add course content or digital resources developed during the AQAR year."
                                        emptyActionLabel="Add First E-Content Record"
                                        onEmptyAction={() =>
                                            eContentFields.append({
                                                moduleName: "",
                                                creationType: "",
                                                platform: "",
                                                academicYear: "",
                                                linkToContent: "",
                                                proof: "",
                                            })
                                        }
                                        onAdd={() =>
                                            eContentFields.append({
                                                moduleName: "",
                                                creationType: "",
                                                platform: "",
                                                academicYear: "",
                                                linkToContent: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        {eContentFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="E-Content Record"
                                                onRemove={() => eContentFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.eContentDeveloped.${index}.moduleName`} label="Module or course name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.eContentDeveloped.${index}.creationType`} label="Creation type" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.eContentDeveloped.${index}.platform`} label="Platform" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.eContentDeveloped.${index}.academicYear`} label="Academic year label" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.eContentDeveloped.${index}.linkToContent`} label="Link to content" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.eContentDeveloped.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </GroupedEntries>

                                    <Separator />

                                    <GroupedEntries
                                        title="Consultancy Services"
                                        description="Consultancy activity and revenue generated by faculty."
                                        hasItems={consultancyFields.fields.length > 0}
                                        emptyTitle="No consultancy services added"
                                        emptyDescription="Add consultancy services to represent external engagement and revenue generation."
                                        emptyActionLabel="Add First Consultancy Record"
                                        onEmptyAction={() =>
                                            consultancyFields.append({
                                                consultantName: "",
                                                consultancyProjectName: "",
                                                sponsoringAgencyContact: "",
                                                consultancyYear: new Date().getFullYear(),
                                                revenueGeneratedInInr: 0,
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        onAdd={() =>
                                            consultancyFields.append({
                                                consultantName: "",
                                                consultancyProjectName: "",
                                                sponsoringAgencyContact: "",
                                                consultancyYear: new Date().getFullYear(),
                                                revenueGeneratedInInr: 0,
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        {consultancyFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="Consultancy Service"
                                                onRemove={() => consultancyFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.consultancyServices.${index}.consultantName`} label="Consultant name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.consultancyServices.${index}.consultancyProjectName`} label="Consultancy project name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.consultancyServices.${index}.sponsoringAgencyContact`} label="Sponsoring agency contact" disabled={!editable} />
                                                    <TextField
                                                        form={form}
                                                        name={`facultyContribution.consultancyServices.${index}.consultancyYear`}
                                                        label="Consultancy year"
                                                        type="number"
                                                        disabled={!editable}
                                                        registerOptions={{ valueAsNumber: true }}
                                                    />
                                                    <TextField
                                                        form={form}
                                                        name={`facultyContribution.consultancyServices.${index}.revenueGeneratedInInr`}
                                                        label="Revenue generated (INR)"
                                                        type="number"
                                                        disabled={!editable}
                                                        registerOptions={{ valueAsNumber: true }}
                                                    />
                                                    <TextField form={form} name={`facultyContribution.consultancyServices.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.consultancyServices.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </GroupedEntries>

                                    <Separator />

                                    <GroupedEntries
                                        title="Financial Support for Conferences"
                                        description="Conference participation support and professional body-backed financial assistance."
                                        hasItems={financialSupportFields.fields.length > 0}
                                        emptyTitle="No conference support added"
                                        emptyDescription="Add financial support records to complete the AQAR support and participation section."
                                        emptyActionLabel="Add First Support Record"
                                        onEmptyAction={() =>
                                            financialSupportFields.append({
                                                conferenceName: "",
                                                professionalBodyName: "",
                                                amountOfSupport: 0,
                                                panNo: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        onAdd={() =>
                                            financialSupportFields.append({
                                                conferenceName: "",
                                                professionalBodyName: "",
                                                amountOfSupport: 0,
                                                panNo: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        {financialSupportFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="Conference Support"
                                                onRemove={() => financialSupportFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.financialSupport.${index}.conferenceName`} label="Conference name" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.financialSupport.${index}.professionalBodyName`} label="Professional body" disabled={!editable} />
                                                    <TextField
                                                        form={form}
                                                        name={`facultyContribution.financialSupport.${index}.amountOfSupport`}
                                                        label="Amount of support"
                                                        type="number"
                                                        disabled={!editable}
                                                        registerOptions={{ valueAsNumber: true }}
                                                    />
                                                    <TextField form={form} name={`facultyContribution.financialSupport.${index}.panNo`} label="PAN number" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.financialSupport.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.financialSupport.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </GroupedEntries>

                                    <Separator />

                                    <GroupedEntries
                                        title="Faculty Development Programmes"
                                        description="Faculty training, orientation, refresher, or development programmes."
                                        hasItems={fdpFields.fields.length > 0}
                                        emptyTitle="No FDP records added"
                                        emptyDescription="Add faculty development programmes to complete training and capacity-building evidence."
                                        emptyActionLabel="Add First FDP Record"
                                        onEmptyAction={() =>
                                            fdpFields.append({
                                                programTitle: "",
                                                organizedBy: "",
                                                durationFrom: "",
                                                durationTo: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        onAdd={() =>
                                            fdpFields.append({
                                                programTitle: "",
                                                organizedBy: "",
                                                durationFrom: "",
                                                durationTo: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                        disabled={!editable}
                                    >
                                        {fdpFields.fields.map((field, index) => (
                                            <EntryCard
                                                key={field.id}
                                                index={index}
                                                title="FDP Record"
                                                onRemove={() => fdpFields.remove(index)}
                                                disabled={!editable}
                                            >
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <TextField form={form} name={`facultyContribution.facultyDevelopmentProgrammes.${index}.programTitle`} label="Programme title" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.facultyDevelopmentProgrammes.${index}.organizedBy`} label="Organized by" disabled={!editable} />
                                                    <DatePickerField form={form} name={`facultyContribution.facultyDevelopmentProgrammes.${index}.durationFrom`} label="Duration from" disabled={!editable} />
                                                    <DatePickerField form={form} name={`facultyContribution.facultyDevelopmentProgrammes.${index}.durationTo`} label="Duration to" disabled={!editable} />
                                                    <TextField form={form} name={`facultyContribution.facultyDevelopmentProgrammes.${index}.year`} label="AQAR year label" disabled={!editable} />
                                                    <ProofUploadField form={form} name={`facultyContribution.facultyDevelopmentProgrammes.${index}.proof`} label="Proof document" facultyId={facultyId} disabled={!editable} />
                                                </div>
                                            </EntryCard>
                                        ))}
                                    </GroupedEntries>
                                </div>
                            </SectionCard>
                        </div>
                    ) : null}

                    {currentStep === 6 ? (
                        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                            <SectionCard
                                title="AQAR Review Summary"
                                description="Review section counts, confirm missing areas, and prepare the final submission."
                            >
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <MetricCard label="Research papers" value={String(liveMetrics.researchPaperCount)} />
                                    <MetricCard label="Projects" value={String(liveMetrics.seedMoneyProjectCount)} />
                                    <MetricCard label="Awards and fellows" value={String(liveMetrics.awardRecognitionCount + liveMetrics.fellowshipCount + liveMetrics.researchFellowCount)} />
                                    <MetricCard label="Patents and PhD" value={String(liveMetrics.patentCount + liveMetrics.phdAwardCount)} />
                                    <MetricCard label="Books and e-content" value={String(liveMetrics.bookChapterCount + liveMetrics.eContentCount)} />
                                    <MetricCard label="Consultancy and FDP" value={String(liveMetrics.consultancyCount + liveMetrics.fdpCount)} />
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Contribution index</p>
                                    <p className="mt-2 text-3xl font-semibold text-zinc-950">{liveMetrics.totalContributionIndex}</p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Academic year {normalizedValues.academicYear} with reporting period from {formatDateLabel(normalizedValues.reportingPeriod.fromDate)} to {formatDateLabel(normalizedValues.reportingPeriod.toDate)}.
                                    </p>
                                </div>
                            </SectionCard>

                            <SectionCard
                                title="Readiness Checks"
                                description="Finish the review checklist before submitting this AQAR application."
                            >
                                <div className="space-y-4">
                                    {summarySections.map((section) => (
                                        <div key={section.label} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-zinc-950">{section.label}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {section.count ? `${section.count} records ready` : "No records added yet"}
                                                </p>
                                            </div>
                                            <Badge className={section.count ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                                                {section.count ? "Ready" : "Attention"}
                                            </Badge>
                                        </div>
                                    ))}

                                    {reviewWarnings.length ? (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                            <p className="font-semibold">Incomplete sections detected</p>
                                            <ul className="mt-2 list-disc pl-5">
                                                {reviewWarnings.map((warning) => (
                                                    <li key={warning.label}>{warning.label} has no records yet.</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                            All major AQAR sections contain at least one record.
                                        </div>
                                    )}

                                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                                        <p className="text-sm font-semibold text-zinc-950">Submission checklist</p>
                                        <div className="mt-4 space-y-4">
                                            {reviewChecklistItems.map((item, index) => (
                                                <label key={item} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                                    <Checkbox
                                                        checked={reviewChecks[index]}
                                                        onCheckedChange={(checked) =>
                                                            setReviewChecks((current) =>
                                                                current.map((value, currentIndex) =>
                                                                    currentIndex === index ? Boolean(checked) : value
                                                                )
                                                            )
                                                        }
                                                        disabled={!editable || isPending}
                                                    />
                                                    <span className="text-sm text-zinc-700">{item}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        {selectedId ? (
                                            <Button asChild type="button" variant="outline">
                                                <a href={`/api/aqar/${selectedId}/report`}>Download AQAR PDF</a>
                                            </Button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            onClick={submitApplication}
                                            disabled={isPending || !selectedId || !reviewReady}
                                        >
                                            {isPending ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                                            Submit AQAR Application
                                        </Button>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}

function AQARDataTables({
    values,
}: {
    values: AqarResolvedValues;
}) {
    const sections = [
        {
            title: "Research Papers",
            columns: ["Title", "Journal", "Year", "Proof"],
            rows: values.facultyContribution.researchPapers.map((item) => [
                item.paperTitle,
                item.journalName,
                String(item.publicationYear),
                item.proof ? "Linked" : "-",
            ]),
        },
        {
            title: "Seed Money Projects",
            columns: ["Project", "Funding Agency", "Award Year", "Funds"],
            rows: values.facultyContribution.seedMoneyProjects.map((item) => [
                item.schemeOrProjectTitle,
                item.fundingAgencyName,
                String(item.awardYear),
                String(item.fundsInInr ?? 0),
            ]),
        },
        {
            title: "Awards and Recognition",
            columns: ["Award", "Level", "Agency", "Proof"],
            rows: values.facultyContribution.awardsRecognition.map((item) => [
                item.awardName,
                item.level,
                item.awardAgencyName,
                item.proof ? "Linked" : "-",
            ]),
        },
        {
            title: "Patents",
            columns: ["Title", "Status", "Level", "Proof"],
            rows: values.facultyContribution.patents.map((item) => [
                item.title,
                item.status,
                item.level,
                item.proof ? "Linked" : "-",
            ]),
        },
        {
            title: "Books and Chapters",
            columns: ["Title", "Type", "Academic Year", "Proof"],
            rows: values.facultyContribution.booksChapters.map((item) => [
                item.titleOfWork,
                item.type,
                item.academicYear ?? "-",
                item.proof ? "Linked" : "-",
            ]),
        },
        {
            title: "E-Content, Consultancy, Support, and FDP",
            columns: ["Section", "Title", "Year", "Proof"],
            rows: [
                ...values.facultyContribution.eContentDeveloped.map((item) => [
                    "E-content",
                    item.moduleName,
                    item.academicYear ?? "-",
                    item.proof ? "Linked" : "-",
                ]),
                ...values.facultyContribution.consultancyServices.map((item) => [
                    "Consultancy",
                    item.consultancyProjectName,
                    item.year ?? "-",
                    item.proof ? "Linked" : "-",
                ]),
                ...values.facultyContribution.financialSupport.map((item) => [
                    "Conference Support",
                    item.conferenceName,
                    item.year ?? "-",
                    item.proof ? "Linked" : "-",
                ]),
                ...values.facultyContribution.facultyDevelopmentProgrammes.map((item) => [
                    "FDP",
                    item.programTitle,
                    item.year ?? "-",
                    item.proof ? "Linked" : "-",
                ]),
            ],
        },
    ].filter((section) => section.rows.length > 0);

    if (!sections.length) {
        return (
            <Card className="rounded-[1.5rem] border-zinc-200 shadow-none">
                <CardHeader>
                    <CardTitle className="text-xl">Current AQAR data tables</CardTitle>
                    <CardDescription>
                        Selected-year faculty data will appear here in table form after autofill or manual entry.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                        No AQAR rows are loaded yet for the current academic year.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-[1.5rem] border-zinc-200 shadow-none">
            <CardHeader>
                <CardTitle className="text-xl">Current AQAR data tables</CardTitle>
                <CardDescription>
                    Review the selected-year data in tables before editing section details below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {sections.map((section) => (
                    <details key={section.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4" open>
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
                            {section.title} ({section.rows.length})
                        </summary>
                        <div className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {section.columns.map((column) => (
                                            <TableHead key={column}>{column}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {section.rows.map((row, index) => (
                                        <TableRow key={`${section.title}-${index}`}>
                                            {row.map((cell, cellIndex) => (
                                                <TableCell key={`${section.title}-${index}-${cellIndex}`}>
                                                    {cell}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </details>
                ))}
            </CardContent>
        </Card>
    );
}

function AQARProgressStepper({
    currentStep,
    visitedSteps,
    errors,
    onStepChange,
}: {
    currentStep: number;
    visitedSteps: number[];
    errors: FieldErrors<AqarFormValues>;
    onStepChange: (step: number) => void;
}) {
    return (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {steps.map((step, index) => {
                const visited = visitedSteps.includes(index);
                const hasErrors = visited && hasErrorsForPaths(errors, step.fields);
                const active = index === currentStep;
                const completed = visited && index < currentStep && !hasErrors;
                const Icon = step.icon;

                return (
                    <button
                        type="button"
                        key={step.id}
                        onClick={() => onStepChange(index)}
                        className={cn(
                            "min-w-[210px] rounded-2xl border p-4 text-left transition-colors",
                            active
                                ? "border-zinc-900 bg-zinc-900 text-zinc-50"
                                : completed
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                  : hasErrors
                                    ? "border-red-200 bg-red-50 text-red-900"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"
                        )}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                                        active
                                            ? "bg-white/15 text-white"
                                            : completed
                                              ? "bg-emerald-100 text-emerald-700"
                                              : hasErrors
                                                ? "bg-red-100 text-red-700"
                                                : "bg-white text-zinc-700"
                                    )}
                                >
                                    {index + 1}
                                </span>
                                <Icon className="h-4 w-4" />
                            </div>
                            <Badge
                                className={cn(
                                    active
                                        ? "bg-white/15 text-white"
                                        : completed
                                          ? "bg-emerald-100 text-emerald-700"
                                          : hasErrors
                                            ? "bg-red-100 text-red-700"
                                            : "bg-white text-zinc-700"
                                )}
                            >
                                {active ? "Current" : completed ? "Done" : hasErrors ? "Fix" : "Open"}
                            </Badge>
                        </div>
                        <p className="mt-4 font-semibold">{step.title}</p>
                        <p className={cn("mt-1 text-sm", active ? "text-zinc-200" : "text-current/75")}>
                            {step.description}
                        </p>
                    </button>
                );
            })}
        </div>
    );
}

function AQARStatusTimeline({ logs }: { logs: AqarApp["statusLogs"] }) {
    const sortedLogs = [...logs].sort(
        (left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime()
    );

    if (!sortedLogs.length) {
        return (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                No AQAR workflow transitions recorded yet.
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {sortedLogs.map((log) => (
                <div key={log._id ?? `${log.status}-${log.changedAt}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-zinc-950">{log.status}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            {formatTimestamp(log.changedAt)}
                        </p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                        {log.actorName ? `${log.actorName} (${log.actorRole ?? "User"})` : "System"}
                    </p>
                    {log.remarks ? <p className="mt-2 text-sm text-zinc-500">{log.remarks}</p> : null}
                </div>
            ))}
        </div>
    );
}

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <Card className="rounded-[1.5rem] border-zinc-200 shadow-none">
            <CardHeader>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">{children}</CardContent>
        </Card>
    );
}

function EntryCard({
    title,
    index,
    onRemove,
    children,
    disabled,
}: {
    title: string;
    index: number;
    onRemove: () => void;
    children: ReactNode;
    disabled?: boolean;
}) {
    return (
        <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Entry {index + 1}</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-950">{title}</p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={onRemove}
                    disabled={disabled}
                    aria-label={`Delete ${title} entry ${index + 1}`}
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
            {children}
        </div>
    );
}

function GroupedEntries({
    title,
    description,
    hasItems,
    emptyTitle,
    emptyDescription,
    emptyActionLabel,
    onEmptyAction,
    onAdd,
    disabled,
    children,
}: {
    title: string;
    description: string;
    hasItems: boolean;
    emptyTitle: string;
    emptyDescription: string;
    emptyActionLabel: string;
    onEmptyAction: () => void;
    onAdd: () => void;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-4">
            <div>
                <h3 className="text-lg font-semibold text-zinc-950">{title}</h3>
                <p className="text-sm text-zinc-500">{description}</p>
            </div>
            {hasItems ? children : (
                <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                    disabled={disabled}
                />
            )}
            {hasItems ? (
                <SectionAction onClick={onAdd} disabled={disabled}>
                    {emptyActionLabel.replace("First ", "")}
                </SectionAction>
            ) : null}
        </div>
    );
}

function SectionAction({
    children,
    onClick,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <Button type="button" variant="outline" onClick={onClick} disabled={disabled}>
            <Plus className="h-4 w-4" />
            {children}
        </Button>
    );
}

function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    disabled,
}: {
    title: string;
    description: string;
    actionLabel: string;
    onAction?: () => void;
    disabled?: boolean;
}) {
    return (
        <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-6">
            <div className="max-w-xl space-y-2">
                <p className="text-lg font-semibold text-zinc-950">{title}</p>
                <p className="text-sm text-zinc-500">{description}</p>
            </div>
            {onAction ? (
                <Button type="button" variant="outline" className="mt-4" onClick={onAction} disabled={disabled}>
                    <Plus className="h-4 w-4" />
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}

function FieldShell({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label className="text-sm font-medium text-zinc-950">{label}</Label>
            {children}
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function TextField({
    form,
    name,
    label,
    placeholder,
    type = "text",
    disabled,
    registerOptions,
}: {
    form: AqarFormApi;
    name: string;
    label: string;
    placeholder?: string;
    type?: React.ComponentProps<typeof Input>["type"];
    disabled?: boolean;
    registerOptions?: Record<string, unknown>;
}) {
    return (
        <FieldShell label={label} error={getErrorMessage(form.formState.errors, name)}>
            <Input
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                {...form.register(name as never, registerOptions)}
            />
        </FieldShell>
    );
}

function SelectField({
    form,
    name,
    label,
    options,
    placeholder = "Select an option",
    disabled,
    onValueChange,
}: {
    form: AqarFormApi;
    name: string;
    label: string;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
}) {
    return (
        <FieldShell label={label} error={getErrorMessage(form.formState.errors, name)}>
            <Controller
                control={form.control}
                name={name as never}
                render={({ field }) => (
                    <Select
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                            field.onChange(value);
                            onValueChange?.(value);
                        }}
                        disabled={disabled}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
        </FieldShell>
    );
}

function DatePickerField({
    form,
    name,
    label,
    disabled,
}: {
    form: AqarFormApi;
    name: string;
    label: string;
    disabled?: boolean;
}) {
    return (
        <FieldShell label={label} error={getErrorMessage(form.formState.errors, name)}>
            <Controller
                control={form.control}
                name={name as never}
                render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                    "h-10 justify-start px-3 text-left font-normal",
                                    !field.value && "text-zinc-400"
                                )}
                                disabled={disabled}
                            >
                                <CalendarClock className="mr-2 h-4 w-4" />
                                {formatDateLabel(field.value)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={parseDateValue(field.value)}
                                onSelect={(date) => field.onChange(toDateInputValue(date))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                )}
            />
        </FieldShell>
    );
}

function ProofUploadField({
    form,
    name,
    label,
    facultyId,
    disabled,
}: {
    form: AqarFormApi;
    name: string;
    label: string;
    facultyId: string;
    disabled?: boolean;
}) {
    const inputId = useId();
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <FieldShell label={label} error={getErrorMessage(form.formState.errors, name) ?? error ?? undefined}>
            <Controller
                control={form.control}
                name={name as never}
                render={({ field }) => (
                    <div className="grid gap-2.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Input
                                id={inputId}
                                type="file"
                                accept="application/pdf,image/*"
                                className="sr-only"
                                disabled={disabled}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) {
                                        return;
                                    }

                                    const handleUpload = async () => {
                                        setError(null);

                                        try {
                                            validateFile(file, "evidence");
                                        } catch (uploadError) {
                                            if (uploadError instanceof UploadValidationError) {
                                                setError(uploadError.message);
                                            }
                                            return;
                                        }

                                        setProgress({ percent: 0, bytesTransferred: 0, totalBytes: file.size });

                                        try {
                                            const result = await uploadFile(file, "evidence", facultyId, (next) => {
                                                setProgress(next);
                                            });

                                            const response = await fetch("/api/documents", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    fileName: file.name,
                                                    fileUrl: result.downloadURL,
                                                    fileType: file.type,
                                                }),
                                            });
                                            const data = (await response.json()) as {
                                                document?: { fileUrl?: string };
                                                message?: string;
                                            };

                                            if (!response.ok || !data.document?.fileUrl) {
                                                throw new Error(data.message ?? "Unable to save proof document.");
                                            }

                                            field.onChange(data.document.fileUrl);
                                            setProgress(null);
                                        } catch (uploadError) {
                                            setProgress(null);
                                            setError(
                                                uploadError instanceof Error
                                                    ? uploadError.message
                                                    : "Proof upload failed."
                                            );
                                        }
                                    };

                                    void handleUpload();
                                    event.target.value = "";
                                }}
                            />
                            <Label
                                htmlFor={inputId}
                                className={cn(
                                    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100",
                                    disabled && "cursor-not-allowed opacity-60"
                                )}
                            >
                                <Upload className="size-4" />
                                Upload proof
                            </Label>
                            {typeof field.value === "string" && field.value ? (
                                <Button asChild type="button" variant="ghost" className="h-10 px-3 text-sm text-sky-700 hover:text-sky-800">
                                    <a href={field.value} target="_blank" rel="noreferrer">
                                        Open linked proof
                                    </a>
                                </Button>
                            ) : null}
                        </div>
                        <p className="text-xs text-zinc-600">
                            {field.value ? "Proof linked for this row." : "No proof file linked yet."}
                            {progress ? ` Uploading ${progress.percent}%...` : ""}
                        </p>
                    </div>
                )}
            />
        </FieldShell>
    );
}

function DashboardStat({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
            <p className="mt-1 text-sm text-zinc-500">{detail}</p>
        </div>
    );
}

function SummaryTile({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-zinc-950">{value}</p>
        </div>
    );
}

function SummaryChip({
    label,
    value,
    inverse,
}: {
    label: string;
    value: string;
    inverse?: boolean;
}) {
    return (
        <div className={cn("rounded-xl border px-3 py-2", inverse ? "border-white/15 bg-white/10" : "border-zinc-200 bg-white")}>
            <p className={cn("text-[11px] uppercase tracking-[0.16em]", inverse ? "text-zinc-300" : "text-zinc-500")}>
                {label}
            </p>
            <p className={cn("mt-1 text-sm font-medium", inverse ? "text-zinc-50" : "text-zinc-950")}>{value}</p>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
