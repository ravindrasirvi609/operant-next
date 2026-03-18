"use client";

import Link from "next/link";
import {
    BookOpenText,
    FileCheck2,
    GraduationCap,
    ShieldCheck,
    Sparkles,
    Trash2,
    UserRound,
} from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { ProfilePhotoUpload } from "@/components/faculty/profile-photo-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    uploadFile,
    validateFile,
    UploadValidationError,
    type UploadProgress,
} from "@/lib/upload/service";
import {
    bookTypes,
    eventLevels,
    eventRoles,
    eventTypes,
    facultyEmploymentTypes,
    facultyProgrammeLevels,
    institutionalImpactLevels,
    patentStatuses,
    publicationAuthorPositions,
    publicationTypes,
    researchProjectStatuses,
    researchProjectTypes,
} from "@/lib/faculty/options";
import { cn } from "@/lib/utils";
import { facultyRecordSchema } from "@/lib/faculty/validators";

type FacultyWorkspaceValues = z.input<typeof facultyRecordSchema>;
type FacultyWorkspaceResolvedValues = z.output<typeof facultyRecordSchema>;

type FacultyUser = {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
    designation?: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
};

type ExistingRecord = FacultyWorkspaceResolvedValues & {
    _id?: string;
};

type CourseOption = {
    name: string;
    subjectCode?: string;
    programName?: string;
};

function toCsv(value?: string[]) {
    return value?.join(", ") ?? "";
}

function countEvidenceLinked<T extends { documentId?: string }>(rows?: T[]) {
    return rows?.filter((row) => Boolean(row.documentId)).length ?? 0;
}

