"use client";

import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { aqarApplicationSchema } from "@/lib/aqar/validators";

type AqarFormValues = z.input<typeof aqarApplicationSchema>;
type AqarResolvedValues = z.output<typeof aqarApplicationSchema>;

type AqarApp = {
    _id: string;
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
};

const steps = [
    "Basic Details",
    "Research Papers and Projects",
    "Awards, Fellowships and Research",
    "Books, E-Content and Development",
    "Review and Submit",
] as const;

function emptyForm(): AqarFormValues {
    const year = new Date().getFullYear();
    const nextYear = year + 1;

    return {
        academicYear: `${year}-${nextYear}`,
        reportingPeriod: {
            fromDate: `${year}-06-01`,
            toDate: `${nextYear}-05-31`,
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

export function AQARProgressStepper({ currentStep }: { currentStep: number }) {
    return (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
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

export function AQARMetricsPanel({
    metrics,
}: {
    metrics: ReturnType<typeof computeMetrics>;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AQAR Contribution Metrics</CardTitle>
                <CardDescription>
                    Faculty-level NAAC contribution metrics update from the detailed AQAR data tables.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Metric label="Research Papers" value={String(metrics.researchPaperCount)} />
                <Metric label="Projects" value={String(metrics.seedMoneyProjectCount)} />
                <Metric label="Patents" value={String(metrics.patentCount)} />
                <Metric label="Books" value={String(metrics.bookChapterCount)} />
                <Metric label="Total Index" value={String(metrics.totalContributionIndex)} />
            </CardContent>
        </Card>
    );
}

export function AQARStatusTimeline({ logs }: { logs: AqarApp["statusLogs"] }) {
    return (
        <div className="grid gap-3">
            {logs.length ? (
                logs.map((log) => (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={log._id ?? `${log.status}-${log.changedAt}`}>
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
                    No AQAR status updates recorded yet.
                </div>
            )}
        </div>
    );
}

export function AqarDashboard({
    initialApplications,
    facultyName,
    evidenceDefaults,
}: {
    initialApplications: AqarApp[];
    facultyName: string;
    evidenceDefaults: AqarFormValues["facultyContribution"];
}) {
    const [applications, setApplications] = useState(initialApplications);
    const [selectedId, setSelectedId] = useState<string | null>(initialApplications[0]?._id ?? null);
    const [currentStep, setCurrentStep] = useState(0);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");

    const selected = applications.find((item) => item._id === selectedId);
    const form = useForm<AqarFormValues, unknown, AqarResolvedValues>({
        resolver: zodResolver(aqarApplicationSchema),
        defaultValues: selected
            ? toFormValues(selected)
            : {
                  ...emptyForm(),
                  facultyContribution: {
                      ...emptyForm().facultyContribution,
                      ...evidenceDefaults,
                  },
              },
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
        form.reset(
            selected
                ? toFormValues(selected)
                : {
                      ...emptyForm(),
                      facultyContribution: {
                          ...emptyForm().facultyContribution,
                          ...evidenceDefaults,
                      },
                  }
        );
    }, [selectedId, selected, form, evidenceDefaults]);

    const watchedValues = useWatch({ control: form.control });
    const resolved = aqarApplicationSchema.safeParse(watchedValues);
    const normalizedValues = resolved.success ? resolved.data : aqarApplicationSchema.parse(emptyForm());
    const metrics = computeMetrics(normalizedValues);

    useEffect(() => {
        if (!selectedId || !form.formState.isDirty) return;
        if (!selected || !["Draft", "Rejected"].includes(selected.status)) return;

        const timer = window.setTimeout(async () => {
            if (!resolved.success) return;

            setAutoSaveState("saving");

            const response = await fetch(`/api/aqar/${selectedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resolved.data),
            });

            const data = (await response.json()) as { application?: AqarApp };

            if (response.ok && data.application) {
                setApplications((current) => current.map((item) => (item._id === selectedId ? data.application! : item)));
                setAutoSaveState("saved");
            } else {
                setAutoSaveState("idle");
            }
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [resolved, selectedId, selected, form.formState.isDirty]);

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
            setCurrentStep(0);
            setMessage({ type: "success", text: data.message ?? "AQAR draft created." });
        });
    }

    function submitApplication() {
        if (!selectedId) {
            setMessage({ type: "error", text: "Create a draft before submitting." });
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
        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>AQAR Faculty Dashboard</CardTitle>
                        <CardDescription>
                            Manage your NAAC-facing AQAR contributions for {facultyName}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button className="w-full" onClick={createDraft} type="button" disabled={isPending}>
                            {isPending ? <Spinner /> : null}
                            Start AQAR Draft
                        </Button>
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                            Auto save: {selectedId ? autoSaveState : "Create a draft to enable auto save"}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Applications</CardTitle>
                        <CardDescription>Year-wise AQAR faculty contribution submissions and statuses.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {applications.length ? (
                            applications.map((application) => (
                                <button
                                    type="button"
                                    key={application._id}
                                    onClick={() => {
                                        setSelectedId(application._id);
                                        setCurrentStep(0);
                                    }}
                                    className={`rounded-lg border p-4 text-left ${
                                        selectedId === application._id ? "border-zinc-400 bg-white" : "border-zinc-200 bg-zinc-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-zinc-950">{application.academicYear}</p>
                                        <Badge>{application.status}</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-600">
                                        Contribution index {application.metrics.totalContributionIndex}
                                    </p>
                                </button>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No AQAR applications created yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {selected ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Status Timeline</CardTitle>
                            <CardDescription>Every AQAR workflow transition is logged here.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AQARStatusTimeline logs={selected.statusLogs} />
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            <div className="space-y-6">
                {message ? <FormMessage message={message.text} type={message.type} /> : null}

                <AQARProgressStepper currentStep={currentStep} />
                <AQARMetricsPanel metrics={metrics} />

                <Card>
                    <CardHeader>
                        <CardTitle>AQAR Faculty Contribution Form</CardTitle>
                        <CardDescription>
                            Capture the detailed faculty evidence needed for the institution&apos;s AQAR and NAAC review.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {currentStep === 0 ? (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Field label="Academic Year">
                                        <Input {...form.register("academicYear")} />
                                    </Field>
                                    <Field label="Reporting From">
                                        <Input type="date" {...form.register("reportingPeriod.fromDate")} />
                                    </Field>
                                    <Field label="Reporting To">
                                        <Input type="date" {...form.register("reportingPeriod.toDate")} />
                                    </Field>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <Metric label="Research Papers" value={String(metrics.researchPaperCount)} />
                                    <Metric label="Awards" value={String(metrics.awardRecognitionCount)} />
                                    <Metric label="Consultancy" value={String(metrics.consultancyCount)} />
                                    <Metric label="FDP" value={String(metrics.fdpCount)} />
                                </div>
                            </div>
                        ) : null}

                        {currentStep === 1 ? (
                            <div className="space-y-6">
                                <SectionCard
                                    title="Research Papers in UGC-Notified Journals"
                                    description="Research papers per teacher in journals notified on the UGC website during the year."
                                >
                                    {researchPaperFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Paper title" {...form.register(`facultyContribution.researchPapers.${index}.paperTitle`)} />
                                            <Input placeholder="Journal name" {...form.register(`facultyContribution.researchPapers.${index}.journalName`)} />
                                            <Input placeholder="Author(s)" {...form.register(`facultyContribution.researchPapers.${index}.authors`)} />
                                            <Input type="number" placeholder="Publication year" {...form.register(`facultyContribution.researchPapers.${index}.publicationYear`, { valueAsNumber: true })} />
                                            <Input placeholder="ISSN number" {...form.register(`facultyContribution.researchPapers.${index}.issnNumber`)} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.researchPapers.${index}.year`)} />
                                            <Input placeholder="Impact factor" {...form.register(`facultyContribution.researchPapers.${index}.impactFactor`)} />
                                            <Input placeholder="Indexed in" {...form.register(`facultyContribution.researchPapers.${index}.indexedIn`)} />
                                            <Input placeholder="Links" {...form.register(`facultyContribution.researchPapers.${index}.links`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.researchPapers.${index}.proof`)} />
                                            <Input placeholder="IF proof" {...form.register(`facultyContribution.researchPapers.${index}.ifProof`)} />
                                            <RemoveButton onClick={() => researchPaperFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
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
                                    >
                                        Add Research Paper
                                    </Button>
                                </SectionCard>

                                <SectionCard
                                    title="Seed Money Projects"
                                    description="Institution-supported projects and scheme funding provided to teachers."
                                >
                                    {seedMoneyFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Scheme or project title" {...form.register(`facultyContribution.seedMoneyProjects.${index}.schemeOrProjectTitle`)} />
                                            <Input placeholder="Principal investigator" {...form.register(`facultyContribution.seedMoneyProjects.${index}.principalInvestigatorName`)} />
                                            <Input placeholder="Co-investigator" {...form.register(`facultyContribution.seedMoneyProjects.${index}.coInvestigator`)} />
                                            <Input placeholder="Funding agency" {...form.register(`facultyContribution.seedMoneyProjects.${index}.fundingAgencyName`)} />
                                            <Select {...form.register(`facultyContribution.seedMoneyProjects.${index}.fundingAgencyType`)}>
                                                <option value="Government">Government</option>
                                                <option value="Non-Government">Non-Government</option>
                                            </Select>
                                            <Input type="number" placeholder="Award year" {...form.register(`facultyContribution.seedMoneyProjects.${index}.awardYear`, { valueAsNumber: true })} />
                                            <Input placeholder="Project duration" {...form.register(`facultyContribution.seedMoneyProjects.${index}.projectDuration`)} />
                                            <Input type="number" placeholder="Funds (INR)" {...form.register(`facultyContribution.seedMoneyProjects.${index}.fundsInInr`, { valueAsNumber: true })} />
                                            <Select {...form.register(`facultyContribution.seedMoneyProjects.${index}.projectCategory`)}>
                                                <option value="">Select category</option>
                                                <option value="Major">Major</option>
                                                <option value="Minor">Minor</option>
                                            </Select>
                                            <Input placeholder="Status" {...form.register(`facultyContribution.seedMoneyProjects.${index}.status`)} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.seedMoneyProjects.${index}.year`)} />
                                            <Input placeholder="Upload proof" {...form.register(`facultyContribution.seedMoneyProjects.${index}.proof`)} />
                                            <RemoveButton onClick={() => seedMoneyFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
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
                                    >
                                        Add Seed Money Project
                                    </Button>
                                </SectionCard>
                            </div>
                        ) : null}

                        {currentStep === 2 ? (
                            <div className="space-y-6">
                                <SectionCard
                                    title="Awards, Recognition and Fellowships"
                                    description="Awards, fellowships and research fellow enrolment during the year."
                                >
                                    {awardFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Teacher name" {...form.register(`facultyContribution.awardsRecognition.${index}.teacherName`)} />
                                            <Input type="date" placeholder="Award date" {...form.register(`facultyContribution.awardsRecognition.${index}.awardDate`)} />
                                            <Input placeholder="PAN" {...form.register(`facultyContribution.awardsRecognition.${index}.pan`)} />
                                            <Input placeholder="Designation" {...form.register(`facultyContribution.awardsRecognition.${index}.designation`)} />
                                            <Input placeholder="Award name" {...form.register(`facultyContribution.awardsRecognition.${index}.awardName`)} />
                                            <Select {...form.register(`facultyContribution.awardsRecognition.${index}.level`)}>
                                                <option value="State">State</option>
                                                <option value="National">National</option>
                                                <option value="International">International</option>
                                            </Select>
                                            <Input placeholder="Award agency name" {...form.register(`facultyContribution.awardsRecognition.${index}.awardAgencyName`)} />
                                            <Input placeholder="Incentives" {...form.register(`facultyContribution.awardsRecognition.${index}.incentiveDetails`)} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.awardsRecognition.${index}.year`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.awardsRecognition.${index}.proof`)} />
                                            <RemoveButton onClick={() => awardFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
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
                                    >
                                        Add Award or Recognition
                                    </Button>

                                    {fellowshipFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Teacher name" {...form.register(`facultyContribution.fellowships.${index}.teacherName`)} />
                                            <Input placeholder="Award or fellowship" {...form.register(`facultyContribution.fellowships.${index}.fellowshipName`)} />
                                            <Input placeholder="Awarding agency" {...form.register(`facultyContribution.fellowships.${index}.awardingAgency`)} />
                                            <Input type="number" placeholder="Award year" {...form.register(`facultyContribution.fellowships.${index}.awardYear`, { valueAsNumber: true })} />
                                            <Select {...form.register(`facultyContribution.fellowships.${index}.level`)}>
                                                <option value="National">National</option>
                                                <option value="International">International</option>
                                            </Select>
                                            <Input placeholder="Year" {...form.register(`facultyContribution.fellowships.${index}.year`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.fellowships.${index}.proof`)} />
                                            <RemoveButton onClick={() => fellowshipFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
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
                                    >
                                        Add Fellowship
                                    </Button>
                                </SectionCard>

                                <SectionCard
                                    title="Research Fellows, Patents and PhD Awards"
                                    description="Research fellow enrolment, patents and PhD guidance outputs."
                                >
                                    {fellowFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Research fellow name" {...form.register(`facultyContribution.researchFellows.${index}.fellowName`)} />
                                            <Input type="date" placeholder="Enrolment date" {...form.register(`facultyContribution.researchFellows.${index}.enrolmentDate`)} />
                                            <Input placeholder="Fellowship duration" {...form.register(`facultyContribution.researchFellows.${index}.fellowshipDuration`)} />
                                            <Input placeholder="Fellowship type" {...form.register(`facultyContribution.researchFellows.${index}.fellowshipType`)} />
                                            <Input placeholder="Granting agency" {...form.register(`facultyContribution.researchFellows.${index}.grantingAgency`)} />
                                            <Input placeholder="Qualifying exam" {...form.register(`facultyContribution.researchFellows.${index}.qualifyingExam`)} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.researchFellows.${index}.year`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.researchFellows.${index}.proof`)} />
                                            <RemoveButton onClick={() => fellowFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
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
                                    >
                                        Add Research Fellow
                                    </Button>

                                    {patentFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Type" {...form.register(`facultyContribution.patents.${index}.type`)} />
                                            <Input placeholder="Patenter name" {...form.register(`facultyContribution.patents.${index}.patenterName`)} />
                                            <Input placeholder="Patent number" {...form.register(`facultyContribution.patents.${index}.patentNumber`)} />
                                            <Input type="date" placeholder="Filing date" {...form.register(`facultyContribution.patents.${index}.filingDate`)} />
                                            <Input type="date" placeholder="Published date" {...form.register(`facultyContribution.patents.${index}.publishedDate`)} />
                                            <Input placeholder="Title" {...form.register(`facultyContribution.patents.${index}.title`)} />
                                            <Input placeholder="Status" {...form.register(`facultyContribution.patents.${index}.status`)} />
                                            <Select {...form.register(`facultyContribution.patents.${index}.level`)}>
                                                <option value="National">National</option>
                                                <option value="International">International</option>
                                            </Select>
                                            <Input type="number" placeholder="Award year" {...form.register(`facultyContribution.patents.${index}.awardYear`, { valueAsNumber: true })} />
                                            <Input placeholder="Academic year" {...form.register(`facultyContribution.patents.${index}.academicYear`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.patents.${index}.proof`)} />
                                            <RemoveButton onClick={() => patentFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
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
                                    >
                                        Add Patent
                                    </Button>

                                    {phdAwardFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Scholar name" {...form.register(`facultyContribution.phdAwards.${index}.scholarName`)} />
                                            <Input placeholder="Department name" {...form.register(`facultyContribution.phdAwards.${index}.departmentName`)} />
                                            <Input placeholder="Guide name" {...form.register(`facultyContribution.phdAwards.${index}.guideName`)} />
                                            <Input placeholder="Thesis title" {...form.register(`facultyContribution.phdAwards.${index}.thesisTitle`)} />
                                            <Input type="date" placeholder="Date of registration" {...form.register(`facultyContribution.phdAwards.${index}.registrationDate`)} />
                                            <Input placeholder="Gender" {...form.register(`facultyContribution.phdAwards.${index}.gender`)} />
                                            <Input placeholder="Category" {...form.register(`facultyContribution.phdAwards.${index}.category`)} />
                                            <Input placeholder="Degree" {...form.register(`facultyContribution.phdAwards.${index}.degree`)} />
                                            <Select {...form.register(`facultyContribution.phdAwards.${index}.awardStatus`)}>
                                                <option value="Awarded">Awarded</option>
                                                <option value="Submitted">Submitted</option>
                                            </Select>
                                            <Input type="number" placeholder="Scholar registration year" {...form.register(`facultyContribution.phdAwards.${index}.scholarRegistrationYear`, { valueAsNumber: true })} />
                                            <Input type="number" placeholder="Award year" {...form.register(`facultyContribution.phdAwards.${index}.awardYear`, { valueAsNumber: true })} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.phdAwards.${index}.year`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.phdAwards.${index}.proof`)} />
                                            <RemoveButton onClick={() => phdAwardFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
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
                                    >
                                        Add PhD Award
                                    </Button>
                                </SectionCard>
                            </div>
                        ) : null}

                        {currentStep === 3 ? (
                            <div className="space-y-6">
                                <SectionCard
                                    title="Books, Chapters and Proceedings"
                                    description="Books and chapters in edited volumes published during the year."
                                >
                                    {bookChapterFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Type" {...form.register(`facultyContribution.booksChapters.${index}.type`)} />
                                            <Input placeholder="Title of work" {...form.register(`facultyContribution.booksChapters.${index}.titleOfWork`)} />
                                            <Input placeholder="Title of chapter" {...form.register(`facultyContribution.booksChapters.${index}.titleOfChapter`)} />
                                            <Input placeholder="Paper title" {...form.register(`facultyContribution.booksChapters.${index}.paperTitle`)} />
                                            <Input placeholder="Translation work" {...form.register(`facultyContribution.booksChapters.${index}.translationWork`)} />
                                            <Input placeholder="Proceedings title" {...form.register(`facultyContribution.booksChapters.${index}.proceedingsTitle`)} />
                                            <Input placeholder="Conference name" {...form.register(`facultyContribution.booksChapters.${index}.conferenceName`)} />
                                            <Select {...form.register(`facultyContribution.booksChapters.${index}.level`)}>
                                                <option value="">Select level</option>
                                                <option value="National">National</option>
                                                <option value="International">International</option>
                                            </Select>
                                            <Input type="number" placeholder="Publication year" {...form.register(`facultyContribution.booksChapters.${index}.publicationYear`, { valueAsNumber: true })} />
                                            <Input placeholder="ISBN / ISSN" {...form.register(`facultyContribution.booksChapters.${index}.isbnIssnNumber`)} />
                                            <Input placeholder="Affiliation institute" {...form.register(`facultyContribution.booksChapters.${index}.affiliationInstitute`)} />
                                            <Input placeholder="Publisher name" {...form.register(`facultyContribution.booksChapters.${index}.publisherName`)} />
                                            <Input placeholder="Academic year" {...form.register(`facultyContribution.booksChapters.${index}.academicYear`)} />
                                            <Input placeholder="Uploaded proof" {...form.register(`facultyContribution.booksChapters.${index}.proof`)} />
                                            <RemoveButton onClick={() => bookChapterFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
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
                                    >
                                        Add Book or Chapter
                                    </Button>
                                </SectionCard>

                                <SectionCard
                                    title="E-Content, Consultancy, Conference Support and FDP"
                                    description="Learning content, consultancy outputs, conference support and faculty development records."
                                >
                                    {eContentFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Module or course" {...form.register(`facultyContribution.eContentDeveloped.${index}.moduleName`)} />
                                            <Input placeholder="Type of creation" {...form.register(`facultyContribution.eContentDeveloped.${index}.creationType`)} />
                                            <Input placeholder="Platform" {...form.register(`facultyContribution.eContentDeveloped.${index}.platform`)} />
                                            <Input placeholder="Academic year" {...form.register(`facultyContribution.eContentDeveloped.${index}.academicYear`)} />
                                            <Input placeholder="Link to content" {...form.register(`facultyContribution.eContentDeveloped.${index}.linkToContent`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.eContentDeveloped.${index}.proof`)} />
                                            <RemoveButton onClick={() => eContentFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            eContentFields.append({
                                                moduleName: "",
                                                creationType: "",
                                                platform: "",
                                                academicYear: "",
                                                linkToContent: "",
                                                proof: "",
                                            })
                                        }
                                    >
                                        Add E-Content
                                    </Button>

                                    {consultancyFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Consultant name" {...form.register(`facultyContribution.consultancyServices.${index}.consultantName`)} />
                                            <Input placeholder="Consultancy project name" {...form.register(`facultyContribution.consultancyServices.${index}.consultancyProjectName`)} />
                                            <Input placeholder="Sponsoring agency contact" {...form.register(`facultyContribution.consultancyServices.${index}.sponsoringAgencyContact`)} />
                                            <Input type="number" placeholder="Consultancy year" {...form.register(`facultyContribution.consultancyServices.${index}.consultancyYear`, { valueAsNumber: true })} />
                                            <Input type="number" placeholder="Revenue generated (INR)" {...form.register(`facultyContribution.consultancyServices.${index}.revenueGeneratedInInr`, { valueAsNumber: true })} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.consultancyServices.${index}.year`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.consultancyServices.${index}.proof`)} />
                                            <RemoveButton onClick={() => consultancyFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
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
                                    >
                                        Add Consultancy Service
                                    </Button>

                                    {financialSupportFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Conference name" {...form.register(`facultyContribution.financialSupport.${index}.conferenceName`)} />
                                            <Input placeholder="Professional body" {...form.register(`facultyContribution.financialSupport.${index}.professionalBodyName`)} />
                                            <Input type="number" placeholder="Amount of support" {...form.register(`facultyContribution.financialSupport.${index}.amountOfSupport`, { valueAsNumber: true })} />
                                            <Input placeholder="PAN no." {...form.register(`facultyContribution.financialSupport.${index}.panNo`)} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.financialSupport.${index}.year`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.financialSupport.${index}.proof`)} />
                                            <RemoveButton onClick={() => financialSupportFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            financialSupportFields.append({
                                                conferenceName: "",
                                                professionalBodyName: "",
                                                amountOfSupport: 0,
                                                panNo: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                    >
                                        Add Conference Support
                                    </Button>

                                    {fdpFields.fields.map((field, index) => (
                                        <GridRow key={field.id}>
                                            <Input placeholder="Programme title" {...form.register(`facultyContribution.facultyDevelopmentProgrammes.${index}.programTitle`)} />
                                            <Input placeholder="Organized by" {...form.register(`facultyContribution.facultyDevelopmentProgrammes.${index}.organizedBy`)} />
                                            <Input type="date" placeholder="Duration from" {...form.register(`facultyContribution.facultyDevelopmentProgrammes.${index}.durationFrom`)} />
                                            <Input type="date" placeholder="Duration to" {...form.register(`facultyContribution.facultyDevelopmentProgrammes.${index}.durationTo`)} />
                                            <Input placeholder="Year" {...form.register(`facultyContribution.facultyDevelopmentProgrammes.${index}.year`)} />
                                            <Input placeholder="Proof" {...form.register(`facultyContribution.facultyDevelopmentProgrammes.${index}.proof`)} />
                                            <RemoveButton onClick={() => fdpFields.remove(index)} />
                                        </GridRow>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            fdpFields.append({
                                                programTitle: "",
                                                organizedBy: "",
                                                durationFrom: "",
                                                durationTo: "",
                                                year: "",
                                                proof: "",
                                            })
                                        }
                                    >
                                        Add FDP Record
                                    </Button>
                                </SectionCard>
                            </div>
                        ) : null}

                        {currentStep === 4 ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="text-sm font-semibold text-zinc-950">Review Summary</p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <Metric label="Research Papers" value={String(metrics.researchPaperCount)} />
                                        <Metric label="Patents" value={String(metrics.patentCount)} />
                                        <Metric label="Books" value={String(metrics.bookChapterCount)} />
                                        <Metric label="FDP" value={String(metrics.fdpCount)} />
                                    </div>
                                    <p className="mt-4 text-sm text-zinc-600">
                                        Academic year {watchedValues.academicYear ?? ""} | Total contribution index {metrics.totalContributionIndex}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Submit this only after checking proofs, dates, years, and NAAC support links.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {selectedId ? (
                                        <Button asChild type="button" variant="secondary">
                                            <a href={`/api/aqar/${selectedId}/report`}>Download AQAR PDF</a>
                                        </Button>
                                    ) : null}
                                    <Button type="button" onClick={submitApplication} disabled={isPending || !selectedId}>
                                        {isPending ? <Spinner /> : null}
                                        Submit AQAR Application
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
    children: ReactNode;
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

function GridRow({ children }: { children: ReactNode }) {
    return <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

function RemoveButton({ onClick }: { onClick: () => void }) {
    return (
        <Button type="button" variant="secondary" onClick={onClick}>
            Remove
        </Button>
    );
}
