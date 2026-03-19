"use client";

import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as XLSX from "xlsx";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    const [activeTab, setActiveTab] = useState("profile");

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

    const qualificationExcelInputId = useId();
    const [qualificationDraft, setQualificationDraft] = useState({
        level: "",
        degree: "",
        subject: "",
        institution: "",
        year: "",
    });
    const [editingQualificationIndex, setEditingQualificationIndex] = useState<number | null>(null);
    const [qualificationDraftError, setQualificationDraftError] = useState<string | null>(null);

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

    function resetQualificationDraft() {
        setQualificationDraft({
            level: "",
            degree: "",
            subject: "",
            institution: "",
            year: "",
        });
        setEditingQualificationIndex(null);
        setQualificationDraftError(null);
    }

    function saveQualificationToTable() {
        if (qualificationDraft.level.trim().length < 2 || qualificationDraft.degree.trim().length < 2) {
            setQualificationDraftError("Level and degree are required (minimum 2 characters).");
            return false;
        }

        const payload = {
            level: qualificationDraft.level.trim(),
            degree: qualificationDraft.degree.trim(),
            subject: qualificationDraft.subject.trim(),
            institution: qualificationDraft.institution.trim(),
            year: qualificationDraft.year.trim(),
        };

        if (editingQualificationIndex !== null) {
            qualifications.update(editingQualificationIndex, payload);
        } else {
            qualifications.append(payload);
        }

        resetQualificationDraft();
        return true;
    }

    function handleTabChange(nextTab: string) {
        const hasDraftContent = Object.values(qualificationDraft).some((value) => value.trim().length > 0);
        if (activeTab === "profile" && nextTab !== "profile" && hasDraftContent) {
            const saved = saveQualificationToTable();
            if (!saved) {
                return;
            }
        }

        setActiveTab(nextTab);
    }

    function editQualificationFromTable(index: number) {
        const selected = form.getValues(`qualifications.${index}`);
        if (!selected) return;

        setQualificationDraft({
            level: selected.level ?? "",
            degree: selected.degree ?? "",
            subject: selected.subject ?? "",
            institution: selected.institution ?? "",
            year: selected.year ?? "",
        });
        setEditingQualificationIndex(index);
        setQualificationDraftError(null);
    }

    function normalizeQualificationHeader(header: string) {
        return header.trim().toLowerCase().replace(/\s+/g, "_");
    }

    async function handleQualificationExcelUpload(file: File) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const firstSheet = workbook.SheetNames[0];

        if (!firstSheet) {
            setQualificationDraftError("Excel file does not contain any sheet.");
            return;
        }

        const worksheet = workbook.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: "",
        });

        if (!rows.length) {
            setQualificationDraftError("Excel file must include at least one data row.");
            return;
        }

        const parsedRows = rows.map((row) => {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([key, value]) => [normalizeQualificationHeader(key), value])
            );

            return {
                level: String(normalized.level ?? "").trim(),
                degree: String(normalized.degree ?? "").trim(),
                subject: String(normalized.subject ?? "").trim(),
                institution: String(normalized.institution ?? normalized.university ?? "").trim(),
                year: String(normalized.year ?? "").trim(),
            };
        });

        const validRows = parsedRows.filter(
            (row) => row.level.length >= 2 && row.degree.length >= 2
        );

        if (!validRows.length) {
            setQualificationDraftError("No valid rows found. Ensure level and degree are provided.");
            return;
        }

        qualifications.replace(validRows);
        resetQualificationDraft();
    }

    function downloadQualificationExcel() {
        const rows = qualifications.fields.map((row) => ({
            level: row.level ?? "",
            degree: row.degree ?? "",
            subject: row.subject ?? "",
            institution: row.institution ?? "",
            year: row.year ?? "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{
            level: "",
            degree: "",
            subject: "",
            institution: "",
            year: "",
        }]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Qualifications");
        XLSX.writeFile(workbook, "faculty-qualifications.xlsx");
    }

    function downloadQualificationTemplateExcel() {
        const workbook = XLSX.utils.book_new();
        const templateRows = [
            {
                level: "Ph.D",
                degree: "Ph.D Computer Science",
                subject: "Computer Science",
                institution: "IIT Bombay",
                year: "2019",
            },
        ];

        const templateSheet = XLSX.utils.json_to_sheet(templateRows, {
            header: ["level", "degree", "subject", "institution", "year"],
        });
        const instructionsSheet = XLSX.utils.aoa_to_sheet([
            ["Faculty Qualification Upload Template"],
            ["Required columns: level, degree"],
            ["Optional columns: subject, institution, year"],
            ["Accepts .xlsx and .xls files"],
        ]);

        XLSX.utils.book_append_sheet(workbook, templateSheet, "Template");
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
        XLSX.writeFile(workbook, "faculty-qualifications-template.xlsx");
    }

    // Kept for Turbopack HMR compatibility when older handler references remain hot-loaded.
    function downloadQualificationCsv() {
        downloadQualificationExcel();
    }

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

    const selectedAcademicYear = academicYearOptions[0] ?? "Academic Year";

    return (
        <div className="space-y-6 pb-20">
            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Institutional Dashboard</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Faculty Workspace</h1>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            {selectedAcademicYear}
                        </Badge>
                        <Button type="button" variant="outline" size="sm">
                            Export Dossier
                        </Button>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
                    <Info label="Faculty Name" value={user.name} />
                    <Info label="Designation" value={user.designation ?? "-"} />
                    <Info label="Department" value={user.department ?? "-"} />
                    <Info label="College" value={user.collegeName ?? "-"} />
                    <Info label="University" value={user.universityName ?? "-"} />
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 p-5">
                        <ProfilePhotoUpload userId={user.id} currentPhotoURL={user.photoURL} />
                        <div className="space-y-1 text-center">
                            <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                            <p className="text-sm text-slate-500">Profile completion: {completion.profileScore}%</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-3 md:grid-cols-2">
                    <ActionCard
                        title="PBAS Module"
                        description="Performance Based Appraisal System for faculty promotion criteria."
                        href="/faculty/pbas"
                        label="Open Module"
                        icon={<LucideIcons.Sparkles className="size-4" />}
                    />
                    <ActionCard
                        title="CAS Module"
                        description="Career Advancement Scheme portal documentation and verification."
                        href="/faculty/cas"
                        label="Access CAS"
                        icon={<LucideIcons.ShieldCheck className="size-4" />}
                    />
                    <ActionCard
                        title="AQAR Module"
                        description="Annual Quality Assurance Report data entry for institutional NAAC."
                        href="/faculty/aqar"
                        label="Enter Data"
                        icon={<LucideIcons.FileCheck2 className="size-4" />}
                    />
                    <ActionCard
                        title="Faculty Records"
                        description="Centralized repository for all certified academic documents."
                        href="/faculty/profile"
                        label="View Records"
                        icon={<LucideIcons.BookOpenText className="size-4" />}
                    />
                </div>
            </div>

            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <div className="w-full">
                        <TabsList className="grid h-auto w-full grid-cols-2 lg:grid-cols-4">
                            <TabsTrigger value="profile">
                            Profile
                            </TabsTrigger>
                            <TabsTrigger value="teaching">
                            Teaching
                            </TabsTrigger>
                            <TabsTrigger value="activities">
                            Academic Activities
                            </TabsTrigger>
                            <TabsTrigger value="compliance">
                            Compliance
                            </TabsTrigger>
                        </TabsList>
                    </div>

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
                                <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-5">
                                    <Field label="Level" id="qualificationLevel">
                                        <Input
                                            id="qualificationLevel"
                                            value={qualificationDraft.level}
                                            onChange={(event) =>
                                                setQualificationDraft((prev) => ({ ...prev, level: event.target.value }))
                                            }
                                        />
                                    </Field>
                                    <Field label="Degree" id="qualificationDegree">
                                        <Input
                                            id="qualificationDegree"
                                            value={qualificationDraft.degree}
                                            onChange={(event) =>
                                                setQualificationDraft((prev) => ({ ...prev, degree: event.target.value }))
                                            }
                                        />
                                    </Field>
                                    <Field label="Subject" id="qualificationSubject">
                                        <Input
                                            id="qualificationSubject"
                                            value={qualificationDraft.subject}
                                            onChange={(event) =>
                                                setQualificationDraft((prev) => ({ ...prev, subject: event.target.value }))
                                            }
                                        />
                                    </Field>
                                    <Field label="Institution" id="qualificationInstitution">
                                        <Input
                                            id="qualificationInstitution"
                                            value={qualificationDraft.institution}
                                            onChange={(event) =>
                                                setQualificationDraft((prev) => ({ ...prev, institution: event.target.value }))
                                            }
                                        />
                                    </Field>
                                    <Field label="Year" id="qualificationYear">
                                        <Input
                                            id="qualificationYear"
                                            value={qualificationDraft.year}
                                            onChange={(event) =>
                                                setQualificationDraft((prev) => ({ ...prev, year: event.target.value }))
                                            }
                                        />
                                    </Field>
                                </div>

                                {qualificationDraftError ? (
                                    <p className="text-sm text-destructive">{qualificationDraftError}</p>
                                ) : null}

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button type="button" onClick={saveQualificationToTable}>
                                        <LucideIcons.Save className="mr-1 size-4" />
                                        {editingQualificationIndex !== null ? "Update in Table" : "Save to Table"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={resetQualificationDraft}>
                                        Clear Form
                                    </Button>
                                    <Button type="button" variant="outline" onClick={downloadQualificationCsv}>
                                        <LucideIcons.Download className="mr-1 size-4" />
                                        Download Excel
                                    </Button>
                                    <Button type="button" variant="outline" onClick={downloadQualificationTemplateExcel}>
                                        <LucideIcons.FileSpreadsheet className="mr-1 size-4" />
                                        Download Template
                                    </Button>
                                    <input
                                        id={qualificationExcelInputId}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                void handleQualificationExcelUpload(file);
                                            }
                                            event.target.value = "";
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById(qualificationExcelInputId)?.click()}
                                    >
                                        <LucideIcons.Upload className="mr-1 size-4" />
                                        Bulk Upload Excel
                                    </Button>
                                </div>

                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Level</TableHead>
                                                <TableHead>Degree</TableHead>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Institution</TableHead>
                                                <TableHead>Year</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {qualifications.fields.length ? (
                                                qualifications.fields.map((field, index) => (
                                                    <TableRow key={field.id}>
                                                        <TableCell>{field.level || "-"}</TableCell>
                                                        <TableCell>{field.degree || "-"}</TableCell>
                                                        <TableCell>{field.subject || "-"}</TableCell>
                                                        <TableCell>{field.institution || "-"}</TableCell>
                                                        <TableCell>{field.year || "-"}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon-sm"
                                                                    onClick={() => editQualificationFromTable(index)}
                                                                    aria-label={`Edit qualification ${index + 1}`}
                                                                >
                                                                    <LucideIcons.Pencil className="size-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={() => {
                                                                        qualifications.remove(index);
                                                                        if (editingQualificationIndex === index) {
                                                                            resetQualificationDraft();
                                                                        }
                                                                    }}
                                                                    aria-label={`Delete qualification ${index + 1}`}
                                                                >
                                                                    <LucideIcons.Trash2 className="size-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                        No qualification entries yet. Fill the form above and click Save to Table.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
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

                <div className="sticky bottom-4 z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
                        <p className="text-xs text-slate-500">
                            Last autosaved at 14:32 PM
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={isPending}
                                onClick={() => form.reset()}
                            >
                                Discard Changes
                            </Button>
                            <Button type="submit" size="lg" disabled={isPending} className="min-w-[220px]">
                                {isPending ? <Spinner /> : null}
                                Save Faculty Workspace
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
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
        <Card>
            <CardContent className="flex h-full items-start gap-3 p-4">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        {icon}
                </span>
                <div className="space-y-2">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                    <Button asChild variant="link" size="sm" className="h-auto p-0">
                        <Link href={href}>{label} -&gt;</Link>
                    </Button>
                </div>
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
            <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={href}>Open {title}</Link>
            </Button>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-1.5 truncate text-base font-semibold text-slate-900">{value}</p>
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
        <Card>
            <CardHeader>
                <div className="flex flex-row items-center justify-between gap-3">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <Button type="button" variant="link" size="sm">
                        Edit Section
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
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
            <Label htmlFor={id}>{label}</Label>
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
            <Label>{label}</Label>
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
            <Label htmlFor={inputId}>
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
            <SelectTrigger className="w-full">
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
                <Button type="button" variant="outline" className="w-full justify-between text-left font-normal">
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
            <SelectTrigger className="w-full">
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
            <LucideIcons.Trash2 className="size-4" />
        </Button>
    );
}
