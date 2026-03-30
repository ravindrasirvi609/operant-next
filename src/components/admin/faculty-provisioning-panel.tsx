"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import * as XLSX from "xlsx";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminFacultyProvisionSchema } from "@/lib/admin/validators";
import { designationOptions } from "@/lib/faculty/options";

type Option = {
    key: string;
    label: string;
    code?: string;
};

type FacultyProvisionValues = z.input<typeof adminFacultyProvisionSchema>;
type FacultyProvisionResolvedValues = z.output<typeof adminFacultyProvisionSchema>;
type BulkFacultyImportRow = FacultyProvisionResolvedValues & {
    rowNumber: number;
};
type BulkFacultyFailure = {
    rowNumber: number;
    employeeCode?: string;
    email?: string;
    message: string;
};
type BulkFacultyResponse = {
    created: Array<{
        _id: string;
        email: string;
    }>;
    failed: BulkFacultyFailure[];
};

const templateHeaders = [
    "firstName",
    "lastName",
    "employeeCode",
    "email",
    "mobile",
    "universityName",
    "collegeName",
    "department",
    "designation",
    "employmentType",
    "joiningDate",
    "highestQualification",
    "specialization",
    "experienceYears",
] as const;

const templateRows = [
    {
        firstName: "Ananya",
        lastName: "Rao",
        employeeCode: "CSE-FAC-001",
        email: "ananya.rao@college.edu",
        mobile: "9876543210",
        universityName: "North Campus University",
        collegeName: "School of Engineering",
        department: "Computer Science and Engineering",
        designation: "Associate Professor",
        employmentType: "Permanent",
        joiningDate: "2021-07-01",
        highestQualification: "Ph.D.",
        specialization: "Artificial Intelligence",
        experienceYears: 8,
    },
];

function normalizeHeader(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "");
}

function toOptionalString(value: unknown) {
    if (value === undefined || value === null) {
        return undefined;
    }

    const text = String(value).trim();
    return text.length ? text : undefined;
}

