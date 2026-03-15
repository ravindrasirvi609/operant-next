"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    academicYearSchema,
    programSchema,
    semesterSchema,
} from "@/lib/admin/academics-validators";

type AcademicYearValues = z.input<typeof academicYearSchema>;
type AcademicYearResolvedValues = z.output<typeof academicYearSchema>;
type ProgramValues = z.input<typeof programSchema>;
type ProgramResolvedValues = z.output<typeof programSchema>;
type SemesterValues = z.input<typeof semesterSchema>;
type SemesterResolvedValues = z.output<typeof semesterSchema>;

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

function unwrapId(value?: { _id?: string } | string) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id ?? "";
}

export function AcademicsManager({
    initialAcademicYears,
    initialPrograms,
    initialSemesters,
    institutions,
    departments,
}: {
    initialAcademicYears: AcademicYearRecord[];
    initialPrograms: ProgramRecord[];
    initialSemesters: SemesterRecord[];
    institutions: InstitutionRecord[];
    departments: DepartmentRecord[];
}) {
    const [academicYears, setAcademicYears] = useState(initialAcademicYears);
    const [programs, setPrograms] = useState(initialPrograms);
    const [semesters, setSemesters] = useState(initialSemesters);

    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [programMessage, setProgramMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [semesterMessage, setSemesterMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [isPending, startTransition] = useTransition();

    const [editingAcademicYearId, setEditingAcademicYearId] = useState<string | null>(null);
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);

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
            degreeType: "",
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

    const selectedInstitutionId = programForm.watch("institutionId");
    const filteredDepartments = useMemo(() => {
        if (!selectedInstitutionId) return departments;
        return departments.filter((dept) => unwrapId(dept.institutionId) === selectedInstitutionId);
    }, [departments, selectedInstitutionId]);

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
                academicYearForm.reset();
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

    function handleProgramSubmit(values: ProgramResolvedValues) {
        setProgramMessage(null);
        startTransition(async () => {
            try {
                if (editingProgramId) {
                    const data = await requestJson<{ program: ProgramRecord }>(
                        `/api/admin/programs/${editingProgramId}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify(values),
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
                            body: JSON.stringify(values),
                        }
                    );
                    setPrograms((current) => [data.program, ...current]);
                    setProgramMessage({ type: "success", text: "Program created. Semesters auto-generated." });
                    const semesterData = await requestJson<{ semesters: SemesterRecord[] }>(
                        "/api/admin/semesters"
                    );
                    setSemesters(semesterData.semesters);
                }
                setEditingProgramId(null);
                programForm.reset();
            } catch (error) {
                setProgramMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save program.",
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
                semesterForm.reset();
            } catch (error) {
                setSemesterMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save semester.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Academic Years</CardTitle>
                    <CardDescription>
                        Create academic years and choose the single active year for reporting modules.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[360px_1fr]">
                    <div className="space-y-4">
                        {message ? <FormMessage message={message.text} type={message.type} /> : null}
                        <form
                            className="grid gap-4"
                            onSubmit={academicYearForm.handleSubmit(handleAcademicYearSubmit)}
                        >
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
                                            academicYearForm.reset();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                    <div className="grid gap-3">
                        {academicYears.map((year) => (
                            <div key={year._id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-zinc-950">
                                            {year.yearStart}-{year.yearEnd}
                                        </p>
                                        {year.isActive ? (
                                            <Badge className="mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge className="mt-2">Inactive</Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                setEditingAcademicYearId(year._id);
                                                academicYearForm.reset({
                                                    yearStart: year.yearStart,
                                                    yearEnd: year.yearEnd,
                                                    isActive: year.isActive,
                                                });
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        {!year.isActive ? (
                                            <Button type="button" onClick={() => setActiveYear(year._id)}>
                                                Set Active
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Programs</CardTitle>
                    <CardDescription>
                        Create programs and auto-generate semester mappings based on the start academic year.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[400px_1fr]">
                    <div className="space-y-4">
                        {programMessage ? <FormMessage message={programMessage.text} type={programMessage.type} /> : null}
                        <form
                            className="grid gap-4"
                            onSubmit={programForm.handleSubmit(handleProgramSubmit)}
                        >
                            <Field label="Program name" id="programName" error={programForm.formState.errors.name?.message}>
                                <Input id="programName" {...programForm.register("name")} />
                            </Field>
                            <Field label="Institution" id="programInstitution" error={programForm.formState.errors.institutionId?.message}>
                                <Controller
                                    control={programForm.control}
                                    name="institutionId"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="programInstitution">
                                                <SelectValue placeholder="Select institution" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {institutions.map((inst) => (
                                                    <SelectItem key={inst._id} value={inst._id}>
                                                        {inst.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
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
                                                {filteredDepartments.map((dept) => (
                                                    <SelectItem key={dept._id} value={dept._id}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>
                            <Field label="Start academic year" id="startAcademicYear" error={programForm.formState.errors.startAcademicYearId?.message}>
                                <Controller
                                    control={programForm.control}
                                    name="startAcademicYearId"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="startAcademicYear">
                                                <SelectValue placeholder="Select academic year" />
                                            </SelectTrigger>
                                            <SelectContent>
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
                                <Input id="degreeType" {...programForm.register("degreeType")} placeholder="B.Tech / BSc / MBA" />
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
                                            programForm.reset();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                    <div className="grid gap-3">
                        {programs.map((program) => (
                            <div key={program._id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-zinc-950">{program.name}</p>
                                        <p className="mt-1 text-sm text-zinc-500">
                                            {program.degreeType} • {program.durationYears} years
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-500">
                                            {typeof program.departmentId === "string"
                                                ? program.departmentId
                                                : program.departmentId?.name}{" "}
                                            •{" "}
                                            {typeof program.institutionId === "string"
                                                ? program.institutionId
                                                : program.institutionId?.name}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            Start year: {yearLabel(program.startAcademicYearId)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={
                                                program.isActive
                                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                                    : ""
                                            }
                                        >
                                            {program.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                setEditingProgramId(program._id);
                                                programForm.reset({
                                                    name: program.name,
                                                    degreeType: program.degreeType,
                                                    durationYears: program.durationYears,
                                                    isActive: program.isActive,
                                                    institutionId: unwrapId(program.institutionId),
                                                    departmentId: unwrapId(program.departmentId),
                                                    startAcademicYearId: unwrapId(program.startAcademicYearId),
                                                });
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Semesters</CardTitle>
                    <CardDescription>
                        Use this to correct or append semester mappings when program structures change.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[360px_1fr]">
                    <div className="space-y-4">
                        {semesterMessage ? <FormMessage message={semesterMessage.text} type={semesterMessage.type} /> : null}
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
                            <Field label="Academic year" id="semesterAcademicYear" error={semesterForm.formState.errors.academicYearId?.message}>
                                <Controller
                                    control={semesterForm.control}
                                    name="academicYearId"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="semesterAcademicYear">
                                                <SelectValue placeholder="Select academic year" />
                                            </SelectTrigger>
                                            <SelectContent>
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
                                            semesterForm.reset();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                    <div className="grid gap-3">
                        {semesters.map((semester) => (
                            <div key={semester._id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-zinc-950">Semester {semester.semesterNumber}</p>
                                        <p className="mt-1 text-sm text-zinc-500">
                                            {typeof semester.programId === "string"
                                                ? semester.programId
                                                : semester.programId?.name}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {yearLabel(semester.academicYearId)}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setEditingSemesterId(semester._id);
                                            semesterForm.reset({
                                                programId: unwrapId(semester.programId),
                                                academicYearId: unwrapId(semester.academicYearId),
                                                semesterNumber: semester.semesterNumber,
                                            });
                                        }}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        ))}
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
