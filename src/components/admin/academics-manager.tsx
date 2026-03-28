"use client";

import { ChevronLeft, ChevronRight, Download, Pencil, Search, Trash2, Upload } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import * as XLSX from "xlsx";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    academicYearSchema,
    courseSchema,
    programSchema,
    semesterSchema,
} from "@/lib/admin/academics-validators";
import {
    DEGREE_TYPE_CHOICES,
    formatDegreeTypeLabel,
    normalizeDegreeType,
} from "@/lib/academic/program-classification";

type AcademicYearValues = z.input<typeof academicYearSchema>;
type AcademicYearResolvedValues = z.output<typeof academicYearSchema>;
type ProgramValues = z.input<typeof programSchema>;
type ProgramResolvedValues = z.output<typeof programSchema>;
type SemesterValues = z.input<typeof semesterSchema>;
type SemesterResolvedValues = z.output<typeof semesterSchema>;
type CourseValues = z.input<typeof courseSchema>;
type CourseResolvedValues = z.output<typeof courseSchema>;

type AcademicYearRecord = {
    _id: string;
    yearStart: number;
    yearEnd: number;
    isActive: boolean;
};

type InstitutionRecord = {
    _id: string;
    name: string;
};

type DepartmentRecord = {
    _id: string;
    name: string;
    institutionId: { _id?: string } | string;
};

type ProgramRecord = {
    _id: string;
    name: string;
    degreeType: string;
    durationYears: number;
    isActive: boolean;
    institutionId?: { _id?: string; name?: string } | string;
    departmentId?: { _id?: string; name?: string } | string;
    startAcademicYearId?: { _id?: string; yearStart?: number; yearEnd?: number } | string;
};

type SemesterRecord = {
    _id: string;
    semesterNumber: number;
    programId?: { _id?: string; name?: string } | string;
    academicYearId?: { _id?: string; yearStart?: number; yearEnd?: number } | string;
};

type CourseRecord = {
    _id: string;
    name: string;
    subjectCode?: string;
    courseType: "Theory" | "Lab" | "Project" | "Other";
    credits: number;
    isActive: boolean;
    programId?: { _id?: string; name?: string } | string;
    semesterId?:
        | {
              _id?: string;
              semesterNumber?: number;
              academicYearId?: { yearStart?: number; yearEnd?: number } | string;
          }
        | string;
};

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    const data = (await response.json()) as T & { message?: string };

    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

function yearLabel(value?: { yearStart?: number; yearEnd?: number } | string) {
    if (!value) return "-";
    if (typeof value === "string") return value;
    if (value.yearStart && value.yearEnd) {
        return `${value.yearStart}-${value.yearEnd}`;
    }
    return "-";
}

function semesterYearLabel(value?: { yearStart?: number; yearEnd?: number } | string) {
    const label = yearLabel(value);
    return label === "-" ? "Template (Year-independent)" : label;
}

function unwrapId(value?: { _id?: string } | string) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id ?? "";
}

function normalizeHeader(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseBooleanValue(value: unknown, fallback = true) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "yes", "1", "active"].includes(normalized)) return true;
        if (["false", "no", "0", "inactive"].includes(normalized)) return false;
    }
    return fallback;
}

function parseYearLabel(value: unknown) {
    const normalized = String(value ?? "").trim();
    const match = normalized.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
    if (!match) return null;

    return { yearStart: Number(match[1]), yearEnd: Number(match[2]) };
}

function readFirstSheetRows(file: File) {
    return file.arrayBuffer().then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
            return [] as Record<string, unknown>[];
        }

        return XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
    });
}

function courseSemesterLabel(course: CourseRecord) {
    if (!course.semesterId || typeof course.semesterId === "string") {
        return "-";
    }

    const semNo = course.semesterId.semesterNumber ?? "-";
    const year = yearLabel(course.semesterId.academicYearId);
    return year === "-" ? `Sem ${semNo}` : `Sem ${semNo} (${year})`;
}

const PAGE_SIZE = 8;

function paginateRows<T>(rows: T[], page: number, pageSize = PAGE_SIZE) {
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(Math.max(page, 1), pageCount);
    const startIndex = (safePage - 1) * pageSize;
    return {
        pageCount,
        safePage,
        items: rows.slice(startIndex, startIndex + pageSize),
    };
}

