"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { pbasApplicationSchema } from "@/lib/pbas/validators";

type PbasFormValues = z.input<typeof pbasApplicationSchema>;
type PbasResolvedValues = z.output<typeof pbasApplicationSchema>;

type PbasApp = {
    _id: string;
    academicYear: string;
    currentDesignation: string;
    appraisalPeriod: {
        fromDate: string;
        toDate: string;
    };
    category1: {
        classesTaken: number;
        coursePreparationHours: number;
        coursesTaught: string[];
        mentoringCount: number;
        labSupervisionCount: number;
        feedbackSummary?: string;
    };
    category2: {
        researchPapers: Array<{ title: string; journal: string; year: number; issn?: string; indexing?: string }>;
        books: Array<{ title: string; publisher: string; isbn?: string; year: number }>;
        patents: Array<{ title: string; year: number; status: string }>;
        conferences: Array<{ title: string; organizer: string; year: number; type: string }>;
        projects: Array<{ title: string; fundingAgency: string; amount: number; year: number }>;
    };
    category3: {
        committees: Array<{ committeeName: string; role?: string; year?: number }>;
        administrativeDuties: Array<{ title: string; year?: number }>;
        examDuties: Array<{ duty: string; year?: number }>;
        studentGuidance: Array<{ activity: string; count: number }>;
        extensionActivities: Array<{ title: string; role?: string; year?: number }>;
    };
    apiScore: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
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
    updatedAt: string;
};

const steps = [
    "Basic Details",
    "Teaching Activities",
    "Research Papers",
    "Books, Patents, Conferences",
    "Institutional Responsibilities",
    "Review and Submit",
] as const;

const designationOptions = [
    "Assistant Professor (Stage 1)",
    "Assistant Professor (Stage 2)",
    "Assistant Professor (Stage 3)",
    "Assistant Professor (Stage 4)",
    "Associate Professor",
    "Professor",
] as const;

function emptyForm(): PbasFormValues {
    const year = new Date().getFullYear();
    const nextYear = year + 1;

    return {
        academicYear: `${year}-${nextYear}`,
        currentDesignation: "Assistant Professor (Stage 1)",
        appraisalPeriod: {
            fromDate: `${year}-06-01`,
            toDate: `${nextYear}-05-31`,
        },
        category1: {
            classesTaken: 0,
            coursePreparationHours: 0,
            coursesTaught: [],
            mentoringCount: 0,
            labSupervisionCount: 0,
            feedbackSummary: "",
        },
        category2: {
            researchPapers: [],
            books: [],
            patents: [],
            conferences: [],
            projects: [],
        },
        category3: {
            committees: [],
            administrativeDuties: [],
            examDuties: [],
            studentGuidance: [],
            extensionActivities: [],
        },
    };
}

function toFormValues(application?: PbasApp): PbasFormValues {
    if (!application) {
        return emptyForm();
    }

    return {
        academicYear: application.academicYear,
        currentDesignation: application.currentDesignation,
        appraisalPeriod: application.appraisalPeriod,
        category1: application.category1,
        category2: application.category2,
        category3: application.category3,
    };
}

function computeScore(values: PbasResolvedValues) {
    const teachingActivities = Math.min(
        100,
        values.category1.classesTaken * 2 +
            values.category1.coursePreparationHours * 0.4 +
            values.category1.coursesTaught.length * 4 +
            values.category1.mentoringCount * 3 +
            values.category1.labSupervisionCount * 3
    );

    const researchAcademicContribution = Math.min(
        120,
        values.category2.researchPapers.reduce((sum, paper) => {
            const indexing = (paper.indexing ?? "").toLowerCase();
            if (indexing.includes("scopus") || indexing.includes("ugc care") || indexing.includes("web")) return sum + 15;
            if (indexing.includes("peer") || indexing.includes("issn")) return sum + 10;
            return sum + 6;
        }, 0) +
            values.category2.books.length * 18 +
            values.category2.patents.reduce((sum, patent) => {
                const status = patent.status.toLowerCase();
                if (status.includes("granted")) return sum + 20;
                if (status.includes("published")) return sum + 12;
                return sum + 8;
            }, 0) +
            values.category2.conferences.reduce((sum, conference) => {
                const type = conference.type.toLowerCase();
                if (type.includes("international")) return sum + 8;
                if (type.includes("national")) return sum + 5;
                return sum + 3;
            }, 0) +
            values.category2.projects.reduce((sum, project) => {
                if (project.amount >= 1000000) return sum + 15;
                if (project.amount >= 250000) return sum + 10;
                return sum + 6;
            }, 0)
    );

    const institutionalResponsibilities = Math.min(
        80,
        values.category3.committees.length * 4 +
            values.category3.administrativeDuties.length * 5 +
            values.category3.examDuties.length * 3 +
            values.category3.studentGuidance.reduce((sum, item) => sum + Math.min(item.count, 10), 0) +
            values.category3.extensionActivities.length * 4
    );

    return {
        teachingActivities,
        researchAcademicContribution,
        institutionalResponsibilities,
        totalScore:
            teachingActivities + researchAcademicContribution + institutionalResponsibilities,
    };
}