export function FacultyWorkspaceForm({
    user,
    facultyRecord,
    academicYearOptions,
    programOptions,
    courseOptions,
}: {
    user: FacultyUser;
    facultyRecord: ExistingRecord;
    academicYearOptions: string[];
    programOptions: string[];
    courseOptions: CourseOption[];
}) {
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const form = useForm<FacultyWorkspaceValues, unknown, FacultyWorkspaceResolvedValues>({
        resolver: zodResolver(facultyRecordSchema),
        defaultValues: {
            employeeCode: facultyRecord.employeeCode ?? "",
            joiningDate: facultyRecord.joiningDate ?? "",
            biography: facultyRecord.biography ?? "",
            specialization: facultyRecord.specialization ?? "",
            highestQualification: facultyRecord.highestQualification ?? "",
            employmentType: facultyRecord.employmentType ?? "Permanent",
            experienceYears: facultyRecord.experienceYears ?? 0,
            researchInterests: facultyRecord.researchInterests ?? [],
            professionalMemberships: facultyRecord.professionalMemberships ?? [],
            certifications: facultyRecord.certifications ?? [],
            administrativeResponsibilities: facultyRecord.administrativeResponsibilities ?? [],
            qualifications: facultyRecord.qualifications ?? [],
            researchProfile: facultyRecord.researchProfile ?? {},
            teachingSummaries: facultyRecord.teachingSummaries ?? [],
            teachingLoads: facultyRecord.teachingLoads ?? [],
            resultSummaries: facultyRecord.resultSummaries ?? [],
            publications: facultyRecord.publications ?? [],
            books: facultyRecord.books ?? [],
            patents: facultyRecord.patents ?? [],
            researchProjects: facultyRecord.researchProjects ?? [],
            eventParticipations: facultyRecord.eventParticipations ?? [],
            administrativeRoles: facultyRecord.administrativeRoles ?? [],
            institutionalContributions: facultyRecord.institutionalContributions ?? [],
            facultyDevelopmentProgrammes: facultyRecord.facultyDevelopmentProgrammes ?? [],
            socialExtensionActivities: facultyRecord.socialExtensionActivities ?? [],
        },
    });

    const qualifications = useFieldArray({ control: form.control, name: "qualifications" });
    const teachingSummaries = useFieldArray({ control: form.control, name: "teachingSummaries" });
    const teachingLoads = useFieldArray({ control: form.control, name: "teachingLoads" });
    const resultSummaries = useFieldArray({ control: form.control, name: "resultSummaries" });
    const publications = useFieldArray({ control: form.control, name: "publications" });
    const books = useFieldArray({ control: form.control, name: "books" });
    const patents = useFieldArray({ control: form.control, name: "patents" });
    const researchProjects = useFieldArray({ control: form.control, name: "researchProjects" });
    const eventParticipations = useFieldArray({ control: form.control, name: "eventParticipations" });
    const administrativeRoles = useFieldArray({ control: form.control, name: "administrativeRoles" });
    const institutionalContributions = useFieldArray({
        control: form.control,
        name: "institutionalContributions",
    });
    const facultyDevelopmentProgrammes = useFieldArray({
        control: form.control,
        name: "facultyDevelopmentProgrammes",
    });
    const socialExtensionActivities = useFieldArray({
        control: form.control,
        name: "socialExtensionActivities",
    });

    const uniqueProgramOptions = useMemo(
        () => Array.from(new Set(programOptions.filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [programOptions]
    );

    const uniqueCourseOptions = useMemo(
        () =>
            Array.from(
                new Set(courseOptions.map((option) => option.name).filter(Boolean))
            ).sort((a, b) => a.localeCompare(b)),
        [courseOptions]
    );

    const watchedValues = useWatch({ control: form.control });

    const completion = useMemo(() => {
        const profileChecks = [
            Boolean(watchedValues.employeeCode),
            Boolean(watchedValues.joiningDate),
            Boolean(watchedValues.biography),
            Boolean(watchedValues.specialization),
            Boolean(watchedValues.highestQualification),
            Number(watchedValues.experienceYears ?? 0) > 0,
        ];

        const completedProfileFields = profileChecks.filter(Boolean).length;
        const profileScore = Math.round((completedProfileFields / profileChecks.length) * 100);

        const teachingRecords =
            (watchedValues.teachingSummaries?.length ?? 0) +
            (watchedValues.teachingLoads?.length ?? 0) +
            (watchedValues.resultSummaries?.length ?? 0);

        const scholarlyRecords =
            (watchedValues.publications?.length ?? 0) +
            (watchedValues.books?.length ?? 0) +
            (watchedValues.patents?.length ?? 0) +
            (watchedValues.researchProjects?.length ?? 0) +
            (watchedValues.eventParticipations?.length ?? 0);

        const activityRecords =
            (watchedValues.administrativeRoles?.length ?? 0) +
            (watchedValues.institutionalContributions?.length ?? 0) +
            (watchedValues.facultyDevelopmentProgrammes?.length ?? 0) +
            (watchedValues.socialExtensionActivities?.length ?? 0);

        const evidenceCount =
            countEvidenceLinked(watchedValues.teachingSummaries) +
            countEvidenceLinked(watchedValues.teachingLoads) +
            countEvidenceLinked(watchedValues.resultSummaries) +
            countEvidenceLinked(watchedValues.publications) +
            countEvidenceLinked(watchedValues.books) +
            countEvidenceLinked(watchedValues.patents) +
            countEvidenceLinked(watchedValues.researchProjects) +
            countEvidenceLinked(watchedValues.eventParticipations) +
            countEvidenceLinked(watchedValues.administrativeRoles) +
            countEvidenceLinked(watchedValues.institutionalContributions) +
            countEvidenceLinked(watchedValues.facultyDevelopmentProgrammes) +
            countEvidenceLinked(watchedValues.socialExtensionActivities);

        return {
            profileScore,
            completedProfileFields,
            totalProfileFields: profileChecks.length,
            teachingRecords,
            scholarlyRecords,
            activityRecords,
            evidenceCount,
        };
    }, [watchedValues]);

    function getCourseOptionsForProgram(programName?: string) {
        if (!programName) {
            return uniqueCourseOptions;
        }

        const scoped = courseOptions
            .filter((option) => option.programName === programName)
            .map((option) => option.name)
            .filter(Boolean);

        if (!scoped.length) {
            return uniqueCourseOptions;
        }

        return Array.from(new Set(scoped)).sort((a, b) => a.localeCompare(b));
    }

    function getSubjectCodeOptions(programName?: string, courseName?: string) {
        const scoped = courseOptions
            .filter((option) => {
                const byProgram = programName ? option.programName === programName : true;
                const byCourse = courseName ? option.name === courseName : true;
                return byProgram && byCourse;
            })
            .map((option) => option.subjectCode ?? "")
            .filter(Boolean);

        return Array.from(new Set(scoped)).sort((a, b) => a.localeCompare(b));
    }

    function setCsvField(
        field:
            | "researchInterests"
            | "professionalMemberships"
            | "certifications"
            | "administrativeResponsibilities",
        value: string
    ) {
        form.setValue(
            field,
            value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            { shouldValidate: true }
        );
    }

    function submit(values: FacultyWorkspaceResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch("/api/faculty/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                setMessage({ type: "error", text: data.message ?? "Unable to save faculty workspace." });
                return;
            }

            setMessage({ type: "success", text: data.message ?? "Faculty workspace saved." });
        });
    }

    return (
        <div className="space-y-8 pb-20">
            <Card className="border-0 bg-[linear-gradient(120deg,#0f172a_0%,#1f2937_48%,#14532d_100%)] text-white shadow-xl ring-0">
                <CardHeader className="gap-3">
                    <Badge variant="secondary" className="w-fit bg-white/15 text-white">
                        Faculty Profile Workspace
                    </Badge>
                    <CardTitle className="text-2xl font-semibold md:text-3xl">Professional Faculty Profile</CardTitle>
                    <CardDescription className="max-w-3xl text-white/80">
                        Maintain your canonical faculty identity and high-quality category-wise records that drive PBAS, CAS, and AQAR workflows.
                    </CardDescription>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                            {completion.profileScore}% profile completeness
                        </Badge>
                        <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                            {completion.evidenceCount} linked evidence files
                        </Badge>
                        <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                            {completion.teachingRecords + completion.scholarlyRecords + completion.activityRecords} total records
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Info label="Faculty" value={user.name} />
                    <Info label="Designation" value={user.designation ?? "-"} />
                    <Info label="Department" value={user.department ?? "-"} />
                    <Info label="College" value={user.collegeName ?? "-"} />
                    <Info label="University" value={user.universityName ?? "-"} />
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    title="Profile Completion"
                    icon={<UserRound className="size-4" />}
                    value={`${completion.completedProfileFields}/${completion.totalProfileFields}`}
                    description="Core profile fields complete"
                    tone="blue"
                />
                <KpiCard
                    title="Teaching Records"
                    icon={<GraduationCap className="size-4" />}
                    value={String(completion.teachingRecords)}
                    description="Summaries, load, and outcomes"
                    tone="indigo"
                />
                <KpiCard
                    title="Academic Outputs"
                    icon={<BookOpenText className="size-4" />}
                    value={String(completion.scholarlyRecords)}
                    description="Publications, books, patents, projects"
                    tone="emerald"
                />
                <KpiCard
                    title="Evidence Coverage"
                    icon={<FileCheck2 className="size-4" />}
                    value={String(completion.evidenceCount)}
                    description="Records linked with documents"
                    tone="amber"
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
                <ActionCard
                    title="PBAS Module"
                    description="Verify yearly academic contributions, upload evidence, and submit PBAS."
                    href="/faculty/pbas"
                    label="Open PBAS"
                    icon={<Sparkles className="size-4" />}
                />
                <ActionCard
                    title="CAS Module"
                    description="Prepare promotion evidence, link PBAS reports, and manage CAS workflow."
                    href="/faculty/cas"
                    label="Open CAS"
                    icon={<ShieldCheck className="size-4" />}
                />
                <ActionCard
                    title="AQAR Module"
                    description="Review annual quality contributions and submit AQAR-ready faculty data."
                    href="/faculty/aqar"
                    label="Open AQAR"
                    icon={<FileCheck2 className="size-4" />}
                />
                <ActionCard
                    title="Faculty Records"
                    description="Use this workspace as the source of truth for category-wise faculty data."
                    href="/faculty/profile"
                    label="Review Records"
                    icon={<BookOpenText className="size-4" />}
                />
            </div>

            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
                <CardHeader>
                    <CardTitle>Profile Photo</CardTitle>
                    <CardDescription>Upload a professional photo for your faculty profile.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfilePhotoUpload userId={user.id} currentPhotoURL={user.photoURL} />
                </CardContent>
            </Card>

            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl border border-zinc-200 bg-white/85 p-2 shadow-sm backdrop-blur sm:grid-cols-2 xl:grid-cols-4">
                        <TabsTrigger value="profile" className="h-10 gap-1.5 whitespace-normal px-3 text-center">
                            <UserRound className="size-4" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="teaching" className="h-10 gap-1.5 whitespace-normal px-3 text-center">
                            <GraduationCap className="size-4" />
                            Teaching
                        </TabsTrigger>
                        <TabsTrigger value="activities" className="h-10 gap-1.5 whitespace-normal px-3 text-center">
                            <BookOpenText className="size-4" />
                            Academic Activities
                        </TabsTrigger>
                        <TabsTrigger value="compliance" className="h-10 gap-1.5 whitespace-normal px-3 text-center">
                            <ShieldCheck className="size-4" />
                            Compliance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-6 space-y-6">
                        <SectionCard title="Identity and Qualification" description="Institution-controlled faculty identity and profile details.">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="Employee code" id="employeeCode" error={form.formState.errors.employeeCode?.message}>
                                    <Input id="employeeCode" {...form.register("employeeCode")} />
                                </Field>
                                <Field label="Joining Date" id="joiningDate" error={form.formState.errors.joiningDate?.message}>
                                    <Input id="joiningDate" type="date" {...form.register("joiningDate")} />
                                </Field>
                                <Field label="Highest qualification" id="highestQualification" error={form.formState.errors.highestQualification?.message}>
                                    <Input id="highestQualification" {...form.register("highestQualification")} />
                                </Field>
                                <Field label="Experience years" id="experienceYears" error={form.formState.errors.experienceYears?.message}>
                                    <Input id="experienceYears" type="number" min={0} {...form.register("experienceYears", { valueAsNumber: true })} />
                                </Field>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="Employment type" id="employmentType" error={form.formState.errors.employmentType?.message}>
                                    <Controller
                                        control={form.control}
                                        name="employmentType"
                                        render={({ field }) => (
                                            <EnumSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={facultyEmploymentTypes}
                                                placeholder="Select employment type"
                                            />
                                        )}
                                    />
                                </Field>
                                <Field label="Specialization" id="specialization" error={form.formState.errors.specialization?.message}>
                                    <Input id="specialization" {...form.register("specialization")} />
                                </Field>
                                <Field label="ORCID" id="orcidId" error={form.formState.errors.researchProfile?.orcidId?.message}>
                                    <Input id="orcidId" {...form.register("researchProfile.orcidId")} />
                                </Field>
                                <Field label="Google Scholar ID" id="googleScholarId" error={form.formState.errors.researchProfile?.googleScholarId?.message}>
                                    <Input id="googleScholarId" {...form.register("researchProfile.googleScholarId")} />
                                </Field>
                            </div>
                            <Field label="Biography" id="biography" error={form.formState.errors.biography?.message}>
                                <Textarea id="biography" {...form.register("biography")} />
                            </Field>
                            <CsvField label="Research Interests" initialValue={toCsv(facultyRecord.researchInterests)} onChange={(value) => setCsvField("researchInterests", value)} />
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <CsvField label="Professional Memberships" initialValue={toCsv(facultyRecord.professionalMemberships)} onChange={(value) => setCsvField("professionalMemberships", value)} />
                                <CsvField label="Certifications" initialValue={toCsv(facultyRecord.certifications)} onChange={(value) => setCsvField("certifications", value)} />
                                <CsvField label="Administrative Responsibilities" initialValue={toCsv(facultyRecord.administrativeResponsibilities)} onChange={(value) => setCsvField("administrativeResponsibilities", value)} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Educational Qualifications" description="Maintain the academic qualification timeline for your institutional faculty record.">
                            <div className="grid gap-4">
                                {qualifications.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Level">
                                            <Input {...form.register(`qualifications.${index}.level`)} />
                                        </RowField>
                                        <RowField label="Degree">
                                            <Input {...form.register(`qualifications.${index}.degree`)} />
                                        </RowField>
                                        <RowField label="Subject">
                                            <Input {...form.register(`qualifications.${index}.subject`)} />
                                        </RowField>
                                        <RowField label="Institution">
                                            <Input {...form.register(`qualifications.${index}.institution`)} />
                                        </RowField>
                                        <RowField label="Year">
                                            <Input {...form.register(`qualifications.${index}.year`)} />
                                        </RowField>
                                        <DeleteField label={`Delete qualification ${index + 1}`} onClick={() => qualifications.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => qualifications.append({ level: "", degree: "", subject: "", institution: "", year: "" })}>
                                    Add Qualification
                                </Button>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="teaching" className="mt-6 space-y-6">
                        <SectionCard title="PBAS Category I Teaching Summary" description="Year-wise teaching summary records used as the primary PBAS teaching source.">
                            <div className="grid gap-4">
                                {teachingSummaries.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Academic year">
                                            <Controller
                                                control={form.control}
                                                name={`teachingSummaries.${index}.academicYear`}
                                                render={({ field }) => (
                                                    <AcademicYearSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={academicYearOptions}
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Classes taken">
                                            <Input type="number" {...form.register(`teachingSummaries.${index}.classesTaken`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Course prep hours">
                                            <Input type="number" {...form.register(`teachingSummaries.${index}.coursePreparationHours`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Mentoring count">
                                            <Input type="number" {...form.register(`teachingSummaries.${index}.mentoringCount`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Lab supervision count">
                                            <Input type="number" {...form.register(`teachingSummaries.${index}.labSupervisionCount`, { valueAsNumber: true })} />
                                        </RowField>
                                        <DeleteField label={`Delete teaching summary ${index + 1}`} onClick={() => teachingSummaries.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`teachingSummaries.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                        <RowField label="Courses taught" className="md:col-span-2 xl:col-span-3">
                                            <Controller
                                                control={form.control}
                                                name={`teachingSummaries.${index}.coursesTaught`}
                                                render={({ field }) => (
                                                    <MultiSelectField
                                                        options={uniqueCourseOptions}
                                                        value={field.value ?? []}
                                                        onChange={field.onChange}
                                                        placeholder="Select courses taught"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Feedback summary" className="md:col-span-2 xl:col-span-3">
                                            <Textarea {...form.register(`teachingSummaries.${index}.feedbackSummary`)} />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        teachingSummaries.append({
                                            documentId: "",
                                            academicYear: "",
                                            classesTaken: 0,
                                            coursePreparationHours: 0,
                                            coursesTaught: [],
                                            mentoringCount: 0,
                                            labSupervisionCount: 0,
                                            feedbackSummary: "",
                                        })
                                    }
                                >
                                    Add Teaching Summary
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Teaching Contributions" description="Course handling, semester allocation, and teaching load mapping for accreditation reporting.">
                            <div className="grid gap-4">
                                {teachingLoads.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Academic year">
                                            <Controller
                                                control={form.control}
                                                name={`teachingLoads.${index}.academicYear`}
                                                render={({ field }) => (
                                                    <AcademicYearSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={academicYearOptions}
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Program">
                                            <Controller
                                                control={form.control}
                                                name={`teachingLoads.${index}.programName`}
                                                render={({ field }) => (
                                                    <Select
                                                        value={field.value || undefined}
                                                        onValueChange={(value) => {
                                                            field.onChange(value);
                                                            form.setValue(`teachingLoads.${index}.courseName`, "", { shouldValidate: true });
                                                            form.setValue(`teachingLoads.${index}.subjectCode`, "", { shouldValidate: true });
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select program" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {uniqueProgramOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Course name">
                                            <Controller
                                                control={form.control}
                                                name={`teachingLoads.${index}.courseName`}
                                                render={({ field }) => {
                                                    const programName = form.getValues(`teachingLoads.${index}.programName`);
                                                    const options = getCourseOptionsForProgram(programName);

                                                    return (
                                                        <Select
                                                            value={field.value || undefined}
                                                            onValueChange={(value) => {
                                                                field.onChange(value);
                                                                const subjectCodes = getSubjectCodeOptions(programName, value);
                                                                if (subjectCodes.length === 1) {
                                                                    form.setValue(`teachingLoads.${index}.subjectCode`, subjectCodes[0], {
                                                                        shouldValidate: true,
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select course" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {options.map((option) => (
                                                                    <SelectItem key={option} value={option}>
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    );
                                                }}
                                            />
                                        </RowField>
                                        <RowField label="Semester">
                                            <Controller
                                                control={form.control}
                                                name={`teachingLoads.${index}.semester`}
                                                render={({ field }) => (
                                                    <Select
                                                        value={String(field.value || "")}
                                                        onValueChange={(value) => field.onChange(Number(value))}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select semester" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((sem) => (
                                                                <SelectItem key={sem} value={String(sem)}>
                                                                    Semester {sem}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Subject code">
                                            <Controller
                                                control={form.control}
                                                name={`teachingLoads.${index}.subjectCode`}
                                                render={({ field }) => {
                                                    const programName = form.getValues(`teachingLoads.${index}.programName`);
                                                    const courseName = form.getValues(`teachingLoads.${index}.courseName`);
                                                    const subjectCodes = getSubjectCodeOptions(programName, courseName);

                                                    if (!subjectCodes.length) {
                                                        return <Input value={field.value ?? ""} placeholder="No mapped subject code" readOnly />;
                                                    }

                                                    return (
                                                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select subject code" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {subjectCodes.map((option) => (
                                                                    <SelectItem key={option} value={option}>
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    );
                                                }}
                                            />
                                        </RowField>
                                        <RowField label="Lecture hours">
                                            <Input type="number" {...form.register(`teachingLoads.${index}.lectureHours`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Tutorial hours">
                                            <Input type="number" {...form.register(`teachingLoads.${index}.tutorialHours`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Practical hours">
                                            <Input type="number" {...form.register(`teachingLoads.${index}.practicalHours`, { valueAsNumber: true })} />
                                        </RowField>
                                        <DeleteField label={`Delete teaching load ${index + 1}`} onClick={() => teachingLoads.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`teachingLoads.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => teachingLoads.append({ documentId: "", academicYear: "", programName: "", courseName: "", semester: 1, subjectCode: "", lectureHours: 0, tutorialHours: 0, practicalHours: 0, innovativePedagogy: "" })}>
                                    Add Teaching Contribution
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Result Summary" description="Subject-wise academic outcome summary used in teaching quality analytics.">
                            <div className="grid gap-4">
                                {resultSummaries.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Academic year">
                                            <Controller
                                                control={form.control}
                                                name={`resultSummaries.${index}.academicYear`}
                                                render={({ field }) => (
                                                    <AcademicYearSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={academicYearOptions}
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Subject name">
                                            <Controller
                                                control={form.control}
                                                name={`resultSummaries.${index}.subjectName`}
                                                render={({ field }) => (
                                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select subject" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {uniqueCourseOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Appeared">
                                            <Input type="number" {...form.register(`resultSummaries.${index}.appearedStudents`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Passed">
                                            <Input type="number" {...form.register(`resultSummaries.${index}.passedStudents`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="University rank students">
                                            <Input type="number" {...form.register(`resultSummaries.${index}.universityRankStudents`, { valueAsNumber: true })} />
                                        </RowField>
                                        <DeleteField label={`Delete result summary ${index + 1}`} onClick={() => resultSummaries.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`resultSummaries.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => resultSummaries.append({ documentId: "", academicYear: "", subjectName: "", appearedStudents: 0, passedStudents: 0, universityRankStudents: 0 })}>
                                    Add Result Summary
                                </Button>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="activities" className="mt-6 space-y-6">
                        <SectionCard title="PBAS Category II Publications" description="Journal publications and indexed outputs captured directly in the faculty publication schema.">
                            <div className="grid gap-4">
                                {publications.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Title">
                                            <Input {...form.register(`publications.${index}.title`)} />
                                        </RowField>
                                        <RowField label="Journal name">
                                            <Input {...form.register(`publications.${index}.journalName`)} />
                                        </RowField>
                                        <RowField label="Publisher">
                                            <Input {...form.register(`publications.${index}.publisher`)} />
                                        </RowField>
                                        <RowField label="Publication type">
                                            <Controller
                                                control={form.control}
                                                name={`publications.${index}.publicationType`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={publicationTypes}
                                                        placeholder="Select publication type"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Indexed in">
                                            <Input {...form.register(`publications.${index}.indexedIn`)} />
                                        </RowField>
                                        <DeleteField label={`Delete publication ${index + 1}`} onClick={() => publications.remove(index)} />
                                        <RowField label="ISBN / ISSN">
                                            <Input {...form.register(`publications.${index}.isbnIssn`)} />
                                        </RowField>
                                        <RowField label="DOI">
                                            <Input {...form.register(`publications.${index}.doi`)} />
                                        </RowField>
                                        <RowField label="Publication date">
                                            <Input type="date" {...form.register(`publications.${index}.publicationDate`)} />
                                        </RowField>
                                        <RowField label="Impact factor">
                                            <Input type="number" {...form.register(`publications.${index}.impactFactor`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Author position">
                                            <Controller
                                                control={form.control}
                                                name={`publications.${index}.authorPosition`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={publicationAuthorPositions}
                                                        placeholder="Select author position"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`publications.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        publications.append({
                                            documentId: "",
                                            title: "",
                                            journalName: "",
                                            publisher: "",
                                            publicationType: "UGC",
                                            impactFactor: 0,
                                            isbnIssn: "",
                                            doi: "",
                                            publicationDate: "",
                                            indexedIn: "",
                                            authorPosition: "First",
                                        })
                                    }
                                >
                                    Add Publication
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Books and Book Chapters" description="Faculty book records used directly for PBAS and AQAR reporting.">
                            <div className="grid gap-4">
                                {books.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Title">
                                            <Input {...form.register(`books.${index}.title`)} />
                                        </RowField>
                                        <RowField label="Publisher">
                                            <Input {...form.register(`books.${index}.publisher`)} />
                                        </RowField>
                                        <RowField label="ISBN">
                                            <Input {...form.register(`books.${index}.isbn`)} />
                                        </RowField>
                                        <RowField label="Publication date">
                                            <Input type="date" {...form.register(`books.${index}.publicationDate`)} />
                                        </RowField>
                                        <RowField label="Book type">
                                            <Controller
                                                control={form.control}
                                                name={`books.${index}.bookType`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={bookTypes}
                                                        placeholder="Select book type"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <DeleteField label={`Delete book ${index + 1}`} onClick={() => books.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`books.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        books.append({
                                            documentId: "",
                                            title: "",
                                            publisher: "",
                                            isbn: "",
                                            publicationDate: "",
                                            bookType: "Textbook",
                                        })
                                    }
                                >
                                    Add Book
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Patents and Research Projects" description="Innovation and funded project records used for PBAS Category II and CAS scoring.">
                            <div className="grid gap-4">
                                {patents.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Patent title">
                                            <Input {...form.register(`patents.${index}.title`)} />
                                        </RowField>
                                        <RowField label="Patent number">
                                            <Input {...form.register(`patents.${index}.patentNumber`)} />
                                        </RowField>
                                        <RowField label="Patent status">
                                            <Controller
                                                control={form.control}
                                                name={`patents.${index}.status`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={patentStatuses}
                                                        placeholder="Select patent status"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Filing date">
                                            <Input type="date" {...form.register(`patents.${index}.filingDate`)} />
                                        </RowField>
                                        <RowField label="Grant date">
                                            <Input type="date" {...form.register(`patents.${index}.grantDate`)} />
                                        </RowField>
                                        <DeleteField label={`Delete patent ${index + 1}`} onClick={() => patents.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`patents.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        patents.append({
                                            documentId: "",
                                            title: "",
                                            patentNumber: "",
                                            status: "Filed",
                                            filingDate: "",
                                            grantDate: "",
                                        })
                                    }
                                >
                                    Add Patent
                                </Button>

                                {researchProjects.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Project title">
                                            <Input {...form.register(`researchProjects.${index}.title`)} />
                                        </RowField>
                                        <RowField label="Funding agency">
                                            <Input {...form.register(`researchProjects.${index}.fundingAgency`)} />
                                        </RowField>
                                        <RowField label="Project type">
                                            <Controller
                                                control={form.control}
                                                name={`researchProjects.${index}.projectType`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={researchProjectTypes}
                                                        placeholder="Select project type"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Amount sanctioned">
                                            <Input type="number" {...form.register(`researchProjects.${index}.amountSanctioned`, { valueAsNumber: true })} />
                                        </RowField>
                                        <RowField label="Project status">
                                            <Controller
                                                control={form.control}
                                                name={`researchProjects.${index}.status`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={researchProjectStatuses}
                                                        placeholder="Select project status"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <DeleteField label={`Delete research project ${index + 1}`} onClick={() => researchProjects.remove(index)} />
                                        <RowField label="Start date">
                                            <Input type="date" {...form.register(`researchProjects.${index}.startDate`)} />
                                        </RowField>
                                        <RowField label="End date">
                                            <Input type="date" {...form.register(`researchProjects.${index}.endDate`)} />
                                        </RowField>
                                        <RowField label="Principal investigator">
                                            <Controller
                                                control={form.control}
                                                name={`researchProjects.${index}.principalInvestigator`}
                                                render={({ field }) => (
                                                    <CheckboxField
                                                        checked={Boolean(field.value)}
                                                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                                        label="Principal investigator"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`researchProjects.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        researchProjects.append({
                                            documentId: "",
                                            title: "",
                                            fundingAgency: "",
                                            projectType: "Minor",
                                            amountSanctioned: 0,
                                            startDate: "",
                                            endDate: "",
                                            status: "Ongoing",
                                            principalInvestigator: false,
                                        })
                                    }
                                >
                                    Add Research Project
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Conference and Event Participation" description="Conference participation records are captured on the real event participation and event schemas.">
                            <div className="grid gap-4">
                                {eventParticipations.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Event title">
                                            <Input {...form.register(`eventParticipations.${index}.title`)} />
                                        </RowField>
                                        <RowField label="Organizer">
                                            <Input {...form.register(`eventParticipations.${index}.organizer`)} />
                                        </RowField>
                                        <RowField label="Event type">
                                            <Controller
                                                control={form.control}
                                                name={`eventParticipations.${index}.eventType`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={eventTypes}
                                                        placeholder="Select event type"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Event level">
                                            <Controller
                                                control={form.control}
                                                name={`eventParticipations.${index}.level`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={eventLevels}
                                                        placeholder="Select event level"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Participation role">
                                            <Controller
                                                control={form.control}
                                                name={`eventParticipations.${index}.role`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={eventRoles}
                                                        placeholder="Select participation role"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <DeleteField label={`Delete event participation ${index + 1}`} onClick={() => eventParticipations.remove(index)} />
                                        <RowField label="Start date">
                                            <Input type="date" {...form.register(`eventParticipations.${index}.startDate`)} />
                                        </RowField>
                                        <RowField label="End date">
                                            <Input type="date" {...form.register(`eventParticipations.${index}.endDate`)} />
                                        </RowField>
                                        <RowField label="Location">
                                            <Input {...form.register(`eventParticipations.${index}.location`)} />
                                        </RowField>
                                        <RowField label="Paper title">
                                            <Input {...form.register(`eventParticipations.${index}.paperTitle`)} />
                                        </RowField>
                                        <RowField label="Paper presented">
                                            <Controller
                                                control={form.control}
                                                name={`eventParticipations.${index}.paperPresented`}
                                                render={({ field }) => (
                                                    <CheckboxField
                                                        checked={Boolean(field.value)}
                                                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                                        label="Paper presented"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Organized event">
                                            <Controller
                                                control={form.control}
                                                name={`eventParticipations.${index}.organized`}
                                                render={({ field }) => (
                                                    <CheckboxField
                                                        checked={Boolean(field.value)}
                                                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                                        label="Organized event"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`eventParticipations.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        eventParticipations.append({
                                            documentId: "",
                                            title: "",
                                            organizer: "",
                                            eventType: "Conference",
                                            level: "College",
                                            startDate: "",
                                            endDate: "",
                                            location: "",
                                            role: "Participant",
                                            paperPresented: false,
                                            paperTitle: "",
                                            organized: false,
                                        })
                                    }
                                >
                                    Add Event Participation
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Administrative Roles" description="Committee and leadership responsibilities used in PBAS and NAAC support metrics.">
                            <div className="grid gap-4">
                                {administrativeRoles.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Academic year">
                                            <Controller
                                                control={form.control}
                                                name={`administrativeRoles.${index}.academicYear`}
                                                render={({ field }) => (
                                                    <AcademicYearSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={academicYearOptions}
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Role name">
                                            <Input {...form.register(`administrativeRoles.${index}.roleName`)} />
                                        </RowField>
                                        <RowField label="Committee name">
                                            <Input {...form.register(`administrativeRoles.${index}.committeeName`)} />
                                        </RowField>
                                        <RowField label="Responsibility">
                                            <Input {...form.register(`administrativeRoles.${index}.responsibilityDescription`)} />
                                        </RowField>
                                        <DeleteField label={`Delete administrative role ${index + 1}`} onClick={() => administrativeRoles.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`administrativeRoles.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => administrativeRoles.append({ documentId: "", academicYear: "", roleName: "", committeeName: "", responsibilityDescription: "" })}>
                                    Add Administrative Role
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Institutional Contributions" description="Institution-level activities, guidance roles, and weighted contributions used in PBAS Category III.">
                            <div className="grid gap-4">
                                {institutionalContributions.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Academic year">
                                            <Controller
                                                control={form.control}
                                                name={`institutionalContributions.${index}.academicYear`}
                                                render={({ field }) => (
                                                    <AcademicYearSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={academicYearOptions}
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Activity title">
                                            <Input {...form.register(`institutionalContributions.${index}.activityTitle`)} />
                                        </RowField>
                                        <RowField label="Role">
                                            <Input {...form.register(`institutionalContributions.${index}.role`)} />
                                        </RowField>
                                        <RowField label="Impact level">
                                            <Controller
                                                control={form.control}
                                                name={`institutionalContributions.${index}.impactLevel`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={institutionalImpactLevels}
                                                        placeholder="Select impact level"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Score weightage">
                                            <Input type="number" {...form.register(`institutionalContributions.${index}.scoreWeightage`, { valueAsNumber: true })} />
                                        </RowField>
                                        <DeleteField label={`Delete institutional contribution ${index + 1}`} onClick={() => institutionalContributions.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`institutionalContributions.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        institutionalContributions.append({
                                            documentId: "",
                                            academicYear: "",
                                            activityTitle: "",
                                            role: "",
                                            impactLevel: "dept",
                                            scoreWeightage: 0,
                                        })
                                    }
                                >
                                    Add Institutional Contribution
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Faculty Development Programmes" description="Capacity-building programmes, orientation activities, and organised FDP records.">
                            <div className="grid gap-4">
                                {facultyDevelopmentProgrammes.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Programme title">
                                            <Input {...form.register(`facultyDevelopmentProgrammes.${index}.title`)} />
                                        </RowField>
                                        <RowField label="Sponsored by">
                                            <Input {...form.register(`facultyDevelopmentProgrammes.${index}.sponsoredBy`)} />
                                        </RowField>
                                        <RowField label="Programme level">
                                            <Controller
                                                control={form.control}
                                                name={`facultyDevelopmentProgrammes.${index}.level`}
                                                render={({ field }) => (
                                                    <EnumSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={facultyProgrammeLevels}
                                                        placeholder="Select programme level"
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Start date">
                                            <Input type="date" {...form.register(`facultyDevelopmentProgrammes.${index}.startDate`)} />
                                        </RowField>
                                        <RowField label="End date">
                                            <Input type="date" {...form.register(`facultyDevelopmentProgrammes.${index}.endDate`)} />
                                        </RowField>
                                        <RowField label="Participants">
                                            <Input type="number" {...form.register(`facultyDevelopmentProgrammes.${index}.participantsCount`, { valueAsNumber: true })} />
                                        </RowField>
                                        <DeleteField label={`Delete FDP ${index + 1}`} onClick={() => facultyDevelopmentProgrammes.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`facultyDevelopmentProgrammes.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => facultyDevelopmentProgrammes.append({ documentId: "", title: "", sponsoredBy: "", level: "College", startDate: "", endDate: "", participantsCount: 0 })}>
                                    Add FDP Record
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Social Extension Activities" description="Extension, outreach, and institutional social responsibility contributions.">
                            <div className="grid gap-4">
                                {socialExtensionActivities.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <RowField label="Academic year">
                                            <Controller
                                                control={form.control}
                                                name={`socialExtensionActivities.${index}.academicYear`}
                                                render={({ field }) => (
                                                    <AcademicYearSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={academicYearOptions}
                                                    />
                                                )}
                                            />
                                        </RowField>
                                        <RowField label="Programme name">
                                            <Input {...form.register(`socialExtensionActivities.${index}.programName`)} />
                                        </RowField>
                                        <RowField label="Activity name">
                                            <Input {...form.register(`socialExtensionActivities.${index}.activityName`)} />
                                        </RowField>
                                        <RowField label="Hours contributed">
                                            <Input type="number" {...form.register(`socialExtensionActivities.${index}.hoursContributed`, { valueAsNumber: true })} />
                                        </RowField>
                                        <DeleteField label={`Delete extension activity ${index + 1}`} onClick={() => socialExtensionActivities.remove(index)} />
                                        <RowField label="Evidence document">
                                            <Controller
                                                control={form.control}
                                                name={`socialExtensionActivities.${index}.documentId`}
                                                render={({ field }) => <DocumentUploadField userId={user.id} value={field.value} onChange={field.onChange} />}
                                            />
                                        </RowField>
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => socialExtensionActivities.append({ documentId: "", academicYear: "", programName: "", activityName: "", hoursContributed: 0 })}>
                                    Add Extension Activity
                                </Button>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="compliance" className="mt-6 space-y-6">
                        <SectionCard title="Accreditation Workflows" description="The faculty records on this page are the source of truth for PBAS, CAS, and AQAR. Use these workflow modules to review, verify, and submit yearly reports.">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <ActionLink title="PBAS" description="Annual performance appraisal and score claim verification." href="/faculty/pbas" />
                                <ActionLink title="CAS" description="Promotion readiness, eligibility, and committee review workflow." href="/faculty/cas" />
                                <ActionLink title="AQAR" description="Annual quality contribution submission for institutional reporting." href="/faculty/aqar" />
                            </div>
                        </SectionCard>
                    </TabsContent>
                </Tabs>

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-lg backdrop-blur">
                        <p className={cn("px-2 text-xs font-medium", form.formState.isDirty ? "text-amber-700" : "text-emerald-700")}>
                            {form.formState.isDirty ? "Unsaved changes" : "All changes saved"}
                        </p>
                        <Button type="submit" size="lg" disabled={isPending} className="min-w-[220px]">
                            {isPending ? <Spinner /> : null}
                            Save Faculty Workspace
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function KpiCard({
    title,
    value,
    description,
    icon,
    tone,
}: {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    tone: "blue" | "indigo" | "emerald" | "amber";
}) {
    const toneClasses: Record<typeof tone, string> = {
        blue: "border-sky-200 bg-sky-50 text-sky-900",
        indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
        amber: "border-amber-200 bg-amber-50 text-amber-900",
    };

    return (
        <div className={cn("rounded-2xl border p-4 shadow-sm", toneClasses[tone])}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.12em]">{title}</p>
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/80">
                    {icon}
                </span>
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs opacity-80">{description}</p>
        </div>
    );
}

function ActionCard({
    title,
    description,
    href,
    label,
    icon,
}: {
    title: string;
    description: string;
    href: string;
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="border-zinc-200/80 bg-white/85 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                        {icon}
                    </span>
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="w-full rounded-xl">
                    <Link href={href}>{label}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function ActionLink({
    title,
    description,
    href,
}: {
    title: string;
    description: string;
    href: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
            <p className="mt-1 text-xs text-zinc-600">{description}</p>
            <Button asChild variant="outline" className="mt-4 w-full bg-white">
                <Link href={href}>Open {title}</Link>
            </Button>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/25 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.16em] text-white/70">{label}</p>
            <p className="mt-2 text-sm font-semibold text-white">{value}</p>
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
    children: React.ReactNode;
}) {
    return (
        <Card className="border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-zinc-100 pb-4">
                <CardTitle className="text-[1.03rem] text-zinc-900">{title}</CardTitle>
                <CardDescription className="text-zinc-600">{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">{children}</CardContent>
        </Card>
    );
}

function Field({
    label,
    id,
    error,
    children,
}: {
    label: string;
    id: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2.5">
            <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                {label}
            </Label>
            {children}
            {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        </div>
    );
}

function CsvField({
    label,
    initialValue,
    onChange,
}: {
    label: string;
    initialValue: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-2.5">
            <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">{label}</Label>
            <Input defaultValue={initialValue} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
}

function DocumentUploadField({
    userId,
    value,
    onChange,
}: {
    userId: string;
    value?: string;
    onChange: (next: string) => void;
}) {
    const inputId = useId();
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("");

    async function handleUpload(file: File) {
        setError(null);

        try {
            validateFile(file, "evidence");
        } catch (err) {
            if (err instanceof UploadValidationError) {
                setError(err.message);
            }
            return;
        }

        setProgress({ percent: 0, bytesTransferred: 0, totalBytes: file.size });

        try {
            const result = await uploadFile(file, "evidence", userId, (next) => {
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
                document?: { _id?: string; fileName?: string };
                message?: string;
            };

            if (!response.ok || !data.document?._id) {
                throw new Error(data.message ?? "Unable to save document.");
            }

            onChange(data.document._id);
            setFileName(data.document.fileName ?? file.name);
            setProgress(null);
        } catch (err) {
            setProgress(null);
            setError(err instanceof Error ? err.message : "Document upload failed.");
        }
    }

    return (
        <div className="grid gap-2.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3">
            <Label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                Upload PDF or image
            </Label>
            <Input
                id={inputId}
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        void handleUpload(file);
                    }

                    event.target.value = "";
                }}
            />
            <input type="hidden" value={value ?? ""} onChange={() => undefined} />
            <p className="text-xs text-zinc-600">
                {fileName
                    ? `Uploaded: ${fileName}`
                    : value
                      ? "Document linked"
                      : "No document linked"}
                {progress ? ` (Uploading ${progress.percent}%)` : ""}
            </p>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
    );
}

function AcademicYearSelect({
    value,
    onChange,
    options,
}: {
    value?: string;
    onChange: (value: string) => void;
    options: string[];
}) {
    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function MultiSelectField({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: string[];
    value: string[];
    onChange: (next: string[]) => void;
    placeholder: string;
}) {
    const selected = value ?? [];

    function toggle(option: string) {
        const next = selected.includes(option)
            ? selected.filter((item) => item !== option)
            : [...selected, option];
        onChange(next);
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between bg-white text-left font-normal">
                    <span className="truncate">
                        {selected.length ? selected.join(", ") : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" align="start">
                <div className="grid max-h-60 gap-2 overflow-auto">
                    {options.map((option) => (
                        <label key={option} className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-sm">
                            <Checkbox
                                checked={selected.includes(option)}
                                onCheckedChange={() => toggle(option)}
                            />
                            <span>{option}</span>
                        </label>
                    ))}
                    {!options.length ? <p className="text-xs text-zinc-500">No options available.</p> : null}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function EnumSelect({
    value,
    onChange,
    options,
    placeholder,
}: {
    value?: string;
    onChange: (value: string) => void;
    options: readonly string[];
    placeholder: string;
}) {
    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CheckboxField({
    checked,
    onCheckedChange,
    label,
}: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
            <span>{label}</span>
        </label>
    );
}

function EditableRow({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
            {children}
        </div>
    );
}

function RowField({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`grid gap-2 ${className ?? ""}`.trim()}>
            <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">{label}</Label>
            {children}
        </div>
    );
}

function DeleteField({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <div className="flex items-end justify-end">
            <DeleteButton label={label} onClick={onClick} />
        </div>
    );
}

function DeleteButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onClick}
            aria-label={label}
        >
            <Trash2 className="size-4" />
        </Button>
    );
}
