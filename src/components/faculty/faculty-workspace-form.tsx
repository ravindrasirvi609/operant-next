"use client";

import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as XLSX from "xlsx";
import type { z } from "zod";

import { FormMessage } from "@/components/auth/auth-helpers";
import { ProfilePhotoUpload } from "@/components/faculty/profile-photo-upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
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
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");
    const [isExportDialogOpen, setExportDialogOpen] = useState(false);
    const didInitAutoSave = useRef(false);
    const lastAutoSaveAttemptKey = useRef("");
    const suppressedAutoSaveKey = useRef("");

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
    const teachingSummaryExcelInputId = useId();
    const teachingLoadExcelInputId = useId();
    const resultSummaryExcelInputId = useId();
    const publicationsExcelInputId = useId();
    const booksExcelInputId = useId();
    const patentsExcelInputId = useId();
    const researchProjectsExcelInputId = useId();
    const eventsExcelInputId = useId();
    const adminRolesExcelInputId = useId();
    const institutionalExcelInputId = useId();
    const fdpExcelInputId = useId();
    const socialExtensionExcelInputId = useId();
    const [qualificationDraft, setQualificationDraft] = useState({
        level: "",
        degree: "",
        subject: "",
        institution: "",
        year: "",
    });
    const [editingQualificationIndex, setEditingQualificationIndex] = useState<number | null>(null);
    const [qualificationDraftError, setQualificationDraftError] = useState<string | null>(null);
    const [teachingSummaryDraft, setTeachingSummaryDraft] = useState({
        academicYear: "",
        classesTaken: "0",
        coursePreparationHours: "0",
        coursesTaught: [] as string[],
        mentoringCount: "0",
        labSupervisionCount: "0",
        feedbackSummary: "",
    });
    const [editingTeachingSummaryIndex, setEditingTeachingSummaryIndex] = useState<number | null>(null);
    const [teachingSummaryDraftError, setTeachingSummaryDraftError] = useState<string | null>(null);
    const [teachingLoadDraft, setTeachingLoadDraft] = useState({
        academicYear: "",
        programName: "",
        courseName: "",
        semester: "1",
        subjectCode: "",
        lectureHours: "0",
        tutorialHours: "0",
        practicalHours: "0",
        innovativePedagogy: "",
    });
    const [editingTeachingLoadIndex, setEditingTeachingLoadIndex] = useState<number | null>(null);
    const [teachingLoadDraftError, setTeachingLoadDraftError] = useState<string | null>(null);
    const [resultSummaryDraft, setResultSummaryDraft] = useState({
        academicYear: "",
        subjectName: "",
        appearedStudents: "0",
        passedStudents: "0",
        universityRankStudents: "0",
    });
    const [editingResultSummaryIndex, setEditingResultSummaryIndex] = useState<number | null>(null);
    const [resultSummaryDraftError, setResultSummaryDraftError] = useState<string | null>(null);
    const [activitiesBulkError, setActivitiesBulkError] = useState<string | null>(null);

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
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
        return true;
    }

    function hasQualificationDraftContent() {
        return Object.values(qualificationDraft).some((value) => value.trim().length > 0);
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
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
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

    function resetTeachingSummaryDraft() {
        setTeachingSummaryDraft({
            academicYear: "",
            classesTaken: "0",
            coursePreparationHours: "0",
            coursesTaught: [],
            mentoringCount: "0",
            labSupervisionCount: "0",
            feedbackSummary: "",
        });
        setEditingTeachingSummaryIndex(null);
        setTeachingSummaryDraftError(null);
    }

    function saveTeachingSummaryToTable() {
        if (!teachingSummaryDraft.academicYear.trim()) {
            setTeachingSummaryDraftError("Academic year is required.");
            return false;
        }

        const payload = {
            documentId: "",
            academicYear: teachingSummaryDraft.academicYear.trim(),
            classesTaken: Number(teachingSummaryDraft.classesTaken || 0),
            coursePreparationHours: Number(teachingSummaryDraft.coursePreparationHours || 0),
            coursesTaught: teachingSummaryDraft.coursesTaught,
            mentoringCount: Number(teachingSummaryDraft.mentoringCount || 0),
            labSupervisionCount: Number(teachingSummaryDraft.labSupervisionCount || 0),
            feedbackSummary: teachingSummaryDraft.feedbackSummary.trim(),
        };

        if (editingTeachingSummaryIndex !== null) {
            teachingSummaries.update(editingTeachingSummaryIndex, payload);
        } else {
            teachingSummaries.append(payload);
        }

        resetTeachingSummaryDraft();
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
        return true;
    }

    function editTeachingSummaryFromTable(index: number) {
        const selected = form.getValues(`teachingSummaries.${index}`);
        if (!selected) return;

        setTeachingSummaryDraft({
            academicYear: selected.academicYear ?? "",
            classesTaken: String(selected.classesTaken ?? 0),
            coursePreparationHours: String(selected.coursePreparationHours ?? 0),
            coursesTaught: selected.coursesTaught ?? [],
            mentoringCount: String(selected.mentoringCount ?? 0),
            labSupervisionCount: String(selected.labSupervisionCount ?? 0),
            feedbackSummary: selected.feedbackSummary ?? "",
        });
        setEditingTeachingSummaryIndex(index);
        setTeachingSummaryDraftError(null);
    }

    function resetTeachingLoadDraft() {
        setTeachingLoadDraft({
            academicYear: "",
            programName: "",
            courseName: "",
            semester: "1",
            subjectCode: "",
            lectureHours: "0",
            tutorialHours: "0",
            practicalHours: "0",
            innovativePedagogy: "",
        });
        setEditingTeachingLoadIndex(null);
        setTeachingLoadDraftError(null);
    }

    function saveTeachingLoadToTable() {
        if (!teachingLoadDraft.academicYear.trim() || !teachingLoadDraft.programName.trim() || !teachingLoadDraft.courseName.trim()) {
            setTeachingLoadDraftError("Academic year, program, and course are required.");
            return false;
        }

        const payload = {
            documentId: "",
            courseId: "",
            academicYear: teachingLoadDraft.academicYear.trim(),
            programName: teachingLoadDraft.programName.trim(),
            courseName: teachingLoadDraft.courseName.trim(),
            semester: Number(teachingLoadDraft.semester || 1),
            subjectCode: teachingLoadDraft.subjectCode.trim(),
            lectureHours: Number(teachingLoadDraft.lectureHours || 0),
            tutorialHours: Number(teachingLoadDraft.tutorialHours || 0),
            practicalHours: Number(teachingLoadDraft.practicalHours || 0),
            innovativePedagogy: teachingLoadDraft.innovativePedagogy.trim(),
        };

        if (editingTeachingLoadIndex !== null) {
            teachingLoads.update(editingTeachingLoadIndex, payload);
        } else {
            teachingLoads.append(payload);
        }

        resetTeachingLoadDraft();
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
        return true;
    }

    function editTeachingLoadFromTable(index: number) {
        const selected = form.getValues(`teachingLoads.${index}`);
        if (!selected) return;

        setTeachingLoadDraft({
            academicYear: selected.academicYear ?? "",
            programName: selected.programName ?? "",
            courseName: selected.courseName ?? "",
            semester: String(selected.semester ?? 1),
            subjectCode: selected.subjectCode ?? "",
            lectureHours: String(selected.lectureHours ?? 0),
            tutorialHours: String(selected.tutorialHours ?? 0),
            practicalHours: String(selected.practicalHours ?? 0),
            innovativePedagogy: selected.innovativePedagogy ?? "",
        });
        setEditingTeachingLoadIndex(index);
        setTeachingLoadDraftError(null);
    }

    function resetResultSummaryDraft() {
        setResultSummaryDraft({
            academicYear: "",
            subjectName: "",
            appearedStudents: "0",
            passedStudents: "0",
            universityRankStudents: "0",
        });
        setEditingResultSummaryIndex(null);
        setResultSummaryDraftError(null);
    }

    function saveResultSummaryToTable() {
        if (!resultSummaryDraft.academicYear.trim() || !resultSummaryDraft.subjectName.trim()) {
            setResultSummaryDraftError("Academic year and subject are required.");
            return false;
        }

        const payload = {
            documentId: "",
            academicYear: resultSummaryDraft.academicYear.trim(),
            subjectName: resultSummaryDraft.subjectName.trim(),
            appearedStudents: Number(resultSummaryDraft.appearedStudents || 0),
            passedStudents: Number(resultSummaryDraft.passedStudents || 0),
            universityRankStudents: Number(resultSummaryDraft.universityRankStudents || 0),
        };

        if (editingResultSummaryIndex !== null) {
            resultSummaries.update(editingResultSummaryIndex, payload);
        } else {
            resultSummaries.append(payload);
        }

        resetResultSummaryDraft();
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
        return true;
    }

    function editResultSummaryFromTable(index: number) {
        const selected = form.getValues(`resultSummaries.${index}`);
        if (!selected) return;

        setResultSummaryDraft({
            academicYear: selected.academicYear ?? "",
            subjectName: selected.subjectName ?? "",
            appearedStudents: String(selected.appearedStudents ?? 0),
            passedStudents: String(selected.passedStudents ?? 0),
            universityRankStudents: String(selected.universityRankStudents ?? 0),
        });
        setEditingResultSummaryIndex(index);
        setResultSummaryDraftError(null);
    }

    async function handleTeachingSummaryExcelUpload(file: File) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) {
            setTeachingSummaryDraftError("Excel file does not contain any sheet.");
            return;
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
        const parsedRows = rows.map((row) => {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([key, value]) => [normalizeQualificationHeader(key), value])
            );

            return {
                documentId: "",
                academicYear: String(normalized.academic_year ?? normalized.academicyear ?? "").trim(),
                classesTaken: Number(normalized.classes_taken ?? normalized.classestaken ?? 0),
                coursePreparationHours: Number(normalized.course_preparation_hours ?? normalized.coursepreparationhours ?? 0),
                coursesTaught: String(normalized.courses_taught ?? normalized.coursestaught ?? "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                mentoringCount: Number(normalized.mentoring_count ?? normalized.mentoringcount ?? 0),
                labSupervisionCount: Number(normalized.lab_supervision_count ?? normalized.labsupervisioncount ?? 0),
                feedbackSummary: String(normalized.feedback_summary ?? normalized.feedbacksummary ?? "").trim(),
            };
        }).filter((row) => row.academicYear.length >= 4);

        if (!parsedRows.length) {
            setTeachingSummaryDraftError("No valid rows found for teaching summary.");
            return;
        }

        teachingSummaries.replace(parsedRows);
        resetTeachingSummaryDraft();
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
    }

    function downloadTeachingSummaryExcel() {
        const rows = teachingSummaries.fields.map((row) => ({
            academic_year: row.academicYear ?? "",
            classes_taken: row.classesTaken ?? 0,
            course_preparation_hours: row.coursePreparationHours ?? 0,
            courses_taught: (row.coursesTaught ?? []).join(", "),
            mentoring_count: row.mentoringCount ?? 0,
            lab_supervision_count: row.labSupervisionCount ?? 0,
            feedback_summary: row.feedbackSummary ?? "",
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "TeachingSummary");
        XLSX.writeFile(workbook, "teaching-summary.xlsx");
    }

    function downloadTeachingSummaryTemplateExcel() {
        const workbook = XLSX.utils.book_new();
        const template = XLSX.utils.json_to_sheet([
            {
                academic_year: "2023-2024",
                classes_taken: 120,
                course_preparation_hours: 85,
                courses_taught: "DSA, Operating Systems",
                mentoring_count: 20,
                lab_supervision_count: 12,
                feedback_summary: "Strong student outcomes",
            },
        ]);
        XLSX.utils.book_append_sheet(workbook, template, "Template");
        XLSX.writeFile(workbook, "teaching-summary-template.xlsx");
    }

    async function handleTeachingLoadExcelUpload(file: File) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) {
            setTeachingLoadDraftError("Excel file does not contain any sheet.");
            return;
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
        const parsedRows = rows.map((row) => {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([key, value]) => [normalizeQualificationHeader(key), value])
            );

            return {
                documentId: "",
                courseId: "",
                academicYear: String(normalized.academic_year ?? normalized.academicyear ?? "").trim(),
                programName: String(normalized.program_name ?? normalized.programname ?? "").trim(),
                courseName: String(normalized.course_name ?? normalized.coursename ?? "").trim(),
                semester: Number(normalized.semester ?? 1),
                subjectCode: String(normalized.subject_code ?? normalized.subjectcode ?? "").trim(),
                lectureHours: Number(normalized.lecture_hours ?? normalized.lecturehours ?? 0),
                tutorialHours: Number(normalized.tutorial_hours ?? normalized.tutorialhours ?? 0),
                practicalHours: Number(normalized.practical_hours ?? normalized.practicalhours ?? 0),
                innovativePedagogy: String(normalized.innovative_pedagogy ?? normalized.innovativepedagogy ?? "").trim(),
            };
        }).filter((row) => row.academicYear.length >= 4 && row.programName.length >= 2 && row.courseName.length >= 2);

        if (!parsedRows.length) {
            setTeachingLoadDraftError("No valid rows found for teaching load.");
            return;
        }

        teachingLoads.replace(parsedRows);
        resetTeachingLoadDraft();
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
    }

    function downloadTeachingLoadExcel() {
        const rows = teachingLoads.fields.map((row) => ({
            academic_year: row.academicYear ?? "",
            program_name: row.programName ?? "",
            course_name: row.courseName ?? "",
            semester: row.semester ?? 1,
            subject_code: row.subjectCode ?? "",
            lecture_hours: row.lectureHours ?? 0,
            tutorial_hours: row.tutorialHours ?? 0,
            practical_hours: row.practicalHours ?? 0,
            innovative_pedagogy: row.innovativePedagogy ?? "",
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "TeachingLoad");
        XLSX.writeFile(workbook, "teaching-load.xlsx");
    }

    function downloadTeachingLoadTemplateExcel() {
        const workbook = XLSX.utils.book_new();
        const template = XLSX.utils.json_to_sheet([
            {
                academic_year: "2023-2024",
                program_name: "B.Tech CSE",
                course_name: "Operating Systems",
                semester: 5,
                subject_code: "CS501",
                lecture_hours: 45,
                tutorial_hours: 15,
                practical_hours: 30,
                innovative_pedagogy: "Case-based learning",
            },
        ]);
        XLSX.utils.book_append_sheet(workbook, template, "Template");
        XLSX.writeFile(workbook, "teaching-load-template.xlsx");
    }

    async function handleResultSummaryExcelUpload(file: File) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) {
            setResultSummaryDraftError("Excel file does not contain any sheet.");
            return;
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
        const parsedRows = rows.map((row) => {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([key, value]) => [normalizeQualificationHeader(key), value])
            );

            return {
                documentId: "",
                academicYear: String(normalized.academic_year ?? normalized.academicyear ?? "").trim(),
                subjectName: String(normalized.subject_name ?? normalized.subjectname ?? "").trim(),
                appearedStudents: Number(normalized.appeared_students ?? normalized.appearedstudents ?? 0),
                passedStudents: Number(normalized.passed_students ?? normalized.passedstudents ?? 0),
                universityRankStudents: Number(normalized.university_rank_students ?? normalized.universityrankstudents ?? 0),
            };
        }).filter((row) => row.academicYear.length >= 4 && row.subjectName.length >= 2);

        if (!parsedRows.length) {
            setResultSummaryDraftError("No valid rows found for result summary.");
            return;
        }

        resultSummaries.replace(parsedRows);
        resetResultSummaryDraft();
        queueMicrotask(() => {
            void form.handleSubmit(handleSubmitForm)();
        });
    }

    function downloadResultSummaryExcel() {
        const rows = resultSummaries.fields.map((row) => ({
            academic_year: row.academicYear ?? "",
            subject_name: row.subjectName ?? "",
            appeared_students: row.appearedStudents ?? 0,
            passed_students: row.passedStudents ?? 0,
            university_rank_students: row.universityRankStudents ?? 0,
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "ResultSummary");
        XLSX.writeFile(workbook, "result-summary.xlsx");
    }

    function downloadResultSummaryTemplateExcel() {
        const workbook = XLSX.utils.book_new();
        const template = XLSX.utils.json_to_sheet([
            {
                academic_year: "2023-2024",
                subject_name: "Operating Systems",
                appeared_students: 120,
                passed_students: 114,
                university_rank_students: 2,
            },
        ]);
        XLSX.utils.book_append_sheet(workbook, template, "Template");
        XLSX.writeFile(workbook, "result-summary-template.xlsx");
    }

    function normalizeRowKeys(row: Record<string, unknown>) {
        return Object.fromEntries(
            Object.entries(row).map(([key, value]) => [normalizeQualificationHeader(key), value])
        );
    }

    function asNumber(value: unknown, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function asBoolean(value: unknown) {
        if (typeof value === "boolean") return value;
        const normalized = String(value ?? "").trim().toLowerCase();
        return normalized === "true" || normalized === "yes" || normalized === "1";
    }

    async function uploadSectionExcel<T>(
        file: File,
        mapper: (row: Record<string, unknown>) => T,
        validator: (row: T) => boolean,
        replaceRows: (rows: T[]) => void,
        errorText: string
    ) {
        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!worksheet) {
                setActivitiesBulkError("Excel file does not contain any sheet.");
                return;
            }

            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
            const parsed = rows
                .map((row) => normalizeRowKeys(row))
                .map((row) => mapper(row))
                .filter(validator);

            if (!parsed.length) {
                setActivitiesBulkError(errorText);
                return;
            }

            replaceRows(parsed);
            setActivitiesBulkError(null);
            queueMicrotask(() => {
                void form.handleSubmit(handleSubmitForm)();
            });
        } catch {
            setActivitiesBulkError("Could not process Excel file. Please use the provided template.");
        }
    }

    function downloadSectionExcel<T extends Record<string, unknown>>(rows: T[], sheetName: string, fileName: string) {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
        XLSX.writeFile(workbook, fileName);
    }

    function downloadSectionTemplateExcel<T extends Record<string, unknown>>(sample: T, sheetName: string, fileName: string) {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([sample]), sheetName);
        XLSX.writeFile(workbook, fileName);
    }

    function hasTeachingDraftContent() {
        return (
            teachingSummaryDraft.academicYear.trim().length > 0 ||
            teachingLoadDraft.academicYear.trim().length > 0 ||
            resultSummaryDraft.academicYear.trim().length > 0
        );
    }

    function handleTabChange(nextTab: string) {
        if (activeTab === "profile" && nextTab !== "profile" && hasQualificationDraftContent()) {
            const saved = saveQualificationToTable();
            if (!saved) return;
        }

        if (activeTab === "teaching" && nextTab !== "teaching" && hasTeachingDraftContent()) {
            if (teachingSummaryDraft.academicYear.trim().length > 0 && !saveTeachingSummaryToTable()) return;
            if (teachingLoadDraft.academicYear.trim().length > 0 && !saveTeachingLoadToTable()) return;
            if (resultSummaryDraft.academicYear.trim().length > 0 && !saveResultSummaryToTable()) return;
        }

        setActiveTab(nextTab);
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

    const submit = useCallback(async (values: FacultyWorkspaceResolvedValues, context?: { autoSaveKey?: string }) => {
        setMessage(null);
        setIsSaving(true);

        try {
            const response = await fetch("/api/faculty/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                if (context?.autoSaveKey) {
                    suppressedAutoSaveKey.current = context.autoSaveKey;
                }
                setMessage({ type: "error", text: data.message ?? "Unable to save faculty workspace." });
                return;
            }

            suppressedAutoSaveKey.current = "";
            setMessage({ type: "success", text: data.message ?? "Faculty workspace saved." });
            form.reset(values);
        } finally {
            setIsSaving(false);
        }
    }, [form]);

    const handleSubmitForm = useCallback((values: FacultyWorkspaceResolvedValues) => {
        void submit(values);
    }, [submit]);

    useEffect(() => {
        if (!didInitAutoSave.current) {
            didInitAutoSave.current = true;
            lastAutoSaveAttemptKey.current = JSON.stringify(watchedValues);
            return;
        }

        if (!form.formState.isDirty || isSaving) {
            return;
        }

        const autoSaveKey = JSON.stringify(watchedValues);

        if (
            autoSaveKey === lastAutoSaveAttemptKey.current ||
            autoSaveKey === suppressedAutoSaveKey.current
        ) {
            return;
        }

        const timeout = window.setTimeout(() => {
            lastAutoSaveAttemptKey.current = autoSaveKey;
            void form.handleSubmit((values) => submit(values, { autoSaveKey }))();
        }, 1400);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [watchedValues, form.formState.isDirty, isSaving, form, submit]);

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
                                <Dialog open={isExportDialogOpen} onOpenChange={setExportDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            Export Dossier
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>Export Dossier</DialogTitle>
                                            <DialogDescription>
                                                Download your saved section files. If you have drafts, jump to the relevant
                                                tab and click <span className="font-medium">Save to Table</span> first.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <Alert>
                                            <AlertTitle>Pro tip</AlertTitle>
                                            <AlertDescription>
                                                Use the quick tab jumps below to auto-save drafts when needed.
                                            </AlertDescription>
                                        </Alert>

                                        <Separator />

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    handleTabChange("profile");
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Jump to Profile
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    handleTabChange("teaching");
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Jump to Teaching
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    handleTabChange("activities");
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Jump to Activities
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    handleTabChange("compliance");
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Jump to Compliance
                                            </Button>
                                        </div>

                                        <Separator />

                                        <div className="grid gap-2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                    downloadQualificationExcel();
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Download Identity & Qualification (Excel)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                    downloadTeachingSummaryExcel();
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Download Teaching Summary (Excel)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                    downloadTeachingLoadExcel();
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Download Teaching Load (Excel)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                    downloadResultSummaryExcel();
                                                    setExportDialogOpen(false);
                                                }}
                                            >
                                                Download Result Summary (Excel)
                                            </Button>
                                        </div>

                                        <DialogFooter>
                                            <Button type="button" variant="ghost" onClick={() => setExportDialogOpen(false)}>
                                                Close
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
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

            <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
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
                                <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-4">
                                    <Field label="Academic year" id="teachingSummaryAcademicYear">
                                        <AcademicYearSelect
                                            value={teachingSummaryDraft.academicYear}
                                            onChange={(value) => setTeachingSummaryDraft((prev) => ({ ...prev, academicYear: value }))}
                                            options={academicYearOptions}
                                        />
                                    </Field>
                                    <Field label="Classes taken" id="teachingSummaryClassesTaken">
                                        <Input
                                            id="teachingSummaryClassesTaken"
                                            type="number"
                                            min={0}
                                            value={teachingSummaryDraft.classesTaken}
                                            onChange={(event) => setTeachingSummaryDraft((prev) => ({ ...prev, classesTaken: event.target.value }))}
                                        />
                                    </Field>
                                    <Field label="Course prep hours" id="teachingSummaryCoursePrep">
                                        <Input
                                            id="teachingSummaryCoursePrep"
                                            type="number"
                                            min={0}
                                            value={teachingSummaryDraft.coursePreparationHours}
                                            onChange={(event) => setTeachingSummaryDraft((prev) => ({ ...prev, coursePreparationHours: event.target.value }))}
                                        />
                                    </Field>
                                    <Field label="Mentoring count" id="teachingSummaryMentoring">
                                        <Input
                                            id="teachingSummaryMentoring"
                                            type="number"
                                            min={0}
                                            value={teachingSummaryDraft.mentoringCount}
                                            onChange={(event) => setTeachingSummaryDraft((prev) => ({ ...prev, mentoringCount: event.target.value }))}
                                        />
                                    </Field>
                                    <Field label="Lab supervision count" id="teachingSummaryLabSupervision">
                                        <Input
                                            id="teachingSummaryLabSupervision"
                                            type="number"
                                            min={0}
                                            value={teachingSummaryDraft.labSupervisionCount}
                                            onChange={(event) => setTeachingSummaryDraft((prev) => ({ ...prev, labSupervisionCount: event.target.value }))}
                                        />
                                    </Field>
                                    <Field label="Courses taught" id="teachingSummaryCoursesTaught" >
                                        <MultiSelectField
                                            options={uniqueCourseOptions}
                                            value={teachingSummaryDraft.coursesTaught}
                                            onChange={(next) => setTeachingSummaryDraft((prev) => ({ ...prev, coursesTaught: next }))}
                                            placeholder="Select courses taught"
                                        />
                                    </Field>
                                    <Field label="Feedback summary" id="teachingSummaryFeedback" >
                                        <Textarea
                                            id="teachingSummaryFeedback"
                                            value={teachingSummaryDraft.feedbackSummary}
                                            onChange={(event) => setTeachingSummaryDraft((prev) => ({ ...prev, feedbackSummary: event.target.value }))}
                                        />
                                    </Field>
                                </div>

                                {teachingSummaryDraftError ? <p className="text-sm text-destructive">{teachingSummaryDraftError}</p> : null}

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button type="button" onClick={saveTeachingSummaryToTable}>
                                        <LucideIcons.Save className="mr-1 size-4" />
                                        {editingTeachingSummaryIndex !== null ? "Update in Table" : "Save to Table"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={resetTeachingSummaryDraft}>Clear Form</Button>
                                    <Button type="button" variant="outline" onClick={downloadTeachingSummaryExcel}>
                                        <LucideIcons.Download className="mr-1 size-4" />
                                        Download Excel
                                    </Button>
                                    <Button type="button" variant="outline" onClick={downloadTeachingSummaryTemplateExcel}>
                                        <LucideIcons.FileSpreadsheet className="mr-1 size-4" />
                                        Download Template
                                    </Button>
                                    <input
                                        id={teachingSummaryExcelInputId}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) void handleTeachingSummaryExcelUpload(file);
                                            event.target.value = "";
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={() => document.getElementById(teachingSummaryExcelInputId)?.click()}>
                                        <LucideIcons.Upload className="mr-1 size-4" />
                                        Bulk Upload Excel
                                    </Button>
                                </div>

                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Academic Year</TableHead>
                                                <TableHead>Classes</TableHead>
                                                <TableHead>Course Prep</TableHead>
                                                <TableHead>Mentoring</TableHead>
                                                <TableHead>Lab Supervision</TableHead>
                                                <TableHead>Courses Taught</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {teachingSummaries.fields.length ? teachingSummaries.fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>{field.academicYear || "-"}</TableCell>
                                                    <TableCell>{String(field.classesTaken ?? 0)}</TableCell>
                                                    <TableCell>{String(field.coursePreparationHours ?? 0)}</TableCell>
                                                    <TableCell>{String(field.mentoringCount ?? 0)}</TableCell>
                                                    <TableCell>{String(field.labSupervisionCount ?? 0)}</TableCell>
                                                    <TableCell>{(field.coursesTaught ?? []).join(", ") || "-"}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button type="button" variant="outline" size="icon-sm" onClick={() => editTeachingSummaryFromTable(index)}>
                                                                <LucideIcons.Pencil className="size-4" />
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => teachingSummaries.remove(index)}>
                                                                <LucideIcons.Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-muted-foreground">No teaching summary rows added yet.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Teaching Contributions" description="Course handling, semester allocation, and teaching load mapping for accreditation reporting.">
                            <div className="grid gap-4">
                                <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-4">
                                    <Field label="Academic year" id="teachingLoadAcademicYear">
                                        <AcademicYearSelect
                                            value={teachingLoadDraft.academicYear}
                                            onChange={(value) => setTeachingLoadDraft((prev) => ({ ...prev, academicYear: value }))}
                                            options={academicYearOptions}
                                        />
                                    </Field>
                                    <Field label="Program" id="teachingLoadProgram">
                                        <Select
                                            value={teachingLoadDraft.programName || undefined}
                                            onValueChange={(value) => setTeachingLoadDraft((prev) => ({ ...prev, programName: value, courseName: "", subjectCode: "" }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select program" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniqueProgramOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="Course" id="teachingLoadCourse">
                                        <Select
                                            value={teachingLoadDraft.courseName || undefined}
                                            onValueChange={(value) => setTeachingLoadDraft((prev) => ({ ...prev, courseName: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select course" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getCourseOptionsForProgram(teachingLoadDraft.programName).map((option) => (
                                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="Semester" id="teachingLoadSemester">
                                        <Select value={teachingLoadDraft.semester} onValueChange={(value) => setTeachingLoadDraft((prev) => ({ ...prev, semester: value }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select semester" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((sem) => (
                                                    <SelectItem key={sem} value={String(sem)}>Semester {sem}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="Subject code" id="teachingLoadSubjectCode">
                                        <Select value={teachingLoadDraft.subjectCode || undefined} onValueChange={(value) => setTeachingLoadDraft((prev) => ({ ...prev, subjectCode: value }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select subject code" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getSubjectCodeOptions(teachingLoadDraft.programName, teachingLoadDraft.courseName).map((option) => (
                                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="Lecture hours" id="teachingLoadLectureHours">
                                        <Input type="number" min={0} value={teachingLoadDraft.lectureHours} onChange={(event) => setTeachingLoadDraft((prev) => ({ ...prev, lectureHours: event.target.value }))} />
                                    </Field>
                                    <Field label="Tutorial hours" id="teachingLoadTutorialHours">
                                        <Input type="number" min={0} value={teachingLoadDraft.tutorialHours} onChange={(event) => setTeachingLoadDraft((prev) => ({ ...prev, tutorialHours: event.target.value }))} />
                                    </Field>
                                    <Field label="Practical hours" id="teachingLoadPracticalHours">
                                        <Input type="number" min={0} value={teachingLoadDraft.practicalHours} onChange={(event) => setTeachingLoadDraft((prev) => ({ ...prev, practicalHours: event.target.value }))} />
                                    </Field>
                                </div>

                                {teachingLoadDraftError ? <p className="text-sm text-destructive">{teachingLoadDraftError}</p> : null}

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button type="button" onClick={saveTeachingLoadToTable}>
                                        <LucideIcons.Save className="mr-1 size-4" />
                                        {editingTeachingLoadIndex !== null ? "Update in Table" : "Save to Table"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={resetTeachingLoadDraft}>Clear Form</Button>
                                    <Button type="button" variant="outline" onClick={downloadTeachingLoadExcel}>
                                        <LucideIcons.Download className="mr-1 size-4" />
                                        Download Excel
                                    </Button>
                                    <Button type="button" variant="outline" onClick={downloadTeachingLoadTemplateExcel}>
                                        <LucideIcons.FileSpreadsheet className="mr-1 size-4" />
                                        Download Template
                                    </Button>
                                    <input
                                        id={teachingLoadExcelInputId}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) void handleTeachingLoadExcelUpload(file);
                                            event.target.value = "";
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={() => document.getElementById(teachingLoadExcelInputId)?.click()}>
                                        <LucideIcons.Upload className="mr-1 size-4" />
                                        Bulk Upload Excel
                                    </Button>
                                </div>

                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Academic Year</TableHead>
                                                <TableHead>Program</TableHead>
                                                <TableHead>Course</TableHead>
                                                <TableHead>Semester</TableHead>
                                                <TableHead>Subject Code</TableHead>
                                                <TableHead>Hours (L/T/P)</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {teachingLoads.fields.length ? teachingLoads.fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>{field.academicYear || "-"}</TableCell>
                                                    <TableCell>{field.programName || "-"}</TableCell>
                                                    <TableCell>{field.courseName || "-"}</TableCell>
                                                    <TableCell>{String(field.semester ?? 1)}</TableCell>
                                                    <TableCell>{field.subjectCode || "-"}</TableCell>
                                                    <TableCell>{`${String(field.lectureHours ?? 0)}/${String(field.tutorialHours ?? 0)}/${String(field.practicalHours ?? 0)}`}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button type="button" variant="outline" size="icon-sm" onClick={() => editTeachingLoadFromTable(index)}>
                                                                <LucideIcons.Pencil className="size-4" />
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => teachingLoads.remove(index)}>
                                                                <LucideIcons.Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-muted-foreground">No teaching contribution rows added yet.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Result Summary" description="Subject-wise academic outcome summary used in teaching quality analytics.">
                            <div className="grid gap-4">
                                <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-5">
                                    <Field label="Academic year" id="resultSummaryAcademicYear">
                                        <AcademicYearSelect
                                            value={resultSummaryDraft.academicYear}
                                            onChange={(value) => setResultSummaryDraft((prev) => ({ ...prev, academicYear: value }))}
                                            options={academicYearOptions}
                                        />
                                    </Field>
                                    <Field label="Subject" id="resultSummarySubject">
                                        <Select value={resultSummaryDraft.subjectName || undefined} onValueChange={(value) => setResultSummaryDraft((prev) => ({ ...prev, subjectName: value }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select subject" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniqueCourseOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="Appeared" id="resultSummaryAppeared">
                                        <Input type="number" min={0} value={resultSummaryDraft.appearedStudents} onChange={(event) => setResultSummaryDraft((prev) => ({ ...prev, appearedStudents: event.target.value }))} />
                                    </Field>
                                    <Field label="Passed" id="resultSummaryPassed">
                                        <Input type="number" min={0} value={resultSummaryDraft.passedStudents} onChange={(event) => setResultSummaryDraft((prev) => ({ ...prev, passedStudents: event.target.value }))} />
                                    </Field>
                                    <Field label="University rank students" id="resultSummaryRank">
                                        <Input type="number" min={0} value={resultSummaryDraft.universityRankStudents} onChange={(event) => setResultSummaryDraft((prev) => ({ ...prev, universityRankStudents: event.target.value }))} />
                                    </Field>
                                </div>

                                {resultSummaryDraftError ? <p className="text-sm text-destructive">{resultSummaryDraftError}</p> : null}

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button type="button" onClick={saveResultSummaryToTable}>
                                        <LucideIcons.Save className="mr-1 size-4" />
                                        {editingResultSummaryIndex !== null ? "Update in Table" : "Save to Table"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={resetResultSummaryDraft}>Clear Form</Button>
                                    <Button type="button" variant="outline" onClick={downloadResultSummaryExcel}>
                                        <LucideIcons.Download className="mr-1 size-4" />
                                        Download Excel
                                    </Button>
                                    <Button type="button" variant="outline" onClick={downloadResultSummaryTemplateExcel}>
                                        <LucideIcons.FileSpreadsheet className="mr-1 size-4" />
                                        Download Template
                                    </Button>
                                    <input
                                        id={resultSummaryExcelInputId}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) void handleResultSummaryExcelUpload(file);
                                            event.target.value = "";
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={() => document.getElementById(resultSummaryExcelInputId)?.click()}>
                                        <LucideIcons.Upload className="mr-1 size-4" />
                                        Bulk Upload Excel
                                    </Button>
                                </div>

                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Academic Year</TableHead>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Appeared</TableHead>
                                                <TableHead>Passed</TableHead>
                                                <TableHead>Rank Students</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {resultSummaries.fields.length ? resultSummaries.fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>{field.academicYear || "-"}</TableCell>
                                                    <TableCell>{field.subjectName || "-"}</TableCell>
                                                    <TableCell>{String(field.appearedStudents ?? 0)}</TableCell>
                                                    <TableCell>{String(field.passedStudents ?? 0)}</TableCell>
                                                    <TableCell>{String(field.universityRankStudents ?? 0)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button type="button" variant="outline" size="icon-sm" onClick={() => editResultSummaryFromTable(index)}>
                                                                <LucideIcons.Pencil className="size-4" />
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => resultSummaries.remove(index)}>
                                                                <LucideIcons.Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-muted-foreground">No result summary rows added yet.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="activities" className="mt-6 space-y-6">
                        {activitiesBulkError ? <p className="text-sm text-destructive">{activitiesBulkError}</p> : null}

                        <SectionCard title="PBAS Category II Publications" description="Journal publications and indexed outputs captured directly in the faculty publication schema.">
                            <SectionExcelActions
                                inputId={publicationsExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            title: String(row.title ?? "").trim(),
                                            journalName: String(row.journal_name ?? row.journalname ?? "").trim(),
                                            publisher: String(row.publisher ?? "").trim(),
                                            publicationType: String(row.publication_type ?? row.publicationtype ?? "UGC").trim() as FacultyWorkspaceResolvedValues["publications"][number]["publicationType"],
                                            impactFactor: asNumber(row.impact_factor ?? row.impactfactor, 0),
                                            isbnIssn: String(row.isbn_issn ?? row.isbnissn ?? "").trim(),
                                            doi: String(row.doi ?? "").trim(),
                                            publicationDate: String(row.publication_date ?? row.publicationdate ?? "").trim(),
                                            indexedIn: String(row.indexed_in ?? row.indexedin ?? "").trim(),
                                            authorPosition: String(row.author_position ?? row.authorposition ?? "First").trim() as FacultyWorkspaceResolvedValues["publications"][number]["authorPosition"],
                                        }),
                                        (row) => row.title.length >= 2,
                                        (rows) => publications.replace(rows),
                                        "No valid publication rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        publications.fields.map((row) => ({
                                            title: row.title ?? "",
                                            journal_name: row.journalName ?? "",
                                            publisher: row.publisher ?? "",
                                            publication_type: row.publicationType ?? "UGC",
                                            impact_factor: row.impactFactor ?? 0,
                                            isbn_issn: row.isbnIssn ?? "",
                                            doi: row.doi ?? "",
                                            publication_date: row.publicationDate ?? "",
                                            indexed_in: row.indexedIn ?? "",
                                            author_position: row.authorPosition ?? "First",
                                        })),
                                        "Publications",
                                        "publications.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            title: "Sample Publication",
                                            journal_name: "Journal Name",
                                            publisher: "Publisher",
                                            publication_type: "UGC",
                                            impact_factor: 2.5,
                                            isbn_issn: "",
                                            doi: "",
                                            publication_date: "2024-01-10",
                                            indexed_in: "Scopus",
                                            author_position: "First",
                                        },
                                        "Publications",
                                        "publications-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Publications"
                                downloadLabel="Download Publications"
                                templateLabel="Download Publications Template"
                            />
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
                            <SectionExcelActions
                                inputId={booksExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            title: String(row.title ?? "").trim(),
                                            publisher: String(row.publisher ?? "").trim(),
                                            isbn: String(row.isbn ?? "").trim(),
                                            publicationDate: String(row.publication_date ?? row.publicationdate ?? "").trim(),
                                            bookType: String(row.book_type ?? row.booktype ?? "Textbook").trim() as FacultyWorkspaceResolvedValues["books"][number]["bookType"],
                                        }),
                                        (row) => row.title.length >= 2,
                                        (rows) => books.replace(rows),
                                        "No valid book rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        books.fields.map((row) => ({
                                            title: row.title ?? "",
                                            publisher: row.publisher ?? "",
                                            isbn: row.isbn ?? "",
                                            publication_date: row.publicationDate ?? "",
                                            book_type: row.bookType ?? "Textbook",
                                        })),
                                        "Books",
                                        "books.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            title: "Sample Book",
                                            publisher: "Publisher",
                                            isbn: "123456",
                                            publication_date: "2024-01-10",
                                            book_type: "Textbook",
                                        },
                                        "Books",
                                        "books-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Books"
                                downloadLabel="Download Books"
                                templateLabel="Download Books Template"
                            />
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
                            <SectionExcelActions
                                inputId={patentsExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            title: String(row.title ?? "").trim(),
                                            patentNumber: String(row.patent_number ?? row.patentnumber ?? "").trim(),
                                            status: String(row.status ?? "Filed").trim() as FacultyWorkspaceResolvedValues["patents"][number]["status"],
                                            filingDate: String(row.filing_date ?? row.filingdate ?? "").trim(),
                                            grantDate: String(row.grant_date ?? row.grantdate ?? "").trim(),
                                        }),
                                        (row) => row.title.length >= 2,
                                        (rows) => patents.replace(rows),
                                        "No valid patent rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        patents.fields.map((row) => ({
                                            title: row.title ?? "",
                                            patent_number: row.patentNumber ?? "",
                                            status: row.status ?? "Filed",
                                            filing_date: row.filingDate ?? "",
                                            grant_date: row.grantDate ?? "",
                                        })),
                                        "Patents",
                                        "patents.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            title: "Sample Patent",
                                            patent_number: "PN123",
                                            status: "Filed",
                                            filing_date: "2024-01-10",
                                            grant_date: "",
                                        },
                                        "Patents",
                                        "patents-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Patents"
                                downloadLabel="Download Patents"
                                templateLabel="Download Patents Template"
                            />
                            <SectionExcelActions
                                inputId={researchProjectsExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            title: String(row.title ?? "").trim(),
                                            fundingAgency: String(row.funding_agency ?? row.fundingagency ?? "").trim(),
                                            projectType: String(row.project_type ?? row.projecttype ?? "Minor").trim() as FacultyWorkspaceResolvedValues["researchProjects"][number]["projectType"],
                                            amountSanctioned: asNumber(row.amount_sanctioned ?? row.amountsanctioned, 0),
                                            startDate: String(row.start_date ?? row.startdate ?? "").trim(),
                                            endDate: String(row.end_date ?? row.enddate ?? "").trim(),
                                            status: String(row.status ?? "Ongoing").trim() as FacultyWorkspaceResolvedValues["researchProjects"][number]["status"],
                                            principalInvestigator: asBoolean(row.principal_investigator ?? row.principalinvestigator),
                                        }),
                                        (row) => row.title.length >= 2,
                                        (rows) => researchProjects.replace(rows),
                                        "No valid research project rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        researchProjects.fields.map((row) => ({
                                            title: row.title ?? "",
                                            funding_agency: row.fundingAgency ?? "",
                                            project_type: row.projectType ?? "Minor",
                                            amount_sanctioned: row.amountSanctioned ?? 0,
                                            start_date: row.startDate ?? "",
                                            end_date: row.endDate ?? "",
                                            status: row.status ?? "Ongoing",
                                            principal_investigator: row.principalInvestigator ?? false,
                                        })),
                                        "ResearchProjects",
                                        "research-projects.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            title: "Sample Project",
                                            funding_agency: "DST",
                                            project_type: "Major",
                                            amount_sanctioned: 200000,
                                            start_date: "2024-01-10",
                                            end_date: "2025-01-10",
                                            status: "Ongoing",
                                            principal_investigator: true,
                                        },
                                        "ResearchProjects",
                                        "research-projects-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Projects"
                                downloadLabel="Download Projects"
                                templateLabel="Download Projects Template"
                            />
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
                            <SectionExcelActions
                                inputId={eventsExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            title: String(row.title ?? "").trim(),
                                            organizer: String(row.organizer ?? "").trim(),
                                            eventType: String(row.event_type ?? row.eventtype ?? "Conference").trim() as FacultyWorkspaceResolvedValues["eventParticipations"][number]["eventType"],
                                            level: String(row.level ?? "College").trim() as FacultyWorkspaceResolvedValues["eventParticipations"][number]["level"],
                                            startDate: String(row.start_date ?? row.startdate ?? "").trim(),
                                            endDate: String(row.end_date ?? row.enddate ?? "").trim(),
                                            location: String(row.location ?? "").trim(),
                                            role: String(row.role ?? "Participant").trim() as FacultyWorkspaceResolvedValues["eventParticipations"][number]["role"],
                                            paperPresented: asBoolean(row.paper_presented ?? row.paperpresented),
                                            paperTitle: String(row.paper_title ?? row.papertitle ?? "").trim(),
                                            organized: asBoolean(row.organized),
                                        }),
                                        (row) => row.title.length >= 2 && row.organizer.length >= 2,
                                        (rows) => eventParticipations.replace(rows),
                                        "No valid event rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        eventParticipations.fields.map((row) => ({
                                            title: row.title ?? "",
                                            organizer: row.organizer ?? "",
                                            event_type: row.eventType ?? "Conference",
                                            level: row.level ?? "College",
                                            start_date: row.startDate ?? "",
                                            end_date: row.endDate ?? "",
                                            location: row.location ?? "",
                                            role: row.role ?? "Participant",
                                            paper_presented: row.paperPresented ?? false,
                                            paper_title: row.paperTitle ?? "",
                                            organized: row.organized ?? false,
                                        })),
                                        "Events",
                                        "events.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            title: "Sample Conference",
                                            organizer: "ABC College",
                                            event_type: "Conference",
                                            level: "National",
                                            start_date: "2024-01-10",
                                            end_date: "2024-01-12",
                                            location: "Mumbai",
                                            role: "Participant",
                                            paper_presented: true,
                                            paper_title: "Paper A",
                                            organized: false,
                                        },
                                        "Events",
                                        "events-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Events"
                                downloadLabel="Download Events"
                                templateLabel="Download Events Template"
                            />
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
                            <SectionExcelActions
                                inputId={adminRolesExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            academicYear: String(row.academic_year ?? row.academicyear ?? "").trim(),
                                            roleName: String(row.role_name ?? row.rolename ?? "").trim(),
                                            committeeName: String(row.committee_name ?? row.committeename ?? "").trim(),
                                            responsibilityDescription: String(row.responsibility_description ?? row.responsibilitydescription ?? "").trim(),
                                        }),
                                        (row) => row.roleName.length >= 2,
                                        (rows) => administrativeRoles.replace(rows),
                                        "No valid administrative role rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        administrativeRoles.fields.map((row) => ({
                                            academic_year: row.academicYear ?? "",
                                            role_name: row.roleName ?? "",
                                            committee_name: row.committeeName ?? "",
                                            responsibility_description: row.responsibilityDescription ?? "",
                                        })),
                                        "AdministrativeRoles",
                                        "administrative-roles.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            academic_year: "2023-2024",
                                            role_name: "Coordinator",
                                            committee_name: "IQAC",
                                            responsibility_description: "Committee reporting",
                                        },
                                        "AdministrativeRoles",
                                        "administrative-roles-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Roles"
                                downloadLabel="Download Roles"
                                templateLabel="Download Roles Template"
                            />
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
                            <SectionExcelActions
                                inputId={institutionalExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            academicYear: String(row.academic_year ?? row.academicyear ?? "").trim(),
                                            activityTitle: String(row.activity_title ?? row.activitytitle ?? "").trim(),
                                            role: String(row.role ?? "").trim(),
                                            impactLevel: String(row.impact_level ?? row.impactlevel ?? "dept").trim() as FacultyWorkspaceResolvedValues["institutionalContributions"][number]["impactLevel"],
                                            scoreWeightage: asNumber(row.score_weightage ?? row.scoreweightage, 0),
                                        }),
                                        (row) => row.academicYear.length >= 4 && row.activityTitle.length >= 2 && row.role.length >= 2,
                                        (rows) => institutionalContributions.replace(rows),
                                        "No valid institutional contribution rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        institutionalContributions.fields.map((row) => ({
                                            academic_year: row.academicYear ?? "",
                                            activity_title: row.activityTitle ?? "",
                                            role: row.role ?? "",
                                            impact_level: row.impactLevel ?? "dept",
                                            score_weightage: row.scoreWeightage ?? 0,
                                        })),
                                        "InstitutionalContributions",
                                        "institutional-contributions.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            academic_year: "2023-2024",
                                            activity_title: "Mentorship Program",
                                            role: "Lead",
                                            impact_level: "dept",
                                            score_weightage: 10,
                                        },
                                        "InstitutionalContributions",
                                        "institutional-contributions-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Contributions"
                                downloadLabel="Download Contributions"
                                templateLabel="Download Contributions Template"
                            />
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
                            <SectionExcelActions
                                inputId={fdpExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            title: String(row.title ?? "").trim(),
                                            sponsoredBy: String(row.sponsored_by ?? row.sponsoredby ?? "").trim(),
                                            level: String(row.level ?? "College").trim() as FacultyWorkspaceResolvedValues["facultyDevelopmentProgrammes"][number]["level"],
                                            startDate: String(row.start_date ?? row.startdate ?? "").trim(),
                                            endDate: String(row.end_date ?? row.enddate ?? "").trim(),
                                            participantsCount: asNumber(row.participants_count ?? row.participantscount, 0),
                                        }),
                                        (row) => row.title.length >= 2,
                                        (rows) => facultyDevelopmentProgrammes.replace(rows),
                                        "No valid FDP rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        facultyDevelopmentProgrammes.fields.map((row) => ({
                                            title: row.title ?? "",
                                            sponsored_by: row.sponsoredBy ?? "",
                                            level: row.level ?? "College",
                                            start_date: row.startDate ?? "",
                                            end_date: row.endDate ?? "",
                                            participants_count: row.participantsCount ?? 0,
                                        })),
                                        "FDP",
                                        "fdp.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            title: "FDP on AI",
                                            sponsored_by: "AICTE",
                                            level: "National",
                                            start_date: "2024-02-01",
                                            end_date: "2024-02-05",
                                            participants_count: 60,
                                        },
                                        "FDP",
                                        "fdp-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload FDP"
                                downloadLabel="Download FDP"
                                templateLabel="Download FDP Template"
                            />
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
                            <SectionExcelActions
                                inputId={socialExtensionExcelInputId}
                                onUpload={(file) => {
                                    void uploadSectionExcel(
                                        file,
                                        (row) => ({
                                            documentId: "",
                                            academicYear: String(row.academic_year ?? row.academicyear ?? "").trim(),
                                            programName: String(row.program_name ?? row.programname ?? "").trim(),
                                            activityName: String(row.activity_name ?? row.activityname ?? "").trim(),
                                            hoursContributed: asNumber(row.hours_contributed ?? row.hourscontributed, 0),
                                        }),
                                        (row) => row.programName.length >= 2 && row.activityName.length >= 2,
                                        (rows) => socialExtensionActivities.replace(rows),
                                        "No valid social extension rows found."
                                    );
                                }}
                                onDownload={() =>
                                    downloadSectionExcel(
                                        socialExtensionActivities.fields.map((row) => ({
                                            academic_year: row.academicYear ?? "",
                                            program_name: row.programName ?? "",
                                            activity_name: row.activityName ?? "",
                                            hours_contributed: row.hoursContributed ?? 0,
                                        })),
                                        "SocialExtension",
                                        "social-extension.xlsx"
                                    )
                                }
                                onTemplate={() =>
                                    downloadSectionTemplateExcel(
                                        {
                                            academic_year: "2023-2024",
                                            program_name: "NSS",
                                            activity_name: "Cleanliness Drive",
                                            hours_contributed: 12,
                                        },
                                        "SocialExtension",
                                        "social-extension-template.xlsx"
                                    )
                                }
                                uploadLabel="Bulk Upload Extension"
                                downloadLabel="Download Extension"
                                templateLabel="Download Extension Template"
                            />
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

function SectionExcelActions({
    inputId,
    onUpload,
    onDownload,
    onTemplate,
    uploadLabel,
    downloadLabel,
    templateLabel,
}: {
    inputId: string;
    onUpload: (file: File) => void;
    onDownload: () => void;
    onTemplate: () => void;
    uploadLabel: string;
    downloadLabel: string;
    templateLabel: string;
}) {
    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onDownload}>
                <LucideIcons.Download className="mr-1 size-4" />
                {downloadLabel}
            </Button>
            <Button type="button" variant="outline" onClick={onTemplate}>
                <LucideIcons.FileSpreadsheet className="mr-1 size-4" />
                {templateLabel}
            </Button>
            <input
                id={inputId}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        onUpload(file);
                    }
                    event.target.value = "";
                }}
            />
            <Button type="button" variant="outline" onClick={() => document.getElementById(inputId)?.click()}>
                <LucideIcons.Upload className="mr-1 size-4" />
                {uploadLabel}
            </Button>
        </div>
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