export function AcademicsManager({
    initialAcademicYears,
    initialPrograms,
    initialSemesters,
    initialCourses,
    institutions,
    departments,
}: {
    initialAcademicYears: AcademicYearRecord[];
    initialPrograms: ProgramRecord[];
    initialSemesters: SemesterRecord[];
    initialCourses: CourseRecord[];
    institutions: InstitutionRecord[];
    departments: DepartmentRecord[];
}) {
    const [academicYears, setAcademicYears] = useState(initialAcademicYears);
    const [programs, setPrograms] = useState(initialPrograms);
    const [semesters, setSemesters] = useState(initialSemesters);
    const [courses, setCourses] = useState(initialCourses);

    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [programMessage, setProgramMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [semesterMessage, setSemesterMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [courseMessage, setCourseMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [isPending, startTransition] = useTransition();

    const [editingAcademicYearId, setEditingAcademicYearId] = useState<string | null>(null);
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

    const academicYearForm = useForm<AcademicYearValues, unknown, AcademicYearResolvedValues>({
        resolver: zodResolver(academicYearSchema),
        defaultValues: {
            yearStart: new Date().getFullYear(),
            yearEnd: new Date().getFullYear() + 1,
            isActive: false,
        },
    });

    const programForm = useForm<ProgramValues, unknown, ProgramResolvedValues>({
        resolver: zodResolver(programSchema),
        defaultValues: {
            name: "",
            institutionId: "",
            departmentId: "",
            startAcademicYearId: "",
            degreeType: "Other",
            durationYears: 4,
            isActive: true,
        },
    });

    const semesterForm = useForm<SemesterValues, unknown, SemesterResolvedValues>({
        resolver: zodResolver(semesterSchema),
        defaultValues: {
            programId: "",
            academicYearId: "",
            semesterNumber: 1,
        },
    });

    const courseForm = useForm<CourseValues, unknown, CourseResolvedValues>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            name: "",
            programId: "",
            semesterId: "",
            subjectCode: "",
            courseType: "Theory",
            credits: 0,
            isActive: true,
        },
    });

    const selectedDepartmentId = programForm.watch("departmentId");
    const resolvedInstitution = useMemo(() => {
        const matchedDepartment = departments.find((dept) => dept._id === selectedDepartmentId);
        if (!matchedDepartment) {
            return null;
        }

        const institutionId = unwrapId(matchedDepartment.institutionId);
        return institutions.find((institution) => institution._id === institutionId) ?? null;
    }, [departments, institutions, selectedDepartmentId]);

    const selectedCourseProgramId = courseForm.watch("programId");
    const filteredSemestersForCourse = useMemo(() => {
        if (!selectedCourseProgramId) {
            return semesters;
        }

        return semesters.filter((semester) => unwrapId(semester.programId) === selectedCourseProgramId);
    }, [semesters, selectedCourseProgramId]);

    const academicYearUploadInputId = useId();
    const programUploadInputId = useId();
    const semesterUploadInputId = useId();
    const courseUploadInputId = useId();

    const [yearQuery, setYearQuery] = useState("");
    const [yearStatusFilter, setYearStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [yearPage, setYearPage] = useState(1);

    const [programQuery, setProgramQuery] = useState("");
    const [programStatusFilter, setProgramStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [programPage, setProgramPage] = useState(1);

    const [semesterQuery, setSemesterQuery] = useState("");
    const [semesterProgramFilter, setSemesterProgramFilter] = useState<string>("all");
    const [semesterPage, setSemesterPage] = useState(1);

    const [courseQuery, setCourseQuery] = useState("");
    const [courseStatusFilter, setCourseStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [courseTypeFilter, setCourseTypeFilter] = useState<"all" | CourseRecord["courseType"]>("all");
    const [coursePage, setCoursePage] = useState(1);

    function handleAcademicYearSubmit(values: AcademicYearResolvedValues) {
        setMessage(null);
        startTransition(async () => {
            try {
                if (editingAcademicYearId) {
                    const data = await requestJson<{ academicYear: AcademicYearRecord }>(
                        `/api/admin/academic-years/${editingAcademicYearId}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify(values),
                        }
                    );
                    setAcademicYears((current) =>
                        current.map((item) => (item._id === editingAcademicYearId ? data.academicYear : item))
                    );
                    setMessage({ type: "success", text: "Academic year updated." });
                } else {
                    const data = await requestJson<{ academicYear: AcademicYearRecord }>(
                        "/api/admin/academic-years",
                        {
                            method: "POST",
                            body: JSON.stringify(values),
                        }
                    );
                    setAcademicYears((current) => [data.academicYear, ...current]);
                    setMessage({ type: "success", text: "Academic year created." });
                }
                setEditingAcademicYearId(null);
                academicYearForm.reset({
                    yearStart: new Date().getFullYear(),
                    yearEnd: new Date().getFullYear() + 1,
                    isActive: false,
                });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save academic year.",
                });
            }
        });
    }

    function setActiveYear(id: string) {
        setMessage(null);
        startTransition(async () => {
            try {
                const data = await requestJson<{ academicYear: AcademicYearRecord }>(
                    `/api/admin/academic-years/${id}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify({ isActive: true }),
                    }
                );
                setAcademicYears((current) =>
                    current.map((item) =>
                        item._id === id
                            ? data.academicYear
                            : { ...item, isActive: false }
                    )
                );
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to update academic year.",
                });
            }
        });
    }

    function deleteAcademicYear(id: string) {
        setMessage(null);
        startTransition(async () => {
            try {
                await requestJson<{ message: string }>(`/api/admin/academic-years/${id}`, {
                    method: "DELETE",
                });
                setAcademicYears((current) => current.filter((item) => item._id !== id));
                setMessage({ type: "success", text: "Academic year deleted." });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to delete academic year.",
                });
            }
        });
    }

    function handleProgramSubmit(values: ProgramResolvedValues) {
        setProgramMessage(null);
        startTransition(async () => {
            try {
                const matchedDepartment = departments.find((item) => item._id === values.departmentId);
                if (!matchedDepartment) {
                    throw new Error("Select a valid department.");
                }
                const resolvedInstitutionId = unwrapId(matchedDepartment.institutionId);

                if (!resolvedInstitutionId) {
                    throw new Error("Institution mapping for selected department is missing.");
                }

                const payload: ProgramResolvedValues = {
                    ...values,
                    institutionId: resolvedInstitutionId,
                };

                if (editingProgramId) {
                    const data = await requestJson<{ program: ProgramRecord }>(
                        `/api/admin/programs/${editingProgramId}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify(payload),
                        }
                    );
                    setPrograms((current) =>
                        current.map((item) => (item._id === editingProgramId ? data.program : item))
                    );
                    setProgramMessage({ type: "success", text: "Program updated." });
                } else {
                    const data = await requestJson<{ program: ProgramRecord }>(
                        "/api/admin/programs",
                        {
                            method: "POST",
                            body: JSON.stringify(payload),
                        }
                    );
                    setPrograms((current) => [data.program, ...current]);
                    setProgramMessage({
                        type: "success",
                        text: payload.startAcademicYearId
                            ? "Program created. Semesters auto-generated."
                            : "Program created.",
                    });

                    if (payload.startAcademicYearId) {
                        const semesterData = await requestJson<{ semesters: SemesterRecord[] }>(
                            "/api/admin/semesters"
                        );
                        setSemesters(semesterData.semesters);
                    }
                }
                setEditingProgramId(null);
                programForm.reset({
                    name: "",
                    institutionId: "",
                    departmentId: "",
                    startAcademicYearId: "",
                    degreeType: "Other",
                    durationYears: 4,
                    isActive: true,
                });
            } catch (error) {
                setProgramMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save program.",
                });
            }
        });
    }

    function deleteProgram(id: string) {
        setProgramMessage(null);
        startTransition(async () => {
            try {
                await requestJson<{ message: string }>(`/api/admin/programs/${id}`, {
                    method: "DELETE",
                });
                setPrograms((current) => current.filter((item) => item._id !== id));
                setSemesters((current) => current.filter((item) => unwrapId(item.programId) !== id));
                setCourses((current) => current.filter((item) => unwrapId(item.programId) !== id));
                setProgramMessage({ type: "success", text: "Program deleted." });
            } catch (error) {
                setProgramMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to delete program.",
                });
            }
        });
    }

    function handleSemesterSubmit(values: SemesterResolvedValues) {
        setSemesterMessage(null);
        startTransition(async () => {
            try {
                if (editingSemesterId) {
                    const data = await requestJson<{ semester: SemesterRecord }>(
                        `/api/admin/semesters/${editingSemesterId}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify(values),
                        }
                    );
                    setSemesters((current) =>
                        current.map((item) => (item._id === editingSemesterId ? data.semester : item))
                    );
                    setSemesterMessage({ type: "success", text: "Semester updated." });
                } else {
                    const data = await requestJson<{ semester: SemesterRecord }>(
                        "/api/admin/semesters",
                        {
                            method: "POST",
                            body: JSON.stringify(values),
                        }
                    );
                    setSemesters((current) => [data.semester, ...current]);
                    setSemesterMessage({ type: "success", text: "Semester created." });
                }
                setEditingSemesterId(null);
                semesterForm.reset({
                    programId: "",
                    academicYearId: "",
                    semesterNumber: 1,
                });
            } catch (error) {
                setSemesterMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save semester.",
                });
            }
        });
    }

    function deleteSemester(id: string) {
        setSemesterMessage(null);
        startTransition(async () => {
            try {
                await requestJson<{ message: string }>(`/api/admin/semesters/${id}`, {
                    method: "DELETE",
                });
                setSemesters((current) => current.filter((item) => item._id !== id));
                setCourses((current) => current.filter((item) => unwrapId(item.semesterId) !== id));
                setSemesterMessage({ type: "success", text: "Semester deleted." });
            } catch (error) {
                setSemesterMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to delete semester.",
                });
            }
        });
    }

    function handleCourseSubmit(values: CourseResolvedValues) {
        setCourseMessage(null);
        startTransition(async () => {
            try {
                if (editingCourseId) {
                    const data = await requestJson<{ course: CourseRecord }>(
                        `/api/admin/courses/${editingCourseId}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify(values),
                        }
                    );
                    setCourses((current) =>
                        current.map((item) => (item._id === editingCourseId ? data.course : item))
                    );
                    setCourseMessage({ type: "success", text: "Course updated." });
                } else {
                    const data = await requestJson<{ course: CourseRecord }>(
                        "/api/admin/courses",
                        {
                            method: "POST",
                            body: JSON.stringify(values),
                        }
                    );
                    setCourses((current) => [data.course, ...current]);
                    setCourseMessage({ type: "success", text: "Course created." });
                }
                setEditingCourseId(null);
                courseForm.reset({
                    name: "",
                    programId: "",
                    semesterId: "",
                    subjectCode: "",
                    courseType: "Theory",
                    credits: 0,
                    isActive: true,
                });
            } catch (error) {
                setCourseMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save course.",
                });
            }
        });
    }

    function deleteCourse(id: string) {
        setCourseMessage(null);
        startTransition(async () => {
            try {
                await requestJson<{ message: string }>(`/api/admin/courses/${id}`, {
                    method: "DELETE",
                });
                setCourses((current) => current.filter((item) => item._id !== id));
                setCourseMessage({ type: "success", text: "Course deleted." });
            } catch (error) {
                setCourseMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to delete course.",
                });
            }
        });
    }

    function downloadAcademicYearSampleExcel() {
        const workbook = XLSX.utils.book_new();
        const template = XLSX.utils.json_to_sheet([
            { year_start: 2024, year_end: 2025, is_active: true },
            { year_start: 2025, year_end: 2026, is_active: false },
        ]);
        const instructions = XLSX.utils.aoa_to_sheet([
            ["Academic Years Bulk Upload"],
            ["Required columns: year_start, year_end"],
            ["Optional column: is_active (true/false)"],
        ]);
        XLSX.utils.book_append_sheet(workbook, template, "Template");
        XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
        XLSX.writeFile(workbook, "academic-years-template.xlsx");
    }

    async function handleAcademicYearBulkUpload(file: File) {
        setMessage(null);
        const rows = await readFirstSheetRows(file);
        const payloads = rows
            .map((row) => {
                const normalized = Object.fromEntries(
                    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
                );
                return {
                    yearStart: Number(normalized.year_start ?? normalized.yearstart ?? 0),
                    yearEnd: Number(normalized.year_end ?? normalized.yearend ?? 0),
                    isActive: parseBooleanValue(normalized.is_active ?? normalized.isactive, false),
                };
            })
            .filter((item) => Number.isInteger(item.yearStart) && Number.isInteger(item.yearEnd));

        if (!payloads.length) {
            setMessage({ type: "error", text: "No valid academic year rows found in uploaded file." });
            return;
        }

        startTransition(async () => {
            try {
                for (const payload of payloads) {
                    await requestJson<{ academicYear: AcademicYearRecord }>("/api/admin/academic-years", {
                        method: "POST",
                        body: JSON.stringify(payload),
                    });
                }

                const refreshed = await requestJson<{ academicYears: AcademicYearRecord[] }>("/api/admin/academic-years");
                setAcademicYears(refreshed.academicYears);
                setMessage({ type: "success", text: `${payloads.length} academic years imported.` });
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Academic year bulk upload failed.",
                });
            }
        });
    }

    function downloadProgramSampleExcel() {
        const workbook = XLSX.utils.book_new();
        const template = XLSX.utils.json_to_sheet([
            {
                name: "B.Tech CSE",
                institution: institutions[0]?.name ?? "Institution Name",
                department: departments[0]?.name ?? "Department Name",
                start_academic_year: `${academicYears[0]?.yearStart ?? 2024}-${academicYears[0]?.yearEnd ?? 2025}`,
                degree_type: "BTech",
                duration_years: 4,
                is_active: true,
            },
        ]);
        const instructions = XLSX.utils.aoa_to_sheet([
            ["Programs Bulk Upload"],
            ["Required columns: name, department, degree_type, duration_years"],
            ["Optional column: institution (used only to validate department-institution mapping)."],
            ["Optional column: start_academic_year (provide only when you want semester auto-generation)."],
            ["degree_type values: BA, BSc, BCom, BBA, BCA, BTech, MA, MSc, MCom, MBA, MCA, MTech, PhD, Diploma, Certificate, Other"],
            ["Optional column: is_active (true/false)"],
            ["Department should match existing masters; institution is auto-resolved from selected department."],
        ]);
        XLSX.utils.book_append_sheet(workbook, template, "Template");
        XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
        XLSX.writeFile(workbook, "programs-template.xlsx");
    }

    async function handleProgramBulkUpload(file: File) {
        setProgramMessage(null);
        const institutionMap = new Map(institutions.map((item) => [item.name.trim().toLowerCase(), item._id]));
        const departmentMap = new Map(
            departments.map((item) => [
                item.name.trim().toLowerCase(),
                {
                    departmentId: item._id,
                    institutionId: unwrapId(item.institutionId),
                },
            ])
        );
        const academicYearMap = new Map(academicYears.map((item) => [`${item.yearStart}-${item.yearEnd}`, item._id]));

        const rows = await readFirstSheetRows(file);
        const payloads: ProgramResolvedValues[] = [];

        for (const row of rows) {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
            );

            const institutionName = String(normalized.institution ?? normalized.institution_name ?? "").trim();
            const departmentName = String(normalized.department ?? normalized.department_name ?? "").trim();
            const yearValue = String(
                normalized.start_academic_year ??
                    normalized.start_year ??
                    normalized.start_acade ??
                    normalized.startacademicyear ??
                    ""
            ).trim();

            const departmentMapping = departmentMap.get(departmentName.toLowerCase());
            const institutionIdFromFile = institutionMap.get(institutionName.toLowerCase());
            const startAcademicYearId = academicYearMap.get(yearValue);

            if (!departmentMapping?.departmentId || !departmentMapping.institutionId) {
                continue;
            }

            if (
                institutionName &&
                institutionIdFromFile &&
                institutionIdFromFile !== departmentMapping.institutionId
            ) {
                continue;
            }

            payloads.push({
                name: String(normalized.name ?? "").trim(),
                institutionId: departmentMapping.institutionId,
                departmentId: departmentMapping.departmentId,
                ...(startAcademicYearId ? { startAcademicYearId } : {}),
                degreeType:
                    normalizeDegreeType(
                        String(normalized.degree_type ?? normalized.degreetype ?? "")
                    ) ?? "Other",
                durationYears: Number(normalized.duration_years ?? normalized.durationyears ?? 0),
                isActive: parseBooleanValue(normalized.is_active ?? normalized.isactive, true),
            });
        }

        if (!payloads.length) {
            setProgramMessage({ type: "error", text: "No valid program rows found. Verify department names and required fields." });
            return;
        }

        startTransition(async () => {
            try {
                const failures: string[] = [];
                let createdCount = 0;

                for (const payload of payloads) {
                    try {
                        await requestJson<{ program: ProgramRecord }>("/api/admin/programs", {
                            method: "POST",
                            body: JSON.stringify(payload),
                        });
                        createdCount += 1;
                    } catch (rowError) {
                        const message =
                            rowError instanceof Error ? rowError.message : "Unable to import this row.";
                        failures.push(`${payload.name}: ${message}`);
                    }
                }

                if (createdCount > 0) {
                    const [refreshedPrograms, refreshedSemesters] = await Promise.all([
                        requestJson<{ programs: ProgramRecord[] }>("/api/admin/programs"),
                        requestJson<{ semesters: SemesterRecord[] }>("/api/admin/semesters"),
                    ]);
                    setPrograms(refreshedPrograms.programs);
                    setSemesters(refreshedSemesters.semesters);
                }

                if (failures.length) {
                    const preview = failures.slice(0, 3).join(" | ");
                    const more = failures.length > 3 ? ` (+${failures.length - 3} more)` : "";
                    setProgramMessage({
                        type: "error",
                        text: `Imported ${createdCount} program(s). Failed ${failures.length}: ${preview}${more}`,
                    });
                    return;
                }

                setProgramMessage({ type: "success", text: `${createdCount} programs imported.` });
            } catch (error) {
                setProgramMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Program bulk upload failed.",
                });
            }
        });
    }

    function downloadSemesterSampleExcel() {
        const workbook = XLSX.utils.book_new();
        const template = XLSX.utils.json_to_sheet([
            {
                program: programs[0]?.name ?? "Program Name",
                academic_year: "",
                semester_number: 1,
            },
        ]);
        const instructions = XLSX.utils.aoa_to_sheet([
            ["Semesters Bulk Upload"],
            ["Required columns: program, semester_number"],
            ["Optional column: academic_year (for legacy year-specific semesters)."],
            ["Leave academic_year empty to create year-independent semester templates."],
        ]);
        XLSX.utils.book_append_sheet(workbook, template, "Template");
        XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
        XLSX.writeFile(workbook, "semesters-template.xlsx");
    }

    async function handleSemesterBulkUpload(file: File) {
        setSemesterMessage(null);
        const programMap = new Map(programs.map((item) => [item.name.trim().toLowerCase(), item._id]));
        const academicYearMap = new Map(academicYears.map((item) => [`${item.yearStart}-${item.yearEnd}`, item._id]));

        const rows = await readFirstSheetRows(file);
        const payloads: SemesterResolvedValues[] = [];

        for (const row of rows) {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
            );

            const programName = String(normalized.program ?? normalized.program_name ?? "").trim();
            const academicYear = String(normalized.academic_year ?? normalized.academicyear ?? "").trim();
            const programId = programMap.get(programName.toLowerCase());
            const academicYearId = academicYear ? academicYearMap.get(academicYear) : undefined;
            const semesterNumber = Number(normalized.semester_number ?? normalized.semesternumber ?? 0);

            if (!programId || (academicYear && !academicYearId) || !Number.isInteger(semesterNumber) || semesterNumber <= 0) {
                continue;
            }

            payloads.push({
                programId,
                ...(academicYearId ? { academicYearId } : {}),
                semesterNumber,
            });
        }

        if (!payloads.length) {
            setSemesterMessage({ type: "error", text: "No valid semester rows found." });
            return;
        }

        startTransition(async () => {
            try {
                for (const payload of payloads) {
                    await requestJson<{ semester: SemesterRecord }>("/api/admin/semesters", {
                        method: "POST",
                        body: JSON.stringify(payload),
                    });
                }

                const refreshed = await requestJson<{ semesters: SemesterRecord[] }>("/api/admin/semesters");
                setSemesters(refreshed.semesters);
                setSemesterMessage({ type: "success", text: `${payloads.length} semesters imported.` });
            } catch (error) {
                setSemesterMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Semester bulk upload failed.",
                });
            }
        });
    }

    function downloadCourseSampleExcel() {
        const workbook = XLSX.utils.book_new();
        const template = XLSX.utils.json_to_sheet([
            {
                name: "Data Structures",
                subject_code: "CS201",
                program: programs[0]?.name ?? "Program Name",
                academic_year: "",
                semester_number: 3,
                course_type: "Theory",
                credits: 4,
                is_active: true,
            },
        ]);
        const instructions = XLSX.utils.aoa_to_sheet([
            ["Courses Bulk Upload"],
            ["Required columns: name, program, semester_number, course_type, credits"],
            ["Optional columns: subject_code, is_active"],
            ["Optional column: academic_year (required only for legacy year-specific semester rows)."],
            ["course_type allowed: Theory, Lab, Project, Other"],
        ]);
        XLSX.utils.book_append_sheet(workbook, template, "Template");
        XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
        XLSX.writeFile(workbook, "courses-template.xlsx");
    }

    async function handleCourseBulkUpload(file: File) {
        setCourseMessage(null);
        const programIdByName = new Map(programs.map((item) => [item.name.trim().toLowerCase(), item._id]));
        const yearIdByLabel = new Map(academicYears.map((item) => [`${item.yearStart}-${item.yearEnd}`, item._id]));
        const semesterKeyWithYearToId = new Map(
            semesters.map((item) => {
                const programId = unwrapId(item.programId);
                const academicYearId = unwrapId(item.academicYearId);
                return [`${programId}:${academicYearId}:${item.semesterNumber}`, item._id] as const;
            })
        );
        const semesterTemplateKeyToId = new Map(
            semesters
                .filter((item) => !unwrapId(item.academicYearId))
                .map((item) => {
                    const programId = unwrapId(item.programId);
                    return [`${programId}:${item.semesterNumber}`, item._id] as const;
                })
        );

        const rows = await readFirstSheetRows(file);
        const payloads: CourseResolvedValues[] = [];

        for (const row of rows) {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
            );

            const programName = String(normalized.program ?? normalized.program_name ?? "").trim();
            const academicYear = String(normalized.academic_year ?? normalized.academicyear ?? "").trim();
            const semesterNumber = Number(normalized.semester_number ?? normalized.semesternumber ?? 0);
            const programId = programIdByName.get(programName.toLowerCase());
            const academicYearId = academicYear ? yearIdByLabel.get(academicYear) : undefined;
            const semesterId = programId
                ? academicYearId
                    ? semesterKeyWithYearToId.get(`${programId}:${academicYearId}:${semesterNumber}`) ??
                      semesterTemplateKeyToId.get(`${programId}:${semesterNumber}`)
                    : semesterTemplateKeyToId.get(`${programId}:${semesterNumber}`)
                : undefined;

            if (!programId || (academicYear && !academicYearId) || !semesterId || !Number.isInteger(semesterNumber) || semesterNumber <= 0) {
                continue;
            }

            const rawType = String(normalized.course_type ?? normalized.coursetype ?? "Theory").trim();
            const courseType: CourseResolvedValues["courseType"] =
                rawType === "Lab" || rawType === "Project" || rawType === "Other" ? rawType : "Theory";

            payloads.push({
                name: String(normalized.name ?? "").trim(),
                subjectCode: String(normalized.subject_code ?? normalized.subjectcode ?? "").trim(),
                programId,
                semesterId,
                courseType,
                credits: Number(normalized.credits ?? 0),
                isActive: parseBooleanValue(normalized.is_active ?? normalized.isactive, true),
            });
        }

        if (!payloads.length) {
            setCourseMessage({ type: "error", text: "No valid course rows found." });
            return;
        }

        startTransition(async () => {
            try {
                for (const payload of payloads) {
                    await requestJson<{ course: CourseRecord }>("/api/admin/courses", {
                        method: "POST",
                        body: JSON.stringify(payload),
                    });
                }

                const refreshed = await requestJson<{ courses: CourseRecord[] }>("/api/admin/courses");
                setCourses(refreshed.courses);
                setCourseMessage({ type: "success", text: `${payloads.length} courses imported.` });
            } catch (error) {
                setCourseMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Course bulk upload failed.",
                });
            }
        });
    }

    const filteredAcademicYears = useMemo(() => {
        const q = yearQuery.trim().toLowerCase();
        return academicYears.filter((item) => {
            const statusMatch =
                yearStatusFilter === "all" ||
                (yearStatusFilter === "active" && item.isActive) ||
                (yearStatusFilter === "inactive" && !item.isActive);
            const textMatch = !q || `${item.yearStart}-${item.yearEnd}`.toLowerCase().includes(q);
            return statusMatch && textMatch;
        });
    }, [academicYears, yearQuery, yearStatusFilter]);

    const pagedAcademicYears = useMemo(
        () => paginateRows(filteredAcademicYears, yearPage),
        [filteredAcademicYears, yearPage]
    );

    const filteredPrograms = useMemo(() => {
        const q = programQuery.trim().toLowerCase();
        return programs.filter((item) => {
            const statusMatch =
                programStatusFilter === "all" ||
                (programStatusFilter === "active" && item.isActive) ||
                (programStatusFilter === "inactive" && !item.isActive);
            const deptName = typeof item.departmentId === "string" ? item.departmentId : item.departmentId?.name ?? "";
            const instName = typeof item.institutionId === "string" ? item.institutionId : item.institutionId?.name ?? "";
            const text = `${item.name} ${item.degreeType} ${deptName} ${instName}`.toLowerCase();
            return statusMatch && (!q || text.includes(q));
        });
    }, [programs, programQuery, programStatusFilter]);

    const pagedPrograms = useMemo(
        () => paginateRows(filteredPrograms, programPage),
        [filteredPrograms, programPage]
    );

    const filteredSemesters = useMemo(() => {
        const q = semesterQuery.trim().toLowerCase();
        return semesters.filter((item) => {
            const programId = unwrapId(item.programId);
            const programMatch = semesterProgramFilter === "all" || programId === semesterProgramFilter;
            const text = `semester ${item.semesterNumber} ${typeof item.programId === "string" ? item.programId : item.programId?.name ?? ""} ${semesterYearLabel(item.academicYearId)}`.toLowerCase();
            return programMatch && (!q || text.includes(q));
        });
    }, [semesters, semesterQuery, semesterProgramFilter]);

    const pagedSemesters = useMemo(
        () => paginateRows(filteredSemesters, semesterPage),
        [filteredSemesters, semesterPage]
    );

    const filteredCourses = useMemo(() => {
        const q = courseQuery.trim().toLowerCase();
        return courses.filter((item) => {
            const statusMatch =
                courseStatusFilter === "all" ||
                (courseStatusFilter === "active" && item.isActive) ||
                (courseStatusFilter === "inactive" && !item.isActive);
            const typeMatch = courseTypeFilter === "all" || item.courseType === courseTypeFilter;
            const text = `${item.name} ${item.subjectCode ?? ""} ${typeof item.programId === "string" ? item.programId : item.programId?.name ?? ""} ${courseSemesterLabel(item)}`.toLowerCase();
            return statusMatch && typeMatch && (!q || text.includes(q));
        });
    }, [courses, courseQuery, courseStatusFilter, courseTypeFilter]);

    const pagedCourses = useMemo(
        () => paginateRows(filteredCourses, coursePage),
        [filteredCourses, coursePage]
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle>Academic Years</CardTitle>
                        <CardDescription>
                            Create academic years and choose the single active year for reporting modules.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">Total {academicYears.length}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            Active {academicYears.filter((item) => item.isActive).length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[360px_1fr]">
                    <div className="space-y-4">
                        {message ? <FormMessage message={message.text} type={message.type} /> : null}
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <Button type="button" variant="outline" onClick={downloadAcademicYearSampleExcel}>
                                <Download className="mr-2 size-4" />
                                Sample Excel
                            </Button>
                            <input
                                id={academicYearUploadInputId}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleAcademicYearBulkUpload(file);
                                    event.target.value = "";
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(academicYearUploadInputId)?.click()}
                            >
                                <Upload className="mr-2 size-4" />
                                Bulk Add via Excel
                            </Button>
                        </div>
                        <form className="grid gap-4" onSubmit={academicYearForm.handleSubmit(handleAcademicYearSubmit)}>
                            <Field label="Year start" id="yearStart" error={academicYearForm.formState.errors.yearStart?.message}>
                                <Input id="yearStart" type="number" {...academicYearForm.register("yearStart", { valueAsNumber: true })} />
                            </Field>
                            <Field label="Year end" id="yearEnd" error={academicYearForm.formState.errors.yearEnd?.message}>
                                <Input id="yearEnd" type="number" {...academicYearForm.register("yearEnd", { valueAsNumber: true })} />
                            </Field>
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                                <input type="checkbox" {...academicYearForm.register("isActive")} />
                                Set as active year
                            </label>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Spinner /> : null}
                                    {editingAcademicYearId ? "Update Year" : "Create Year"}
                                </Button>
                                {editingAcademicYearId ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setEditingAcademicYearId(null);
                                            academicYearForm.reset({
                                                yearStart: new Date().getFullYear(),
                                                yearEnd: new Date().getFullYear() + 1,
                                                isActive: false,
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-400" />
                                <Input
                                    value={yearQuery}
                                    onChange={(event) => {
                                        setYearQuery(event.target.value);
                                        setYearPage(1);
                                    }}
                                    className="pl-9"
                                    placeholder="Search by academic year"
                                />
                            </div>
                            <Select
                                value={yearStatusFilter}
                                onValueChange={(value: "all" | "active" | "inactive") => {
                                    setYearStatusFilter(value);
                                    setYearPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="active">Active only</SelectItem>
                                    <SelectItem value="inactive">Inactive only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-lg border border-zinc-200">
                            <Table disableContainer className="min-w-[640px]">
                                <TableHeader className="sticky top-0 z-10 bg-white">
                                <TableRow>
                                    <TableHead>Academic Year</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {pagedAcademicYears.items.length ? pagedAcademicYears.items.map((year) => (
                                    <TableRow key={year._id}>
                                        <TableCell className="font-medium text-zinc-900">
                                            {year.yearStart}-{year.yearEnd}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={year.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                                                {year.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingAcademicYearId(year._id);
                                                        academicYearForm.reset({
                                                            yearStart: year.yearStart,
                                                            yearEnd: year.yearEnd,
                                                            isActive: year.isActive,
                                                        });
                                                    }}
                                                >
                                                    <Pencil className="mr-2 size-4" />
                                                    Edit
                                                </Button>
                                                {!year.isActive ? (
                                                    <Button type="button" size="sm" onClick={() => setActiveYear(year._id)}>
                                                        Set Active
                                                    </Button>
                                                ) : null}
                                                <Button type="button" variant="ghost" size="sm" onClick={() => deleteAcademicYear(year._id)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-zinc-500">
                                            No academic years match your search/filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>

                        <PaginationControls
                            itemLabel="years"
                            totalItems={filteredAcademicYears.length}
                            page={pagedAcademicYears.safePage}
                            pageCount={pagedAcademicYears.pageCount}
                            onPageChange={setYearPage}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle>Programs</CardTitle>
                        <CardDescription>
                            Create reusable programs for all batches. Department is primary, and institution is auto-resolved from department mapping.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">Total {programs.length}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            Active {programs.filter((item) => item.isActive).length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[400px_1fr]">
                    <div className="space-y-4">
                        {programMessage ? <FormMessage message={programMessage.text} type={programMessage.type} /> : null}
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <Button type="button" variant="outline" onClick={downloadProgramSampleExcel}>
                                <Download className="mr-2 size-4" />
                                Sample Excel
                            </Button>
                            <input
                                id={programUploadInputId}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleProgramBulkUpload(file);
                                    event.target.value = "";
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(programUploadInputId)?.click()}
                            >
                                <Upload className="mr-2 size-4" />
                                Bulk Add via Excel
                            </Button>
                        </div>
                        <form className="grid gap-4" onSubmit={programForm.handleSubmit(handleProgramSubmit)}>
                            <Field label="Program name" id="programName" error={programForm.formState.errors.name?.message}>
                                <Input id="programName" {...programForm.register("name")} />
                            </Field>
                            <Field label="Department" id="programDepartment" error={programForm.formState.errors.departmentId?.message}>
                                <Controller
                                    control={programForm.control}
                                    name="departmentId"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="programDepartment">
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept._id} value={dept._id}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <Field label="Institution (auto)" id="programInstitutionAuto">
                                <Input
                                    id="programInstitutionAuto"
                                    readOnly
                                    value={resolvedInstitution?.name ?? "Auto-resolved from selected department"}
                                />
                            </Field>
                            <Field label="Start academic year (optional)" id="startAcademicYear" error={programForm.formState.errors.startAcademicYearId?.message}>
                                <Controller
                                    control={programForm.control}
                                    name="startAcademicYearId"
                                    render={({ field }) => (
                                        <Select
                                            value={typeof field.value === "string" && field.value ? field.value : "__none__"}
                                            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                                        >
                                            <SelectTrigger id="startAcademicYear">
                                                <SelectValue placeholder="No auto-generation baseline" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">No baseline (reuse for all batches)</SelectItem>
                                                {academicYears.map((year) => (
                                                    <SelectItem key={year._id} value={year._id}>
                                                        {year.yearStart}-{year.yearEnd}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <Field label="Degree type" id="degreeType" error={programForm.formState.errors.degreeType?.message}>
                                <Controller
                                    control={programForm.control}
                                    name="degreeType"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="degreeType">
                                                <SelectValue placeholder="Select degree type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DEGREE_TYPE_CHOICES.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Duration (years)" id="durationYears" error={programForm.formState.errors.durationYears?.message}>
                                    <Input id="durationYears" type="number" min={1} {...programForm.register("durationYears", { valueAsNumber: true })} />
                                </Field>
                                <label className="flex items-center gap-2 text-sm text-zinc-700 md:pt-7">
                                    <input type="checkbox" {...programForm.register("isActive")} />
                                    Active program
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Spinner /> : null}
                                    {editingProgramId ? "Update Program" : "Create Program"}
                                </Button>
                                {editingProgramId ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setEditingProgramId(null);
                                            programForm.reset({
                                                name: "",
                                                institutionId: "",
                                                departmentId: "",
                                                startAcademicYearId: "",
                                                degreeType: "Other",
                                                durationYears: 4,
                                                isActive: true,
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-400" />
                                <Input
                                    value={programQuery}
                                    onChange={(event) => {
                                        setProgramQuery(event.target.value);
                                        setProgramPage(1);
                                    }}
                                    className="pl-9"
                                    placeholder="Search program, degree, department"
                                />
                            </div>
                            <Select
                                value={programStatusFilter}
                                onValueChange={(value: "all" | "active" | "inactive") => {
                                    setProgramStatusFilter(value);
                                    setProgramPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="active">Active only</SelectItem>
                                    <SelectItem value="inactive">Inactive only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-lg border border-zinc-200">
                            <Table disableContainer className="min-w-[980px]">
                                <TableHeader className="sticky top-0 z-10 bg-white">
                                <TableRow>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Department / Institution</TableHead>
                                    <TableHead>Start Year</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {pagedPrograms.items.length ? pagedPrograms.items.map((program) => (
                                    <TableRow key={program._id}>
                                        <TableCell>
                                            <p className="font-medium text-zinc-900">{program.name}</p>
                                            <p className="text-xs text-zinc-500">{formatDegreeTypeLabel(program.degreeType)} • {program.durationYears} years</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-zinc-600">
                                            {(typeof program.departmentId === "string" ? program.departmentId : program.departmentId?.name) ?? "-"}
                                            {" / "}
                                            {(typeof program.institutionId === "string" ? program.institutionId : program.institutionId?.name) ?? "-"}
                                        </TableCell>
                                        <TableCell>{yearLabel(program.startAcademicYearId)}</TableCell>
                                        <TableCell>
                                            <Badge className={program.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                                                {program.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingProgramId(program._id);
                                                        programForm.reset({
                                                            name: program.name,
                                                            degreeType: normalizeDegreeType(program.degreeType) ?? "Other",
                                                            durationYears: program.durationYears,
                                                            isActive: program.isActive,
                                                            institutionId: unwrapId(program.institutionId),
                                                            departmentId: unwrapId(program.departmentId),
                                                            startAcademicYearId: unwrapId(program.startAcademicYearId),
                                                        });
                                                    }}
                                                >
                                                    <Pencil className="mr-2 size-4" />
                                                    Edit
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => deleteProgram(program._id)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500">
                                            No programs match your search/filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>

                        <PaginationControls
                            itemLabel="programs"
                            totalItems={filteredPrograms.length}
                            page={pagedPrograms.safePage}
                            pageCount={pagedPrograms.pageCount}
                            onPageChange={setProgramPage}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle>Semesters</CardTitle>
                        <CardDescription>
                            Use this to correct or append semester mappings when program structures change.
                        </CardDescription>
                    </div>
                    <Badge variant="secondary">Total {semesters.length}</Badge>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[360px_1fr]">
                    <div className="space-y-4">
                        {semesterMessage ? <FormMessage message={semesterMessage.text} type={semesterMessage.type} /> : null}
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <Button type="button" variant="outline" onClick={downloadSemesterSampleExcel}>
                                <Download className="mr-2 size-4" />
                                Sample Excel
                            </Button>
                            <input
                                id={semesterUploadInputId}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleSemesterBulkUpload(file);
                                    event.target.value = "";
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(semesterUploadInputId)?.click()}
                            >
                                <Upload className="mr-2 size-4" />
                                Bulk Add via Excel
                            </Button>
                        </div>
                        <form className="grid gap-4" onSubmit={semesterForm.handleSubmit(handleSemesterSubmit)}>
                            <Field label="Program" id="semesterProgram" error={semesterForm.formState.errors.programId?.message}>
                                <Controller
                                    control={semesterForm.control}
                                    name="programId"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="semesterProgram">
                                                <SelectValue placeholder="Select program" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {programs.map((program) => (
                                                    <SelectItem key={program._id} value={program._id}>
                                                        {program.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <Field label="Academic year (optional)" id="semesterAcademicYear" error={semesterForm.formState.errors.academicYearId?.message}>
                                <Controller
                                    control={semesterForm.control}
                                    name="academicYearId"
                                    render={({ field }) => (
                                        <Select
                                            value={typeof field.value === "string" && field.value ? field.value : "__none__"}
                                            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                                        >
                                            <SelectTrigger id="semesterAcademicYear">
                                                <SelectValue placeholder="Template semester (year-independent)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">Template semester (year-independent)</SelectItem>
                                                {academicYears.map((year) => (
                                                    <SelectItem key={year._id} value={year._id}>
                                                        {year.yearStart}-{year.yearEnd}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <Field label="Semester number" id="semesterNumber" error={semesterForm.formState.errors.semesterNumber?.message}>
                                <Input id="semesterNumber" type="number" min={1} {...semesterForm.register("semesterNumber", { valueAsNumber: true })} />
                            </Field>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Spinner /> : null}
                                    {editingSemesterId ? "Update Semester" : "Create Semester"}
                                </Button>
                                {editingSemesterId ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setEditingSemesterId(null);
                                            semesterForm.reset({
                                                programId: "",
                                                academicYearId: "",
                                                semesterNumber: 1,
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-400" />
                                <Input
                                    value={semesterQuery}
                                    onChange={(event) => {
                                        setSemesterQuery(event.target.value);
                                        setSemesterPage(1);
                                    }}
                                    className="pl-9"
                                    placeholder="Search semester, program, year"
                                />
                            </div>
                            <Select
                                value={semesterProgramFilter}
                                onValueChange={(value) => {
                                    setSemesterProgramFilter(value);
                                    setSemesterPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by program" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All programs</SelectItem>
                                    {programs.map((program) => (
                                        <SelectItem key={program._id} value={program._id}>
                                            {program.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-lg border border-zinc-200">
                            <Table disableContainer className="min-w-[820px]">
                                <TableHeader className="sticky top-0 z-10 bg-white">
                                <TableRow>
                                    <TableHead>Semester</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Academic Year</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {pagedSemesters.items.length ? pagedSemesters.items.map((semester) => (
                                    <TableRow key={semester._id}>
                                        <TableCell className="font-medium text-zinc-900">Semester {semester.semesterNumber}</TableCell>
                                        <TableCell>
                                            {(typeof semester.programId === "string" ? semester.programId : semester.programId?.name) ?? "-"}
                                        </TableCell>
                                        <TableCell>{semesterYearLabel(semester.academicYearId)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingSemesterId(semester._id);
                                                        semesterForm.reset({
                                                            programId: unwrapId(semester.programId),
                                                            academicYearId: unwrapId(semester.academicYearId),
                                                            semesterNumber: semester.semesterNumber,
                                                        });
                                                    }}
                                                >
                                                    <Pencil className="mr-2 size-4" />
                                                    Edit
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => deleteSemester(semester._id)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-zinc-500">
                                            No semesters match your search/filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>

                        <PaginationControls
                            itemLabel="semesters"
                            totalItems={filteredSemesters.length}
                            page={pagedSemesters.safePage}
                            pageCount={pagedSemesters.pageCount}
                            onPageChange={setSemesterPage}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle>Courses</CardTitle>
                        <CardDescription>
                            Maintain course master records linked to program-semester mappings.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">Total {courses.length}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            Active {courses.filter((item) => item.isActive).length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[420px_1fr]">
                    <div className="space-y-4">
                        {courseMessage ? <FormMessage message={courseMessage.text} type={courseMessage.type} /> : null}
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <Button type="button" variant="outline" onClick={downloadCourseSampleExcel}>
                                <Download className="mr-2 size-4" />
                                Sample Excel
                            </Button>
                            <input
                                id={courseUploadInputId}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleCourseBulkUpload(file);
                                    event.target.value = "";
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(courseUploadInputId)?.click()}
                            >
                                <Upload className="mr-2 size-4" />
                                Bulk Add via Excel
                            </Button>
                        </div>
                        <form className="grid gap-4" onSubmit={courseForm.handleSubmit(handleCourseSubmit)}>
                            <Field label="Course name" id="courseName" error={courseForm.formState.errors.name?.message}>
                                <Input id="courseName" {...courseForm.register("name")} />
                            </Field>
                            <Field label="Subject code" id="courseSubjectCode" error={courseForm.formState.errors.subjectCode?.message}>
                                <Input id="courseSubjectCode" {...courseForm.register("subjectCode")} />
                            </Field>
                            <Field label="Program" id="courseProgram" error={courseForm.formState.errors.programId?.message}>
                                <Controller
                                    control={courseForm.control}
                                    name="programId"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                courseForm.setValue("semesterId", "", { shouldValidate: true });
                                            }}
                                        >
                                            <SelectTrigger id="courseProgram">
                                                <SelectValue placeholder="Select program" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {programs.map((program) => (
                                                    <SelectItem key={program._id} value={program._id}>
                                                        {program.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <Field label="Semester mapping" id="courseSemester" error={courseForm.formState.errors.semesterId?.message}>
                                <Controller
                                    control={courseForm.control}
                                    name="semesterId"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="courseSemester">
                                                <SelectValue placeholder="Select semester mapping" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredSemestersForCourse.map((semester) => (
                                                    <SelectItem key={semester._id} value={semester._id}>
                                                        Sem {semester.semesterNumber} - {semesterYearLabel(semester.academicYearId)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Course type" id="courseType" error={courseForm.formState.errors.courseType?.message}>
                                    <Controller
                                        control={courseForm.control}
                                        name="courseType"
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger id="courseType">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Theory">Theory</SelectItem>
                                                    <SelectItem value="Lab">Lab</SelectItem>
                                                    <SelectItem value="Project">Project</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </Field>
                                <Field label="Credits" id="courseCredits" error={courseForm.formState.errors.credits?.message}>
                                    <Input id="courseCredits" type="number" min={0} {...courseForm.register("credits", { valueAsNumber: true })} />
                                </Field>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                                <input type="checkbox" {...courseForm.register("isActive")} />
                                Active course
                            </label>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Spinner /> : null}
                                    {editingCourseId ? "Update Course" : "Create Course"}
                                </Button>
                                {editingCourseId ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setEditingCourseId(null);
                                            courseForm.reset({
                                                name: "",
                                                programId: "",
                                                semesterId: "",
                                                subjectCode: "",
                                                courseType: "Theory",
                                                credits: 0,
                                                isActive: true,
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_220px_200px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-400" />
                                <Input
                                    value={courseQuery}
                                    onChange={(event) => {
                                        setCourseQuery(event.target.value);
                                        setCoursePage(1);
                                    }}
                                    className="pl-9"
                                    placeholder="Search course, code, program"
                                />
                            </div>
                            <Select
                                value={courseStatusFilter}
                                onValueChange={(value: "all" | "active" | "inactive") => {
                                    setCourseStatusFilter(value);
                                    setCoursePage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="active">Active only</SelectItem>
                                    <SelectItem value="inactive">Inactive only</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={courseTypeFilter}
                                onValueChange={(value: "all" | CourseRecord["courseType"]) => {
                                    setCourseTypeFilter(value);
                                    setCoursePage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="Theory">Theory</SelectItem>
                                    <SelectItem value="Lab">Lab</SelectItem>
                                    <SelectItem value="Project">Project</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-lg border border-zinc-200">
                            <Table disableContainer className="min-w-[980px]">
                                <TableHeader className="sticky top-0 z-10 bg-white">
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Semester Mapping</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {pagedCourses.items.length ? pagedCourses.items.map((course) => (
                                    <TableRow key={course._id}>
                                        <TableCell>
                                            <p className="font-medium text-zinc-900">{course.name}</p>
                                            <p className="text-xs text-zinc-500">
                                                {course.subjectCode || "No code"} • {course.courseType} • {course.credits} credits
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {(typeof course.programId === "string" ? course.programId : course.programId?.name) ?? "-"}
                                        </TableCell>
                                        <TableCell>{courseSemesterLabel(course)}</TableCell>
                                        <TableCell>
                                            <Badge className={course.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                                                {course.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingCourseId(course._id);
                                                        courseForm.reset({
                                                            name: course.name,
                                                            subjectCode: course.subjectCode ?? "",
                                                            programId: unwrapId(course.programId),
                                                            semesterId: unwrapId(course.semesterId),
                                                            courseType: course.courseType,
                                                            credits: course.credits,
                                                            isActive: course.isActive,
                                                        });
                                                    }}
                                                >
                                                    <Pencil className="mr-2 size-4" />
                                                    Edit
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => deleteCourse(course._id)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500">
                                            No courses match your search/filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>

                        <PaginationControls
                            itemLabel="courses"
                            totalItems={filteredCourses.length}
                            page={pagedCourses.safePage}
                            pageCount={pagedCourses.pageCount}
                            onPageChange={setCoursePage}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
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
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
    );
}

function PaginationControls({
    itemLabel,
    totalItems,
    page,
    pageCount,
    onPageChange,
}: {
    itemLabel: string;
    totalItems: number;
    page: number;
    pageCount: number;
    onPageChange: (nextPage: number) => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
            <div className="text-zinc-600">
                Showing {totalItems ? `${Math.min((page - 1) * PAGE_SIZE + 1, totalItems)}-${Math.min(page * PAGE_SIZE, totalItems)}` : "0"} of {totalItems} {itemLabel}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    <ChevronLeft className="mr-1 size-4" />
                    Prev
                </Button>
                <Badge variant="secondary">
                    Page {page} / {pageCount}
                </Badge>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= pageCount}
                >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                </Button>
            </div>
        </div>
    );
}