export function PBASProgressStepper({ currentStep }: { currentStep: number }) {
    return (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {steps.map((step, index) => (
                <div
                    className={`rounded-lg border p-3 text-sm ${
                        index <= currentStep
                            ? "border-zinc-300 bg-white text-zinc-950"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500"
                    }`}
                    key={step}
                >
                    <p className="text-xs uppercase tracking-[0.16em]">Step {index + 1}</p>
                    <p className="mt-2 font-medium">{step}</p>
                </div>
            ))}
        </div>
    );
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
                    PBAS API score updates in real time from teaching, research, and institutional activity data.
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
    evidenceDefaults,
}: {
    initialApplications: PbasApp[];
    facultyName: string;
    evidenceDefaults: {
        researchPapers: PbasFormValues["category2"]["researchPapers"];
        books: PbasFormValues["category2"]["books"];
        patents: PbasFormValues["category2"]["patents"];
        conferences: PbasFormValues["category2"]["conferences"];
        projects: PbasFormValues["category2"]["projects"];
        extensionActivities: PbasFormValues["category3"]["extensionActivities"];
    };
}) {
    const [applications, setApplications] = useState(initialApplications);
    const [selectedId, setSelectedId] = useState<string | null>(initialApplications[0]?._id ?? null);
    const [currentStep, setCurrentStep] = useState(0);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");

    const selected = applications.find((item) => item._id === selectedId);

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
    const form = useForm<PbasFormValues, unknown, PbasResolvedValues>({
        resolver: zodResolver(pbasApplicationSchema),
        defaultValues: selected
            ? toFormValues(selected)
            : {
                  ...emptyForm(),
                  category2: {
                      ...emptyForm().category2,
                      researchPapers: evidenceDefaults.researchPapers,
                      books: evidenceDefaults.books,
                      patents: evidenceDefaults.patents,
                      conferences: evidenceDefaults.conferences,
                      projects: evidenceDefaults.projects,
                  },
                  category3: {
                      ...emptyForm().category3,
                      extensionActivities: evidenceDefaults.extensionActivities,
                  },
              },
    });

    const researchFields = useFieldArray({ control: form.control, name: "category2.researchPapers" });
    const bookFields = useFieldArray({ control: form.control, name: "category2.books" });
    const patentFields = useFieldArray({ control: form.control, name: "category2.patents" });
    const conferenceFields = useFieldArray({ control: form.control, name: "category2.conferences" });
    const projectFields = useFieldArray({ control: form.control, name: "category2.projects" });
    const committeeFields = useFieldArray({ control: form.control, name: "category3.committees" });
    const administrativeFields = useFieldArray({ control: form.control, name: "category3.administrativeDuties" });
    const examDutyFields = useFieldArray({ control: form.control, name: "category3.examDuties" });
    const guidanceFields = useFieldArray({ control: form.control, name: "category3.studentGuidance" });
    const extensionFields = useFieldArray({ control: form.control, name: "category3.extensionActivities" });

    useEffect(() => {
        form.reset(
            selected
                ? toFormValues(selected)
                : {
                      ...emptyForm(),
                      category2: {
                          ...emptyForm().category2,
                          researchPapers: evidenceDefaults.researchPapers,
                          books: evidenceDefaults.books,
                          patents: evidenceDefaults.patents,
                          conferences: evidenceDefaults.conferences,
                          projects: evidenceDefaults.projects,
                      },
                      category3: {
                          ...emptyForm().category3,
                          extensionActivities: evidenceDefaults.extensionActivities,
                      },
                  }
        );
    }, [selectedId, selected, form, evidenceDefaults]);

    const watchedValues = useWatch({ control: form.control });
    const resolved = pbasApplicationSchema.safeParse(watchedValues);
    const normalizedValues = resolved.success ? resolved.data : pbasApplicationSchema.parse(emptyForm());
    const score = computeScore(normalizedValues);

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
                setAutoSaveState("saved");
            } else {
                setAutoSaveState("idle");
            }
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [resolved, selectedId, form.formState.isDirty, selected]);

    function setCourses(value: string) {
        form.setValue(
            "category1.coursesTaught",
            value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            { shouldDirty: true, shouldValidate: true }
        );
    }

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

            setApplications((current) => [data.application!, ...current]);
            setSelectedId(data.application._id);
            setCurrentStep(0);
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
            setMessage({ type: "success", text: data.message ?? "PBAS application submitted." });
        });
    }

    return (
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
                        <Button className="w-full" onClick={createDraft} type="button" disabled={isPending}>
                            {isPending ? <Spinner /> : null}
                            Start PBAS Draft
                        </Button>
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
                    <CardContent className="grid gap-3">
                        {applications.length ? (
                            applications.map((application) => (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(application._id);
                                        setCurrentStep(0);
                                    }}
                                    key={application._id}
                                    className={`rounded-lg border p-4 text-left ${
                                        selectedId === application._id
                                            ? "border-zinc-400 bg-white"
                                            : "border-zinc-200 bg-zinc-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-zinc-950">{application.academicYear}</p>
                                        <Badge>{application.status}</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        {application.currentDesignation}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        API {application.apiScore.totalScore}
                                    </p>
                                </button>
                            ))
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

                <PBASProgressStepper currentStep={currentStep} />
                <PBASScoreCalculator score={score} />

                <Card>
                    <CardHeader>
                        <CardTitle>PBAS Annual Appraisal Form</CardTitle>
                        <CardDescription>
                            Structured yearly performance capture for teaching, research, institutional work, and API score reporting.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {currentStep === 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="Academic Year">
                                    <Input {...form.register("academicYear")} />
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
                                <Field label="Appraisal From">
                                    <Input type="date" {...form.register("appraisalPeriod.fromDate")} />
                                </Field>
                                <Field label="Appraisal To">
                                    <Input type="date" {...form.register("appraisalPeriod.toDate")} />
                                </Field>
                            </div>
                        ) : null}

                        {currentStep === 1 ? (
                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <Field label="Classes Taken">
                                        <Input
                                            type="number"
                                            {...form.register("category1.classesTaken", { valueAsNumber: true })}
                                        />
                                    </Field>
                                    <Field label="Course Preparation Hours">
                                        <Input
                                            type="number"
                                            {...form.register("category1.coursePreparationHours", {
                                                valueAsNumber: true,
                                            })}
                                        />
                                    </Field>
                                    <Field label="Mentoring Count">
                                        <Input
                                            type="number"
                                            {...form.register("category1.mentoringCount", { valueAsNumber: true })}
                                        />
                                    </Field>
                                    <Field label="Lab Supervision">
                                        <Input
                                            type="number"
                                            {...form.register("category1.labSupervisionCount", {
                                                valueAsNumber: true,
                                            })}
                                        />
                                    </Field>
                                </div>
                                <Field label="Courses Taught (comma separated)">
                                    <Input
                                        value={(watchedValues.category1?.coursesTaught ?? []).join(", ")}
                                        onChange={(event) => setCourses(event.target.value)}
                                    />
                                </Field>
                                <Field label="Feedback Summary">
                                    <Textarea {...form.register("category1.feedbackSummary")} />
                                </Field>
                            </div>
                        ) : null}

                        {currentStep === 2 ? (
                            <CardSection
                                title="Research Papers"
                                description="Capture journals and indexed publications for PBAS research assessment."
                            >
                                {researchFields.fields.map((field, index) => (
                                    <div
                                        className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-5"
                                        key={field.id}
                                    >
                                        <Input placeholder="Title" {...form.register(`category2.researchPapers.${index}.title`)} />
                                        <Input placeholder="Journal" {...form.register(`category2.researchPapers.${index}.journal`)} />
                                        <Input placeholder="Year" type="number" {...form.register(`category2.researchPapers.${index}.year`, { valueAsNumber: true })} />
                                        <Input placeholder="ISSN" {...form.register(`category2.researchPapers.${index}.issn`)} />
                                        <Input placeholder="Indexing" {...form.register(`category2.researchPapers.${index}.indexing`)} />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => researchFields.remove(index)}
                                            aria-label={`Delete research paper ${index + 1}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        researchFields.append({
                                            title: "",
                                            journal: "",
                                            year: new Date().getFullYear(),
                                            issn: "",
                                            indexing: "",
                                        })
                                    }
                                >
                                    Add Research Paper
                                </Button>
                            </CardSection>
                        ) : null}

                        {currentStep === 3 ? (
                            <div className="space-y-6">
                                <CardSection title="Books" description="Published books and academic book chapters.">
                                    {bookFields.fields.map((field, index) => (
                                        <div
                                            className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4"
                                            key={field.id}
                                        >
                                            <Input placeholder="Title" {...form.register(`category2.books.${index}.title`)} />
                                            <Input placeholder="Publisher" {...form.register(`category2.books.${index}.publisher`)} />
                                            <Input placeholder="ISBN" {...form.register(`category2.books.${index}.isbn`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`category2.books.${index}.year`, { valueAsNumber: true })} />
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
                                </CardSection>

                                <CardSection title="Patents" description="Filed, published, or granted patents.">
                                    {patentFields.fields.map((field, index) => (
                                        <div
                                            className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-3"
                                            key={field.id}
                                        >
                                            <Input placeholder="Title" {...form.register(`category2.patents.${index}.title`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`category2.patents.${index}.year`, { valueAsNumber: true })} />
                                            <Input placeholder="Status" {...form.register(`category2.patents.${index}.status`)} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => patentFields.remove(index)}
                                                aria-label={`Delete patent ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => patentFields.append({ title: "", year: new Date().getFullYear(), status: "" })}>
                                        Add Patent
                                    </Button>
                                </CardSection>

                                <CardSection title="Conferences" description="Academic papers, presentations, and seminars.">
                                    {conferenceFields.fields.map((field, index) => (
                                        <div
                                            className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4"
                                            key={field.id}
                                        >
                                            <Input placeholder="Title" {...form.register(`category2.conferences.${index}.title`)} />
                                            <Input placeholder="Organizer" {...form.register(`category2.conferences.${index}.organizer`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`category2.conferences.${index}.year`, { valueAsNumber: true })} />
                                            <Input placeholder="Type" {...form.register(`category2.conferences.${index}.type`)} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => conferenceFields.remove(index)}
                                                aria-label={`Delete conference ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => conferenceFields.append({ title: "", organizer: "", year: new Date().getFullYear(), type: "" })}>
                                        Add Conference
                                    </Button>
                                </CardSection>

                                <CardSection title="Projects" description="Sponsored and funded research projects.">
                                    {projectFields.fields.map((field, index) => (
                                        <div
                                            className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4"
                                            key={field.id}
                                        >
                                            <Input placeholder="Title" {...form.register(`category2.projects.${index}.title`)} />
                                            <Input placeholder="Funding Agency" {...form.register(`category2.projects.${index}.fundingAgency`)} />
                                            <Input placeholder="Amount" type="number" {...form.register(`category2.projects.${index}.amount`, { valueAsNumber: true })} />
                                            <Input placeholder="Year" type="number" {...form.register(`category2.projects.${index}.year`, { valueAsNumber: true })} />
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
                                </CardSection>
                            </div>
                        ) : null}

                        {currentStep === 4 ? (
                            <div className="space-y-6">
                                <CardSection title="Committees" description="Committees and governance participation.">
                                    {committeeFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-3" key={field.id}>
                                            <Input placeholder="Committee" {...form.register(`category3.committees.${index}.committeeName`)} />
                                            <Input placeholder="Role" {...form.register(`category3.committees.${index}.role`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`category3.committees.${index}.year`, { valueAsNumber: true })} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => committeeFields.remove(index)}
                                                aria-label={`Delete committee ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => committeeFields.append({ committeeName: "", role: "", year: new Date().getFullYear() })}>
                                        Add Committee
                                    </Button>
                                </CardSection>

                                <CardSection title="Administrative Responsibilities" description="Department or institutional administrative work.">
                                    {administrativeFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2" key={field.id}>
                                            <Input placeholder="Responsibility" {...form.register(`category3.administrativeDuties.${index}.title`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`category3.administrativeDuties.${index}.year`, { valueAsNumber: true })} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => administrativeFields.remove(index)}
                                                aria-label={`Delete administrative duty ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => administrativeFields.append({ title: "", year: new Date().getFullYear() })}>
                                        Add Administrative Duty
                                    </Button>
                                </CardSection>

                                <CardSection title="Exam Duties" description="Examination and evaluation responsibilities.">
                                    {examDutyFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2" key={field.id}>
                                            <Input placeholder="Duty" {...form.register(`category3.examDuties.${index}.duty`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`category3.examDuties.${index}.year`, { valueAsNumber: true })} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => examDutyFields.remove(index)}
                                                aria-label={`Delete exam duty ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => examDutyFields.append({ duty: "", year: new Date().getFullYear() })}>
                                        Add Exam Duty
                                    </Button>
                                </CardSection>

                                <CardSection title="Student Guidance" description="Mentoring, dissertation, and student support activities.">
                                    {guidanceFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2" key={field.id}>
                                            <Input placeholder="Activity" {...form.register(`category3.studentGuidance.${index}.activity`)} />
                                            <Input placeholder="Count" type="number" {...form.register(`category3.studentGuidance.${index}.count`, { valueAsNumber: true })} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => guidanceFields.remove(index)}
                                                aria-label={`Delete guidance entry ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => guidanceFields.append({ activity: "", count: 0 })}>
                                        Add Guidance Entry
                                    </Button>
                                </CardSection>

                                <CardSection title="Extension Activities" description="Outreach, extension, and social-impact academic activities.">
                                    {extensionFields.fields.map((field, index) => (
                                        <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-3" key={field.id}>
                                            <Input placeholder="Activity" {...form.register(`category3.extensionActivities.${index}.title`)} />
                                            <Input placeholder="Role" {...form.register(`category3.extensionActivities.${index}.role`)} />
                                            <Input placeholder="Year" type="number" {...form.register(`category3.extensionActivities.${index}.year`, { valueAsNumber: true })} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => extensionFields.remove(index)}
                                                aria-label={`Delete extension activity ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => extensionFields.append({ title: "", role: "", year: new Date().getFullYear() })}>
                                        Add Extension Activity
                                    </Button>
                                </CardSection>
                            </div>
                        ) : null}

                        {currentStep === 5 ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="text-sm font-semibold text-zinc-950">Review Summary</p>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Academic year {watchedValues.academicYear ?? ""} | Research papers: {(watchedValues.category2?.researchPapers ?? []).length} | Committees: {(watchedValues.category3?.committees ?? []).length}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Total API score {score.totalScore}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {selectedId ? (
                                        <Button asChild type="button" variant="secondary">
                                            <a href={`/api/pbas/${selectedId}/report`}>Download PBAS PDF</a>
                                        </Button>
                                    ) : null}
                                    <Button type="button" onClick={submitApplication} disabled={isPending || !selectedId}>
                                        {isPending ? <Spinner /> : null}
                                        Submit PBAS Application
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                                disabled={currentStep === 0}
                            >
                                Previous
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setCurrentStep((step) => Math.min(steps.length - 1, step + 1))}
                                disabled={currentStep === steps.length - 1}
                            >
                                Next
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function CardSection({
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
