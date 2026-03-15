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
import { adminStudentProvisionSchema } from "@/lib/admin/validators";

type Option = {
    key: string;
    label: string;
    code?: string;
};

type StudentProvisionValues = z.input<typeof adminStudentProvisionSchema>;
type StudentProvisionResolvedValues = z.output<typeof adminStudentProvisionSchema>;
type BulkStudentImportRow = StudentProvisionResolvedValues & {
    rowNumber: number;
};
type BulkStudentFailure = {
    rowNumber: number;
    enrollmentNo?: string;
    email?: string;
    message: string;
};
type BulkStudentResponse = {
    created: Array<{
        _id: string;
        email: string;
    }>;
    failed: BulkStudentFailure[];
};
type ParsedNumberResult =
    | {
          value: number;
          error?: never;
      }
    | {
          value?: never;
          error: string;
      };

const templateHeaders = [
    "firstName",
    "lastName",
    "enrollmentNo",
    "email",
    "mobile",
    "universityName",
    "collegeName",
    "department",
    "course",
    "durationYears",
    "admissionYear",
] as const;

const templateRows = [
    {
        firstName: "Ravi",
        lastName: "Kumar",
        enrollmentNo: "CSE2024001",
        email: "ravi@college.edu",
        mobile: "9876543210",
        universityName: "North Campus University",
        collegeName: "School of Engineering",
        department: "Computer Science and Engineering",
        course: "B.Tech CSE",
        durationYears: 4,
        admissionYear: 2024,
    },
    {
        firstName: "Ananya",
        lastName: "Sharma",
        enrollmentNo: "ECE2024002",
        email: "ananya@college.edu",
        mobile: "9876543211",
        universityName: "North Campus University",
        collegeName: "School of Engineering",
        department: "Electronics and Communication Engineering",
        course: "B.Tech ECE",
        durationYears: 4,
        admissionYear: 2024,
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

function getWorkbookCell(
    row: Record<string, unknown>,
    ...keys: string[]
) {
    for (const key of keys) {
        const value = row[key];
        if (toOptionalString(value)) {
            return value;
        }
    }

    return undefined;
}

function parseRequiredNumber(
    value: unknown,
    fieldLabel: string,
    rowNumber: number
): ParsedNumberResult {
    const text = toOptionalString(value);

    if (!text) {
        return {
            error: `Row ${rowNumber}: ${fieldLabel} is required.`,
        } as const;
    }

    const parsed = Number(text);

    if (!Number.isFinite(parsed)) {
        return {
            error: `Row ${rowNumber}: ${fieldLabel} must be a valid number.`,
        } as const;
    }

    return {
        value: parsed,
    } as const;
}

function parseBulkStudentWorkbook(file: File) {
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

        const parsedRows: BulkStudentImportRow[] = [];
        const rowErrors: string[] = [];

        rows.forEach((row, index) => {
            const rowNumber = index + 2;
            const normalizedRow: Record<string, unknown> = {};

            Object.entries(row).forEach(([key, value]) => {
                normalizedRow[normalizeHeader(key)] = value;
            });

            const firstName = toOptionalString(
                getWorkbookCell(normalizedRow, "firstname", "givenname")
            );
            const lastName = toOptionalString(
                getWorkbookCell(normalizedRow, "lastname", "surname", "familyname")
            );
            const enrollmentNo = toOptionalString(
                getWorkbookCell(
                    normalizedRow,
                    "enrollmentno",
                    "enrollmentnumber",
                    "rollno",
                    "rollnumber"
                )
            );
            const email = toOptionalString(getWorkbookCell(normalizedRow, "email", "institutionemail"));
            const mobile = toOptionalString(
                getWorkbookCell(normalizedRow, "mobile", "mobileno", "phonenumber", "phone")
            );
            const universityName = toOptionalString(
                getWorkbookCell(normalizedRow, "universityname", "university", "institution")
            );
            const collegeName = toOptionalString(
                getWorkbookCell(normalizedRow, "collegename", "college", "school")
            );
            const department = toOptionalString(
                getWorkbookCell(normalizedRow, "department", "departmentname")
            );
            const course = toOptionalString(
                getWorkbookCell(normalizedRow, "course", "program", "programname")
            );

            if (
                !firstName &&
                !lastName &&
                !enrollmentNo &&
                !email &&
                !mobile &&
                !universityName &&
                !collegeName &&
                !department &&
                !course
            ) {
                return;
            }

            const durationYearsResult = parseRequiredNumber(
                getWorkbookCell(normalizedRow, "durationyears", "duration"),
                "durationYears",
                rowNumber
            );
            if (durationYearsResult.error !== undefined) {
                rowErrors.push(durationYearsResult.error);
                return;
            }

            const admissionYearResult = parseRequiredNumber(
                getWorkbookCell(normalizedRow, "admissionyear", "yearofadmission"),
                "admissionYear",
                rowNumber
            );
            if (admissionYearResult.error !== undefined) {
                rowErrors.push(admissionYearResult.error);
                return;
            }

            const parsedRow = adminStudentProvisionSchema.safeParse({
                firstName,
                lastName,
                enrollmentNo,
                email,
                mobile,
                universityName,
                collegeName,
                department,
                course,
                durationYears: durationYearsResult.value,
                admissionYear: admissionYearResult.value,
            });

            if (!parsedRow.success) {
                const firstIssue = parsedRow.error.issues[0];
                rowErrors.push(
                    `Row ${rowNumber}: ${firstIssue?.message ?? "Invalid student import row."}`
                );
                return;
            }

            parsedRows.push({
                rowNumber,
                ...parsedRow.data,
            });
        });

        if (rowErrors.length) {
            const preview = rowErrors.slice(0, 4).join(" ");
            const suffix =
                rowErrors.length > 4
                    ? ` (+${rowErrors.length - 4} more row issues)`
                    : "";
            throw new Error(`${preview}${suffix}`);
        }

        if (!parsedRows.length) {
            throw new Error("No valid student rows found in the uploaded Excel file.");
        }

        return parsedRows;
    });
}