function parseNumberCell(value: unknown) {
    const text = toOptionalString(value);
    if (!text) {
        return 0;
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseBulkFacultyWorkbook(file: File) {
    return file.arrayBuffer().then((arrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error("The uploaded Excel file does not contain any worksheet.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: "",
            raw: false,
        });

        if (!rows.length) {
            throw new Error("The selected Excel file has no data rows.");
        }

        const parsedRows: BulkFacultyImportRow[] = [];
        const rowErrors: string[] = [];

        rows.forEach((row, index) => {
            const rowNumber = index + 2;
            const normalizedRow: Record<string, unknown> = {};

            Object.entries(row).forEach(([key, value]) => {
                normalizedRow[normalizeHeader(key)] = value;
            });

            const payload = {
                firstName: toOptionalString(normalizedRow.firstname),
                lastName: toOptionalString(normalizedRow.lastname),
                employeeCode: toOptionalString(normalizedRow.employeecode),
                email: toOptionalString(normalizedRow.email),
                mobile: toOptionalString(normalizedRow.mobile),
                universityName: toOptionalString(normalizedRow.universityname),
                collegeName: toOptionalString(normalizedRow.collegename),
                department: toOptionalString(normalizedRow.department),
                designation: toOptionalString(normalizedRow.designation),
                employmentType: toOptionalString(normalizedRow.employmenttype) ?? "Permanent",
                joiningDate: toOptionalString(normalizedRow.joiningdate),
                highestQualification: toOptionalString(normalizedRow.highestqualification),
                specialization: toOptionalString(normalizedRow.specialization),
                experienceYears: parseNumberCell(normalizedRow.experienceyears),
            };

            if (
                !payload.firstName &&
                !payload.employeeCode &&
                !payload.email &&
                !payload.department &&
                !payload.designation
            ) {
                return;
            }

            if (payload.experienceYears === null) {
                rowErrors.push(`Row ${rowNumber}: experienceYears must be a valid number.`);
                return;
            }

            const parsed = adminFacultyProvisionSchema.safeParse(payload);

            if (!parsed.success) {
                rowErrors.push(
                    `Row ${rowNumber}: ${parsed.error.issues[0]?.message ?? "Invalid faculty row."}`
                );
                return;
            }

            parsedRows.push({
                rowNumber,
                ...parsed.data,
            });
        });

        if (rowErrors.length) {
            const preview = rowErrors.slice(0, 4).join(" ");
            const suffix =
                rowErrors.length > 4 ? ` (+${rowErrors.length - 4} more row issues)` : "";
            throw new Error(`${preview}${suffix}`);
        }

        if (!parsedRows.length) {
            throw new Error("No valid faculty rows found in the uploaded Excel file.");
        }

        return parsedRows;
    });
}

function downloadFacultyProvisionTemplate() {
    const workbook = XLSX.utils.book_new();
    const templateSheet = XLSX.utils.json_to_sheet(templateRows, {
        header: [...templateHeaders],
    });
    templateSheet["!cols"] = [
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 28 },
        { wch: 16 },
        { wch: 28 },
        { wch: 28 },
        { wch: 30 },
        { wch: 24 },
        { wch: 16 },
        { wch: 14 },
        { wch: 20 },
        { wch: 22 },
        { wch: 14 },
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet([
        ["Faculty Bulk Provisioning Instructions"],
        ["1. Keep header names unchanged."],
        ["2. employeeCode and email must be unique."],
        ["3. Faculty accounts are created in activation-pending state."],
        ["4. Upload this file from Admin > Users > Provision faculty record."],
    ]);

    XLSX.utils.book_append_sheet(workbook, templateSheet, "FacultyTemplate");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
    XLSX.writeFile(workbook, "faculty-provisioning-template.xlsx");
}

async function requestJson(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    const data = (await response.json()) as { message?: string };

    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

export function FacultyProvisioningPanel({
    universityOptions,
    collegeOptions,
    departmentOptions,
}: {
    universityOptions: Option[];
    collegeOptions: Option[];
    departmentOptions: Option[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isBulkPending, startBulkTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [bulkMessage, setBulkMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [bulkFailures, setBulkFailures] = useState<BulkFacultyFailure[]>([]);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [fileInputVersion, setFileInputVersion] = useState(0);

    const form = useForm<FacultyProvisionValues, unknown, FacultyProvisionResolvedValues>({
        resolver: zodResolver(adminFacultyProvisionSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            employeeCode: "",
            email: "",
            mobile: "",
            universityName: universityOptions[0]?.label ?? "",
            collegeName: collegeOptions[0]?.label ?? "",
            department: departmentOptions[0]?.label ?? "",
            designation: "",
            employmentType: "Permanent",
            joiningDate: "",
            highestQualification: "",
            specialization: "",
            experienceYears: 0,
        },
    });

    function onSubmit(values: FacultyProvisionResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch("/api/admin/users/faculty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                setMessage({
                    type: "error",
                    text: data.message ?? "Unable to provision faculty account.",
                });
                return;
            }

            form.reset({
                ...form.getValues(),
                firstName: "",
                lastName: "",
                employeeCode: "",
                email: "",
                mobile: "",
                designation: "",
                joiningDate: "",
                highestQualification: "",
                specialization: "",
                experienceYears: 0,
            });
            setMessage({
                type: "success",
                text:
                    data.message ??
                    "Faculty record and activation-pending login account created successfully.",
            });
            router.refresh();
        });
    }

    function onBulkFileChange(event: ChangeEvent<HTMLInputElement>) {
        setBulkFile(event.target.files?.[0] ?? null);
        setBulkMessage(null);
        setBulkFailures([]);
    }

    function onBulkSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!bulkFile) {
            setBulkMessage({
                type: "error",
                text: "Select an Excel file before starting bulk import.",
            });
            return;
        }

        setBulkMessage(null);
        setBulkFailures([]);

        startBulkTransition(async () => {
            try {
                const parsedRows = await parseBulkFacultyWorkbook(bulkFile);
                const result = (await requestJson("/api/admin/users/bulk-faculty", {
                    method: "POST",
                    body: JSON.stringify({ entries: parsedRows }),
                })) as BulkFacultyResponse;

                setBulkFailures(result.failed);

                if (!result.created.length && result.failed.length) {
                    setBulkMessage({
                        type: "error",
                        text: `Import failed. ${result.failed.length} row(s) need correction.`,
                    });
                    return;
                }

                if (result.failed.length) {
                    setBulkMessage({
                        type: "error",
                        text: `Imported ${result.created.length} faculty row(s). ${result.failed.length} row(s) were skipped.`,
                    });
                    router.refresh();
                    return;
                }

                setBulkMessage({
                    type: "success",
                    text: `Imported ${result.created.length} faculty row(s) successfully.`,
                });
                setBulkFile(null);
                setFileInputVersion((current) => current + 1);
                router.refresh();
            } catch (error) {
                setBulkMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to import the uploaded Excel file.",
                });
            }
        });
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <Card>
                <CardHeader>
                    <CardTitle>Provision faculty record</CardTitle>
                    <CardDescription>
                        Create the institutional faculty identity first. The login account will be auto-created in activation-pending state for first-time setup.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="First name" id="faculty-first-name" error={form.formState.errors.firstName?.message}>
                                <Input id="faculty-first-name" {...form.register("firstName")} />
                            </Field>
                            <Field label="Last name" id="faculty-last-name" error={form.formState.errors.lastName?.message}>
                                <Input id="faculty-last-name" {...form.register("lastName")} />
                            </Field>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <Field label="Employee code" id="faculty-employee-code" error={form.formState.errors.employeeCode?.message}>
                                <Input id="faculty-employee-code" placeholder="CSE-FAC-001" {...form.register("employeeCode")} />
                            </Field>
                            <Field label="Institution email" id="faculty-email" error={form.formState.errors.email?.message}>
                                <Input id="faculty-email" type="email" {...form.register("email")} />
                            </Field>
                            <Field label="Mobile" id="faculty-mobile" error={form.formState.errors.mobile?.message}>
                                <Input id="faculty-mobile" {...form.register("mobile")} />
                            </Field>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <SelectField control={form.control} error={form.formState.errors.universityName?.message} id="faculty-university" label="University" name="universityName" options={universityOptions} />
                            <SelectField control={form.control} error={form.formState.errors.collegeName?.message} id="faculty-college" label="College" name="collegeName" options={collegeOptions} />
                            <SelectField control={form.control} error={form.formState.errors.department?.message} id="faculty-department" label="Department" name="department" options={departmentOptions} />
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <DesignationField control={form.control} error={form.formState.errors.designation?.message} />
                            <Field label="Joining date" id="faculty-joining-date" error={form.formState.errors.joiningDate?.message}>
                                <Input id="faculty-joining-date" type="date" {...form.register("joiningDate")} />
                            </Field>
                            <Field label="Experience years" id="faculty-experience-years" error={form.formState.errors.experienceYears?.message}>
                                <Input id="faculty-experience-years" type="number" min={0} {...form.register("experienceYears", { valueAsNumber: true })} />
                            </Field>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <EmploymentTypeField control={form.control} error={form.formState.errors.employmentType?.message} />
                            <Field label="Highest qualification" id="faculty-qualification" error={form.formState.errors.highestQualification?.message}>
                                <Input id="faculty-qualification" placeholder="Ph.D." {...form.register("highestQualification")} />
                            </Field>
                            <Field label="Specialization" id="faculty-specialization" error={form.formState.errors.specialization?.message}>
                                <Input id="faculty-specialization" placeholder="Artificial Intelligence" {...form.register("specialization")} />
                            </Field>
                        </div>

                        <Button className="w-full md:w-fit" disabled={isPending} type="submit">
                            {isPending ? <Spinner /> : null}
                            Create Faculty + Activation Account
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="size-5 text-zinc-700" />
                        Bulk import from Excel
                    </CardTitle>
                    <CardDescription>
                        Download the sample sheet, fill faculty rows, then upload to provision multiple faculty identities and activation-pending accounts in one step.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Required headers
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{templateHeaders.join(", ")}</p>
                    </div>

                    <Button className="w-full" onClick={downloadFacultyProvisionTemplate} type="button" variant="outline">
                        <Download className="size-4" />
                        Download Sample Excel
                    </Button>

                    {bulkMessage ? <FormMessage message={bulkMessage.text} type={bulkMessage.type} /> : null}

                    <form className="space-y-4" onSubmit={onBulkSubmit}>
                        <Field label="Upload file" id="faculty-bulk-upload">
                            <Input accept=".xlsx,.xls,.csv" id="faculty-bulk-upload" key={fileInputVersion} onChange={onBulkFileChange} type="file" />
                        </Field>

                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                            {bulkFile ? `Selected: ${bulkFile.name}` : "Select a .xlsx/.xls/.csv file to start bulk import."}
                        </div>

                        <Button className="w-full" disabled={!bulkFile || isBulkPending} type="submit">
                            {isBulkPending ? <Spinner /> : <UploadCloud className="size-4" />}
                            Import Bulk Faculty
                        </Button>
                    </form>

                    {bulkFailures.length ? (
                        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <p className="text-sm font-semibold text-rose-900">
                                Failed rows ({bulkFailures.length})
                            </p>
                            <div className="max-h-48 space-y-1 overflow-auto text-xs text-rose-800">
                                {bulkFailures.slice(0, 10).map((failure) => (
                                    <p key={`${failure.rowNumber}-${failure.employeeCode || failure.email || "na"}-${failure.message}`}>
                                        Row {failure.rowNumber}: {failure.message}
                                    </p>
                                ))}
                                {bulkFailures.length > 10 ? <p>+{bulkFailures.length - 10} more rows</p> : null}
                            </div>
                        </div>
                    ) : null}
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
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
    );
}