function downloadStudentProvisionTemplate() {
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
        { wch: 32 },
        { wch: 20 },
        { wch: 14 },
        { wch: 14 },
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet([
        ["Student Bulk Provisioning Instructions"],
        ["1. Keep header names unchanged."],
        ["2. firstName, enrollmentNo, email, mobile, universityName, collegeName, department, course, durationYears, and admissionYear are required."],
        ["3. Student records will auto-create activation-pending login accounts."],
        ["4. Duplicate institutional email or enrollment number rows will be skipped."],
        ["5. Upload this file from Admin > Users > Provision student record."],
        [""],
        ["Supported file types: .xlsx, .xls, .csv"],
    ]);

    XLSX.utils.book_append_sheet(workbook, templateSheet, "StudentTemplate");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
    XLSX.writeFile(workbook, "student-provisioning-template.xlsx");
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

export function StudentProvisioningPanel({
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
    const [bulkFailures, setBulkFailures] = useState<BulkStudentFailure[]>([]);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [fileInputVersion, setFileInputVersion] = useState(0);

    const form = useForm<StudentProvisionValues, unknown, StudentProvisionResolvedValues>({
        resolver: zodResolver(adminStudentProvisionSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            enrollmentNo: "",
            email: "",
            mobile: "",
            universityName: universityOptions[0]?.label ?? "",
            collegeName: collegeOptions[0]?.label ?? "",
            department: departmentOptions[0]?.label ?? "",
            course: "",
            durationYears: 4,
            admissionYear: new Date().getFullYear(),
        },
    });

    function onSubmit(values: StudentProvisionResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                setMessage({
                    type: "error",
                    text: data.message ?? "Unable to provision student account.",
                });
                return;
            }

            form.reset({
                ...form.getValues(),
                firstName: "",
                lastName: "",
                enrollmentNo: "",
                email: "",
                mobile: "",
                course: "",
                durationYears: 4,
                admissionYear: new Date().getFullYear(),
            });
            setMessage({
                type: "success",
                text:
                    data.message ??
                    "Student record and activation-pending login account created successfully.",
            });
            router.refresh();
        });
    }

    function onBulkFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;
        setBulkFile(file);
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
                const parsedRows = await parseBulkStudentWorkbook(bulkFile);
                const result = (await requestJson("/api/admin/users/bulk-students", {
                    method: "POST",
                    body: JSON.stringify({ entries: parsedRows }),
                })) as BulkStudentResponse;

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
                        text: `Imported ${result.created.length} student row(s). ${result.failed.length} row(s) were skipped.`,
                    });
                    router.refresh();
                    return;
                }

                setBulkMessage({
                    type: "success",
                    text: `Imported ${result.created.length} student row(s) successfully.`,
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
                    <CardTitle>Provision student record</CardTitle>
                    <CardDescription>
                        Create the institutional student identity first. The login account will be auto-created in activation-pending state for first-time setup.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="First name" id="student-first-name" error={form.formState.errors.firstName?.message}>
                                <Input id="student-first-name" {...form.register("firstName")} />
                            </Field>
                            <Field label="Last name" id="student-last-name" error={form.formState.errors.lastName?.message}>
                                <Input id="student-last-name" {...form.register("lastName")} />
                            </Field>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <Field label="Enrollment No." id="student-enrollment" error={form.formState.errors.enrollmentNo?.message}>
                                <Input id="student-enrollment" placeholder="CSE2024001" {...form.register("enrollmentNo")} />
                            </Field>
                            <Field label="Institution email" id="student-email" error={form.formState.errors.email?.message}>
                                <Input id="student-email" type="email" {...form.register("email")} />
                            </Field>
                            <Field label="Mobile" id="student-mobile" error={form.formState.errors.mobile?.message}>
                                <Input id="student-mobile" {...form.register("mobile")} />
                            </Field>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <SelectField
                                control={form.control}
                                error={form.formState.errors.universityName?.message}
                                id="student-university"
                                label="University"
                                name="universityName"
                                options={universityOptions}
                            />
                            <SelectField
                                control={form.control}
                                error={form.formState.errors.collegeName?.message}
                                id="student-college"
                                label="College"
                                name="collegeName"
                                options={collegeOptions}
                            />
                            <SelectField
                                control={form.control}
                                error={form.formState.errors.department?.message}
                                id="student-department"
                                label="Department"
                                name="department"
                                options={departmentOptions}
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <Field label="Program / Course" id="student-course" error={form.formState.errors.course?.message}>
                                <Input id="student-course" placeholder="B.Tech CSE" {...form.register("course")} />
                            </Field>
                            <Field label="Duration (years)" id="student-duration" error={form.formState.errors.durationYears?.message}>
                                <Input id="student-duration" type="number" min={1} max={10} {...form.register("durationYears", { valueAsNumber: true })} />
                            </Field>
                            <Field label="Admission year" id="student-admission-year" error={form.formState.errors.admissionYear?.message}>
                                <Input id="student-admission-year" type="number" min={1900} max={9999} {...form.register("admissionYear", { valueAsNumber: true })} />
                            </Field>
                        </div>

                        <Button className="w-full md:w-fit" disabled={isPending} type="submit">
                            {isPending ? <Spinner /> : null}
                            Create Student + Activation Account
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
                        Download the sample sheet, fill student rows, then upload to provision multiple student identities and activation-pending accounts in one step.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Required headers
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">
                            {templateHeaders.join(", ")}
                        </p>
                    </div>

                    <Button
                        className="w-full"
                        onClick={downloadStudentProvisionTemplate}
                        type="button"
                        variant="outline"
                    >
                        <Download className="size-4" />
                        Download Sample Excel
                    </Button>

                    {bulkMessage ? (
                        <FormMessage message={bulkMessage.text} type={bulkMessage.type} />
                    ) : null}

                    <form className="space-y-4" onSubmit={onBulkSubmit}>
                        <Field label="Upload file" id="student-bulk-upload">
                            <Input
                                accept=".xlsx,.xls,.csv"
                                id="student-bulk-upload"
                                key={fileInputVersion}
                                onChange={onBulkFileChange}
                                type="file"
                            />
                        </Field>

                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                            {bulkFile
                                ? `Selected: ${bulkFile.name}`
                                : "Select a .xlsx/.xls/.csv file to start bulk import."}
                        </div>

                        <Button className="w-full" disabled={!bulkFile || isBulkPending} type="submit">
                            {isBulkPending ? <Spinner /> : <UploadCloud className="size-4" />}
                            Import Bulk Students
                        </Button>
                    </form>

                    {bulkFailures.length ? (
                        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <p className="text-sm font-semibold text-rose-900">
                                Failed rows ({bulkFailures.length})
                            </p>
                            <div className="max-h-48 space-y-1 overflow-auto text-xs text-rose-800">
                                {bulkFailures.slice(0, 10).map((failure) => (
                                    <p
                                        key={`${failure.rowNumber}-${failure.enrollmentNo || failure.email || "na"}-${failure.message}`}
                                    >
                                        Row {failure.rowNumber}: {failure.message}
                                    </p>
                                ))}
                                {bulkFailures.length > 10 ? (
                                    <p>+{bulkFailures.length - 10} more rows</p>
                                ) : null}
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
    control: ReturnType<typeof useForm<StudentProvisionValues>>["control"];
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