function SelectField({
    control,
    error,
    id,
    label,
    name,
    options,
}: {
    control: ReturnType<typeof useForm<FacultyProvisionValues>>["control"];
    error?: string;
    id: string;
    label: string;
    name: "universityName" | "collegeName" | "department";
    options: Option[];
}) {
    return (
        <Field label={label} id={id} error={error}>
            <Controller
                control={control}
                name={name}
                render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id={id} className="w-full">
                            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((item) => (
                                <SelectItem key={item.key} value={item.label}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
        </Field>
    );
}

function EmploymentTypeField({
    control,
    error,
}: {
    control: ReturnType<typeof useForm<FacultyProvisionValues>>["control"];
    error?: string;
}) {
    return (
        <Field label="Employment type" id="faculty-employment-type" error={error}>
            <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="faculty-employment-type" className="w-full">
                            <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Permanent">Permanent</SelectItem>
                            <SelectItem value="AdHoc">AdHoc</SelectItem>
                            <SelectItem value="Guest">Guest</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
        </Field>
    );
}

function DesignationField({
    control,
    error,
}: {
    control: ReturnType<typeof useForm<FacultyProvisionValues>>["control"];
    error?: string;
}) {
    return (
        <Field label="Designation" id="faculty-designation" error={error}>
            <Controller
                control={control}
                name="designation"
                render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="faculty-designation" className="w-full">
                            <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                        <SelectContent>
                            {designationOptions.map((designation) => (
                                <SelectItem key={designation} value={designation}>
                                    {designation}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
        </Field>
    );
}
