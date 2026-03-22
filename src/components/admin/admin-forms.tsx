"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Bell,
    BookOpen,
    Briefcase,
    Building2,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    FileText,
    Landmark,
    Layers,
    Plus,
    Shield,
    UploadCloud,
    Users,
    type LucideIcon,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as XLSX from "xlsx";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    adminRoleOptions,
    adminUserUpdateSchema,
    masterDataSchema,
    systemUpdateSchema,
} from "@/lib/admin/validators";
import {
    adminBootstrapSchema,
    adminLoginSchema,
} from "@/lib/auth/validators";

type AdminLoginValues = z.infer<typeof adminLoginSchema>;
type AdminBootstrapValues = z.infer<typeof adminBootstrapSchema>;
type MasterDataValues = z.input<typeof masterDataSchema>;
type MasterDataResolvedValues = z.output<typeof masterDataSchema>;
type UserUpdateValues = z.infer<typeof adminUserUpdateSchema>;
type SystemUpdateValues = z.input<typeof systemUpdateSchema>;
type SystemUpdateResolvedValues = z.output<typeof systemUpdateSchema>;

type Option = {
    key: string;
    label: string;
    code?: string;
};

const emptySelectValue = "__none__";

type MasterDataEntry = {
    _id: string;
    category: string;
    key: string;
    label: string;
    code?: string;
    description?: string;
    parentCategory?: string;
    parentKey?: string;
    isActive: boolean;
    sortOrder: number;
    updatedAt: string;
};

type BulkMasterDataImportRow = {
    rowNumber: number;
    category: string;
    label: string;
    code?: string;
    description?: string;
    parentCategory?: string;
    parentKey?: string;
    sortOrder: number;
    isActive: boolean;
};

type BulkMasterDataFailure = {
    rowNumber: number;
    category?: string;
    label?: string;
    message: string;
};

type BulkMasterDataResponse = {
    created: MasterDataEntry[];
    failed: BulkMasterDataFailure[];
};

type UserRecord = {
    _id: string;
    name: string;
    email: string;
    role: string;
    accountStatus?: string;
    universityName?: string;
    collegeName?: string;
    department?: string;
    emailVerified: boolean;
    isActive: boolean;
    lastLoginAt?: string;
    studentSummary?: {
        enrollmentNo?: string;
    };
    facultySummary?: {
        employeeCode?: string;
        designation?: string;
    };
};

type SystemUpdateRecord = {
    _id: string;
    type: string;
    title?: string;
    category?: string;
    targetRoles: string[];
    isActive: boolean;
    expiresAt?: string;
    content?: unknown;
    createdAt: string;
};

const roleOptions = [...adminRoleOptions];
const templateHeaders = [
    "category",
    "label",
    "code",
    "description",
    "parentCategory",
    "parentKey",
    "sortOrder",
    "isActive",
] as const;

const templateRows = [
    {
        category: "academic-year",
        label: "2026-2027",
        code: "AY-2026-27",
        description: "Active academic year used for reporting and workflows.",
        parentCategory: "",
        parentKey: "",
        sortOrder: 1,
        isActive: true,
    },
    {
        category: "report-category",
        label: "AQAR",
        code: "AQAR",
        description: "Annual Quality Assurance reporting bucket.",
        parentCategory: "",
        parentKey: "",
        sortOrder: 1,
        isActive: true,
    },
    {
        category: "office",
        label: "IQAC",
        code: "IQAC",
        description: "Quality assurance office used in workflows and reporting.",
        parentCategory: "",
        parentKey: "",
        sortOrder: 10,
        isActive: true,
    },
];

const categoryVisuals: Record<
    string,
    {
        icon: LucideIcon;
        tone: string;
    }
> = {
    university: {
        icon: Landmark,
        tone: "border-indigo-200 bg-indigo-50 text-indigo-700",
    },
    college: {
        icon: Building2,
        tone: "border-sky-200 bg-sky-50 text-sky-700",
    },
    department: {
        icon: Layers,
        tone: "border-teal-200 bg-teal-50 text-teal-700",
    },
    "academic-year": {
        icon: CalendarDays,
        tone: "border-amber-200 bg-amber-50 text-amber-700",
    },
    "report-category": {
        icon: FileText,
        tone: "border-purple-200 bg-purple-50 text-purple-700",
    },
    "event-type": {
        icon: Calendar,
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    "program-type": {
        icon: BookOpen,
        tone: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
    "notification-category": {
        icon: Bell,
        tone: "border-orange-200 bg-orange-50 text-orange-700",
    },
    office: {
        icon: Briefcase,
        tone: "border-rose-200 bg-rose-50 text-rose-700",
    },
};

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

function normalizeToken(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

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

function parseBooleanCell(value: unknown) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        if (value === 1) {
            return true;
        }

        if (value === 0) {
            return false;
        }
    }

    const text = toOptionalString(value);

    if (!text) {
        return true;
    }

    const normalized = text.toLowerCase();
    if (["true", "yes", "y", "1", "active"].includes(normalized)) {
        return true;
    }

    if (["false", "no", "n", "0", "inactive"].includes(normalized)) {
        return false;
    }

    return null;
}

function parseSortOrderCell(value: unknown) {
    const text = toOptionalString(value);

    if (!text) {
        return 0;
    }

    const parsed = Number(text);

    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }

    return Math.floor(parsed);
}

function parseBulkMasterDataWorkbook(
    file: File,
    categories: { id: string; label: string }[]
) {
    return file.arrayBuffer().then((arrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error("The uploaded Excel file does not contain any worksheet.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: "",
        });

        if (!rows.length) {
            throw new Error("The selected Excel file has no data rows.");
        }

        const categoryLookup = new Map<string, string>();
        categories.forEach((category) => {
            categoryLookup.set(normalizeToken(category.id), category.id);
            categoryLookup.set(normalizeToken(category.label), category.id);
        });

        const parsedRows: BulkMasterDataImportRow[] = [];
        const rowErrors: string[] = [];

        rows.forEach((row, index) => {
            const rowNumber = index + 2;
            const normalizedRow: Record<string, unknown> = {};

            Object.entries(row).forEach(([key, value]) => {
                normalizedRow[normalizeHeader(key)] = value;
            });

            const categoryValue = toOptionalString(
                normalizedRow.category ?? normalizedRow.categoryname
            );
            const label = toOptionalString(normalizedRow.label ?? normalizedRow.name);

            // Ignore completely empty rows.
            if (!categoryValue && !label) {
                return;
            }

            if (!categoryValue) {
                rowErrors.push(`Row ${rowNumber}: category is required.`);
                return;
            }

            const category = categoryLookup.get(normalizeToken(categoryValue));

            if (!category) {
                rowErrors.push(
                    `Row ${rowNumber}: unknown category "${categoryValue}".`
                );
                return;
            }

            if (!label) {
                rowErrors.push(`Row ${rowNumber}: label is required.`);
                return;
            }

            const parentCategoryValue = toOptionalString(normalizedRow.parentcategory);
            const parentCategory = parentCategoryValue
                ? categoryLookup.get(normalizeToken(parentCategoryValue))
                : undefined;

            if (parentCategoryValue && !parentCategory) {
                rowErrors.push(
                    `Row ${rowNumber}: unknown parent category "${parentCategoryValue}".`
                );
                return;
            }

            const sortOrder = parseSortOrderCell(normalizedRow.sortorder);
            if (sortOrder === null) {
                rowErrors.push(
                    `Row ${rowNumber}: sortOrder must be a non-negative number.`
                );
                return;
            }

            const isActive = parseBooleanCell(normalizedRow.isactive);
            if (isActive === null) {
                rowErrors.push(
                    `Row ${rowNumber}: isActive should be true/false, yes/no, or 1/0.`
                );
                return;
            }

            parsedRows.push({
                rowNumber,
                category,
                label,
                code: toOptionalString(normalizedRow.code),
                description: toOptionalString(normalizedRow.description),
                parentCategory,
                parentKey: toOptionalString(normalizedRow.parentkey),
                sortOrder,
                isActive,
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
            throw new Error("No valid rows found in the uploaded Excel file.");
        }

        return parsedRows;
    });
}

function downloadMasterDataTemplate(categories: { id: string; label: string }[]) {
    const workbook = XLSX.utils.book_new();
    const templateSheet = XLSX.utils.json_to_sheet(templateRows, {
        header: [...templateHeaders],
    });
    templateSheet["!cols"] = [
        { wch: 22 },
        { wch: 28 },
        { wch: 16 },
        { wch: 40 },
        { wch: 22 },
        { wch: 26 },
        { wch: 12 },
        { wch: 12 },
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet([
        ["Master Data Bulk Upload Instructions"],
        ["1. Keep header names unchanged."],
        ["2. category and label are mandatory in each row."],
        ["3. parentKey should match an existing master-data key if parentCategory is used."],
        ["4. isActive accepts true/false, yes/no, or 1/0."],
        ["5. Upload this file from Admin > Master Data > Bulk import."],
        [""],
        ["Supported categories"],
        ...categories.map((item) => [item.id, item.label]),
    ]);

    XLSX.utils.book_append_sheet(workbook, templateSheet, "MasterDataTemplate");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
    XLSX.writeFile(workbook, "master-data-template.xlsx");
}

function formatMasterDataUpdatedAt(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function AdminLoginForm({
    adminExists,
}: {
    adminExists: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<AdminLoginValues>({
        resolver: zodResolver(adminLoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    function onSubmit(values: AdminLoginValues) {
        setErrorMessage("");

        startTransition(async () => {
            try {
                await requestJson("/api/auth/admin-login", {
                    method: "POST",
                    body: JSON.stringify(values),
                });
                router.push("/admin");
                router.refresh();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : "Unable to sign in."
                );
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Admin sign in</CardTitle>
                <CardDescription>
                    Use an Admin role account to access institutional setup and UMIS operations.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {!adminExists ? (
                    <FormMessage
                        message="No admin exists yet. Complete the initial admin setup first."
                        type="error"
                    />
                ) : null}
                {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field label="Admin email" id="admin-login-email" error={form.formState.errors.email?.message}>
                        <Input id="admin-login-email" type="email" {...form.register("email")} />
                    </Field>
                    <Field label="Password" id="admin-login-password" error={form.formState.errors.password?.message}>
                        <Input id="admin-login-password" type="password" {...form.register("password")} />
                    </Field>
                    <Button className="w-full" disabled={isPending || !adminExists} size="lg" type="submit">
                        {isPending ? <Spinner /> : <Shield className="size-4" />}
                        Open Admin Console
                    </Button>
                </form>

                {!adminExists ? (
                    <Link className="text-sm font-medium text-zinc-950" href="/admin/setup">
                        Create the first admin account
                    </Link>
                ) : null}
            </CardContent>
        </Card>
    );
}

export function AdminBootstrapForm({
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
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<AdminBootstrapValues>({
        resolver: zodResolver(adminBootstrapSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            universityName: universityOptions[0]?.label ?? "",
            collegeName: collegeOptions[0]?.label ?? "",
            department: departmentOptions[0]?.label ?? "",
        },
    });

    const password = useWatch({
        control: form.control,
        name: "password",
        defaultValue: "",
    });

    function onSubmit(values: AdminBootstrapValues) {
        setErrorMessage("");

        startTransition(async () => {
            try {
                await requestJson("/api/admin/bootstrap", {
                    method: "POST",
                    body: JSON.stringify(values),
                });
                router.push("/admin");
                router.refresh();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : "Unable to create admin."
                );
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create the first admin</CardTitle>
                <CardDescription>
                    This bootstrap step is available only until the first Admin account is created.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {errorMessage ? <FormMessage message={errorMessage} type="error" /> : null}

                <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field label="Admin name" id="bootstrap-name" error={form.formState.errors.name?.message}>
                            <Input id="bootstrap-name" {...form.register("name")} />
                        </Field>
                        <Field label="Admin email" id="bootstrap-email" error={form.formState.errors.email?.message}>
                            <Input id="bootstrap-email" type="email" {...form.register("email")} />
                        </Field>
                    </div>

                    <Field label="Password" id="bootstrap-password" error={form.formState.errors.password?.message}>
                        <Input id="bootstrap-password" type="password" {...form.register("password")} />
                    </Field>

                    <PasswordChecklist password={password} />

                    <div className="grid gap-5 md:grid-cols-3">
                        <Field label="University" id="bootstrap-university" error={form.formState.errors.universityName?.message}>
                            {universityOptions.length ? (
                                <Controller
                                    control={form.control}
                                    name="universityName"
                                    render={({ field }) => (
                                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                                            <SelectTrigger id="bootstrap-university" className="w-full">
                                                <SelectValue placeholder="Select university" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {universityOptions.map((item) => (
                                                    <SelectItem key={item.key} value={item.label}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            ) : (
                                <Input id="bootstrap-university" placeholder="University name" {...form.register("universityName")} />
                            )}
                        </Field>
                        <Field label="College" id="bootstrap-college" error={form.formState.errors.collegeName?.message}>
                            {collegeOptions.length ? (
                                <Controller
                                    control={form.control}
                                    name="collegeName"
                                    render={({ field }) => (
                                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                                            <SelectTrigger id="bootstrap-college" className="w-full">
                                                <SelectValue placeholder="Select college" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {collegeOptions.map((item) => (
                                                    <SelectItem key={item.key} value={item.label}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            ) : (
                                <Input id="bootstrap-college" placeholder="College name" {...form.register("collegeName")} />
                            )}
                        </Field>
                        <Field label="Department" id="bootstrap-department" error={form.formState.errors.department?.message}>
                            {departmentOptions.length ? (
                                <Controller
                                    control={form.control}
                                    name="department"
                                    render={({ field }) => (
                                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                                            <SelectTrigger id="bootstrap-department" className="w-full">
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departmentOptions.map((item) => (
                                                    <SelectItem key={item.key} value={item.label}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            ) : (
                                <Input id="bootstrap-department" placeholder="Department name" {...form.register("department")} />
                            )}
                        </Field>
                    </div>

                    <Button className="w-full" disabled={isPending} size="lg" type="submit">
                        {isPending ? <Spinner /> : <CheckCircle2 className="size-4" />}
                        Create Admin Account
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function MasterDataManager({
    categories,
    initialData,
}: {
    categories: { id: string; label: string; description: string }[];
    initialData: Record<string, MasterDataEntry[]>;
}) {
    const [isPending, startTransition] = useTransition();
    const [isBulkPending, startBulkTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [bulkMessage, setBulkMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [bulkFailures, setBulkFailures] = useState<BulkMasterDataFailure[]>([]);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [fileInputVersion, setFileInputVersion] = useState(0);
    const [entries, setEntries] = useState(initialData);

    function mergeEntries(importedEntries: MasterDataEntry[]) {
        setEntries((current) => {
            const next = { ...current };

            importedEntries.forEach((entry) => {
                next[entry.category] = [entry, ...(next[entry.category] ?? [])];
            });

            return next;
        });
    }

    const form = useForm<MasterDataValues, unknown, MasterDataResolvedValues>({
        resolver: zodResolver(masterDataSchema),
        defaultValues: {
            category: categories[0]?.id ?? "university",
            label: "",
            code: "",
            description: "",
            parentCategory: "",
            parentKey: "",
            sortOrder: 0,
            isActive: true,
            metadata: {},
        },
    });

    function onSubmit(values: MasterDataResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            try {
                const data = (await requestJson("/api/admin/master-data", {
                    method: "POST",
                    body: JSON.stringify(values),
                })) as MasterDataEntry;

                mergeEntries([data]);

                form.reset({
                    ...form.getValues(),
                    label: "",
                    code: "",
                    description: "",
                    parentKey: "",
                    sortOrder: 0,
                    metadata: {},
                });

                setMessage({
                    type: "success",
                    text: "Master data entry created successfully.",
                });
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to create master data entry.",
                });
            }
        });
    }

    function toggleEntry(item: MasterDataEntry) {
        setMessage(null);

        startTransition(async () => {
            try {
                const data = (await requestJson(`/api/admin/master-data/${item._id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        isActive: !item.isActive,
                    }),
                })) as MasterDataEntry;

                setEntries((current) => ({
                    ...current,
                    [item.category]: (current[item.category] ?? []).map((entry) =>
                        entry._id === item._id ? data : entry
                    ),
                }));
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to update master data entry.",
                });
            }
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
                const parsedRows = await parseBulkMasterDataWorkbook(bulkFile, categories);
                const result = (await requestJson("/api/admin/master-data/bulk", {
                    method: "POST",
                    body: JSON.stringify({ entries: parsedRows }),
                })) as BulkMasterDataResponse;

                if (result.created.length) {
                    mergeEntries(result.created);
                }

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
                        text: `Imported ${result.created.length} row(s). ${result.failed.length} row(s) were skipped.`,
                    });
                    return;
                }

                setBulkMessage({
                    type: "success",
                    text: `Imported ${result.created.length} row(s) successfully.`,
                });
                setBulkFile(null);
                setFileInputVersion((current) => current + 1);
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

    const parentCategory = useWatch({
        control: form.control,
        name: "parentCategory",
        defaultValue: "",
    });
    const parentOptions = parentCategory ? entries[parentCategory] ?? [] : [];

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Create master data</CardTitle>
                        <CardDescription>
                            Use this to add universities, colleges, departments, academic years, report categories, and other enum-style values.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {message ? <FormMessage message={message.text} type={message.type} /> : null}

                        <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                            <Field label="Category" id="master-category" error={form.formState.errors.category?.message}>
                                <Controller
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                                            <SelectTrigger id="master-category" className="w-full">
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </Field>

                            <Field label="Label" id="master-label" error={form.formState.errors.label?.message}>
                                <Input id="master-label" placeholder="College of Engineering" {...form.register("label")} />
                            </Field>

                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="Code" id="master-code" error={form.formState.errors.code?.message}>
                                    <Input id="master-code" placeholder="SOE" {...form.register("code")} />
                                </Field>
                                <Field label="Sort order" id="master-sort-order" error={form.formState.errors.sortOrder?.message}>
                                    <Input id="master-sort-order" type="number" min="0" {...form.register("sortOrder", { valueAsNumber: true })} />
                                </Field>
                            </div>

                            <Field label="Description" id="master-description" error={form.formState.errors.description?.message}>
                                <Textarea id="master-description" placeholder="Explain where this enum is used." {...form.register("description")} />
                            </Field>

                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="Parent category" id="master-parent-category" error={form.formState.errors.parentCategory?.message}>
                                    <Controller
                                        control={form.control}
                                        name="parentCategory"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value ? field.value : emptySelectValue}
                                                onValueChange={(value) =>
                                                    field.onChange(value === emptySelectValue ? "" : value)
                                                }
                                            >
                                                <SelectTrigger id="master-parent-category" className="w-full">
                                                    <SelectValue placeholder="No parent" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={emptySelectValue}>No parent</SelectItem>
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            {category.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </Field>
                                <Field label="Parent item" id="master-parent-key" error={form.formState.errors.parentKey?.message}>
                                    <Controller
                                        control={form.control}
                                        name="parentKey"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value ? field.value : emptySelectValue}
                                                onValueChange={(value) =>
                                                    field.onChange(value === emptySelectValue ? "" : value)
                                                }
                                            >
                                                <SelectTrigger id="master-parent-key" className="w-full">
                                                    <SelectValue placeholder="No parent item" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={emptySelectValue}>No parent item</SelectItem>
                                                    {parentOptions.map((item) => (
                                                        <SelectItem key={item._id} value={item.key}>
                                                            {item.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </Field>
                            </div>

                            <Button className="w-full" disabled={isPending} type="submit">
                                {isPending ? <Spinner /> : <Plus className="size-4" />}
                                Add Master Data Entry
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
                            Download the sample sheet, fill rows, then upload to insert multiple master-data entries in one step.
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
                            onClick={() => downloadMasterDataTemplate(categories)}
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
                            <Field label="Upload file" id="master-bulk-upload">
                                <Input
                                    accept=".xlsx,.xls,.csv"
                                    id="master-bulk-upload"
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
                                Import Bulk Data
                            </Button>
                        </form>

                        {bulkFailures.length ? (
                            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                <p className="text-sm font-semibold text-rose-900">
                                    Failed rows ({bulkFailures.length})
                                </p>
                                <div className="max-h-48 space-y-1 overflow-auto text-xs text-rose-800">
                                    {bulkFailures.slice(0, 10).map((failure) => (
                                        <p key={`${failure.rowNumber}-${failure.category || "na"}-${failure.message}`}>
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

            <Card>
                <CardHeader>
                    <CardTitle>Managed enum categories</CardTitle>
                    <CardDescription>
                        Entries are grouped by business category and can be activated or retired without code changes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue={categories[0]?.id}>
                        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80">
                            <div className="flex items-center justify-between px-4 pt-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                                    Category Navigator
                                </p>
                                <Badge className="border-zinc-300 bg-zinc-100 text-zinc-700">
                                    {categories.length} categories
                                </Badge>
                            </div>
                            <Separator className="mt-3" />
                            <ScrollArea className="h-[520px] md:h-[560px] xl:h-[420px]">
                                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-none bg-transparent p-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {categories.map((category) => {
                                        const visual = categoryVisuals[category.id];
                                        const Icon = visual?.icon ?? Layers;
                                        const categoryEntries = entries[category.id] ?? [];
                                        const activeCount = categoryEntries.filter((item) => item.isActive).length;
                                        const inactiveCount = categoryEntries.length - activeCount;

                                        return (
                                            <TabsTrigger
                                                className="h-auto items-start justify-start rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left data-active:border-zinc-900 data-active:bg-zinc-900 data-active:text-zinc-50"
                                                key={category.id}
                                                value={category.id}
                                            >
                                                <div className="w-full">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span
                                                            className={`inline-flex size-8 items-center justify-center rounded-md border ${visual?.tone ?? "border-zinc-200 bg-zinc-100 text-zinc-700"}`}
                                                        >
                                                            <Icon className="size-4" />
                                                        </span>
                                                        <Badge className="border-zinc-300 bg-zinc-100 text-zinc-700">
                                                            {categoryEntries.length}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-3 text-sm font-semibold leading-tight">
                                                        {category.label}
                                                    </p>
                                                    <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-current/70">
                                                        {activeCount} active · {inactiveCount} inactive
                                                    </p>
                                                </div>
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </ScrollArea>
                        </div>

                        {categories.map((category) => {
                            const categoryEntries = entries[category.id] ?? [];
                            const activeCount = categoryEntries.filter((item) => item.isActive).length;
                            const inactiveCount = categoryEntries.length - activeCount;

                            return (
                                <TabsContent className="mt-6 space-y-4" key={category.id} value={category.id}>
                                    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-zinc-950">
                                                {category.label}
                                            </h3>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {category.description}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 md:min-w-[320px]">
                                            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center">
                                                <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-500">
                                                    Total
                                                </p>
                                                <p className="text-lg font-semibold text-zinc-950">
                                                    {categoryEntries.length}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
                                                <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-700">
                                                    Active
                                                </p>
                                                <p className="text-lg font-semibold text-emerald-900">
                                                    {activeCount}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-center">
                                                <p className="text-[11px] uppercase tracking-[0.1em] text-rose-700">
                                                    Inactive
                                                </p>
                                                <p className="text-lg font-semibold text-rose-900">
                                                    {inactiveCount}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {categoryEntries.length ? (
                                        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                                            <Table className="min-w-[920px]">
                                                <TableHeader className="bg-zinc-100/80">
                                                    <TableRow className="text-left text-xs uppercase tracking-[0.08em] text-zinc-600 hover:bg-zinc-100/80">
                                                        <TableHead className="px-4 py-3 font-semibold">Label</TableHead>
                                                        <TableHead className="px-4 py-3 font-semibold">Code / Key</TableHead>
                                                        <TableHead className="px-4 py-3 font-semibold">Parent</TableHead>
                                                        <TableHead className="px-4 py-3 font-semibold">Sort</TableHead>
                                                        <TableHead className="px-4 py-3 font-semibold">Status</TableHead>
                                                        <TableHead className="px-4 py-3 font-semibold">Updated</TableHead>
                                                        <TableHead className="px-4 py-3 text-right font-semibold">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="divide-y divide-zinc-200">
                                                    {categoryEntries.map((item) => (
                                                        <TableRow
                                                            className="align-top transition-colors hover:bg-zinc-50"
                                                            key={item._id}
                                                        >
                                                            <TableCell className="px-4 py-3 whitespace-normal">
                                                                <p className="text-sm font-semibold text-zinc-950">
                                                                    {item.label}
                                                                </p>
                                                                <p className="mt-1 text-xs text-zinc-500">
                                                                    {item.description || "No description provided."}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3">
                                                                <Badge className="border-zinc-300 bg-zinc-100 text-zinc-700">
                                                                    {item.code || item.key}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3 text-xs text-zinc-600 whitespace-normal">
                                                                <p>
                                                                    <span className="font-medium text-zinc-700">Category:</span>{" "}
                                                                    {item.parentCategory || "None"}
                                                                </p>
                                                                <p className="mt-1">
                                                                    <span className="font-medium text-zinc-700">Key:</span>{" "}
                                                                    {item.parentKey || "None"}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3 text-sm font-mono text-zinc-700">
                                                                {item.sortOrder}
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3">
                                                                <Badge
                                                                    className={
                                                                        item.isActive
                                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                            : "border-rose-200 bg-rose-50 text-rose-700"
                                                                    }
                                                                >
                                                                    {item.isActive ? "Active" : "Inactive"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3 text-xs text-zinc-600">
                                                                {formatMasterDataUpdatedAt(item.updatedAt)}
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3 text-right">
                                                                <Button
                                                                    disabled={isPending}
                                                                    onClick={() => toggleEntry(item)}
                                                                    size="sm"
                                                                    variant={item.isActive ? "secondary" : "default"}
                                                                >
                                                                    {item.isActive ? "Deactivate" : "Activate"}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                            No entries created yet for this category.
                                        </div>
                                    )}
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export function UserManagementTable({
    initialUsers,
    universityOptions,
    collegeOptions,
    departmentOptions,
}: {
    initialUsers: UserRecord[];
    universityOptions: Option[];
    collegeOptions: Option[];
    departmentOptions: Option[];
}) {
    const [users, setUsers] = useState(initialUsers);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [isPending, startTransition] = useTransition();

    function updateUser(userId: string, payload: UserUpdateValues) {
        setMessage(null);

        startTransition(async () => {
            try {
                const updated = (await requestJson(`/api/admin/users/${userId}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                })) as UserRecord;

                setUsers((current) =>
                    current.map((user) => (user._id === userId ? updated : user))
                );
                setMessage({
                    type: "success",
                    text: "User access updated successfully.",
                });
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to update user.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard label="Total users" value={String(users.length)} icon={<Users className="size-5" />} />
                <SummaryCard label="Admins" value={String(users.filter((user) => user.role === "Admin").length)} icon={<Shield className="size-5" />} />
                <SummaryCard label="Verified" value={String(users.filter((user) => user.emailVerified).length)} icon={<CheckCircle2 className="size-5" />} />
                <SummaryCard label="Active" value={String(users.filter((user) => user.isActive).length)} icon={<Users className="size-5" />} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Access management</CardTitle>
                    <CardDescription>
                        Review user role, activation status, verification status, and institutional mapping.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {users.map((user) => (
                        <div
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                            key={user._id}
                        >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold text-zinc-950">
                                            {user.name}
                                        </h3>
                                        <Badge>{user.role}</Badge>
                                        <Badge
                                            className={
                                                user.isActive
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-rose-200 bg-rose-50 text-rose-700"
                                            }
                                        >
                                            {user.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                        <Badge
                                            className={
                                                user.emailVerified
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                            }
                                        >
                                            {user.emailVerified ? "Verified" : "Pending verification"}
                                        </Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        {user.universityName || "No university"} / {user.collegeName || "No college"} /{" "}
                                        {user.department || "No department"}
                                    </p>
                                    {user.studentSummary?.enrollmentNo ? (
                                        <p className="mt-1 text-sm text-zinc-500">
                                            Enrollment No.: {user.studentSummary.enrollmentNo}
                                        </p>
                                    ) : null}
                                    {user.facultySummary?.employeeCode ? (
                                        <p className="mt-1 text-sm text-zinc-500">
                                            Employee Code: {user.facultySummary.employeeCode}
                                            {user.facultySummary.designation
                                                ? ` · ${user.facultySummary.designation}`
                                                : ""}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:min-w-[640px] xl:grid-cols-5">
                                    <Select
                                        value={user.role}
                                        disabled={isPending}
                                        onValueChange={(value) =>
                                            updateUser(user._id, { role: value as UserUpdateValues["role"] })
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roleOptions.map((role) => (
                                                <SelectItem key={role} value={role}>
                                                    {role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={user.universityName || emptySelectValue}
                                        disabled={isPending}
                                        onValueChange={(value) =>
                                            updateUser(user._id, {
                                                universityName: value === emptySelectValue ? "" : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="No university" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={emptySelectValue}>No university</SelectItem>
                                            {universityOptions.map((item) => (
                                                <SelectItem key={item.key} value={item.label}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={user.collegeName || emptySelectValue}
                                        disabled={isPending}
                                        onValueChange={(value) =>
                                            updateUser(user._id, {
                                                collegeName: value === emptySelectValue ? "" : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="No college" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={emptySelectValue}>No college</SelectItem>
                                            {collegeOptions.map((item) => (
                                                <SelectItem key={item.key} value={item.label}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={user.department || emptySelectValue}
                                        disabled={isPending}
                                        onValueChange={(value) =>
                                            updateUser(user._id, {
                                                department: value === emptySelectValue ? "" : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="No department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={emptySelectValue}>No department</SelectItem>
                                            {departmentOptions.map((item) => (
                                                <SelectItem key={item.key} value={item.label}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            disabled={isPending}
                                            onClick={() =>
                                                updateUser(user._id, {
                                                    isActive: !user.isActive,
                                                })
                                            }
                                            variant="secondary"
                                        >
                                            {user.isActive ? "Disable" : "Enable"}
                                        </Button>
                                        <Button
                                            disabled={isPending}
                                            onClick={() =>
                                                updateUser(user._id, {
                                                    emailVerified: !user.emailVerified,
                                                })
                                            }
                                        >
                                            {user.emailVerified ? "Unverify" : "Verify"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {user.accountStatus ? (
                                <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                                    Account status: {user.accountStatus}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

export function SystemUpdatesManager({
    initialItems,
}: {
    initialItems: SystemUpdateRecord[];
}) {
    const [items, setItems] = useState(initialItems);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [isPending, startTransition] = useTransition();

    const form = useForm<SystemUpdateValues, unknown, SystemUpdateResolvedValues>({
        resolver: zodResolver(systemUpdateSchema),
        defaultValues: {
            type: "Notification",
            title: "",
            category: "",
            content: "",
            targetRoles: [],
            expiresAt: "",
            isActive: true,
        },
    });

    function onSubmit(values: SystemUpdateResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            try {
                const payload = {
                    ...values,
                    targetRoles: values.targetRoles,
                };

                const data = (await requestJson("/api/admin/system-updates", {
                    method: "POST",
                    body: JSON.stringify(payload),
                })) as SystemUpdateRecord;

                setItems((current) => [data, ...current]);
                form.reset({
                    type: "Notification",
                    title: "",
                    category: "",
                    content: "",
                    targetRoles: [],
                    expiresAt: "",
                    isActive: true,
                });
                setMessage({
                    type: "success",
                    text: "System update published.",
                });
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to create system update.",
                });
            }
        });
    }

    function toggleStatus(item: SystemUpdateRecord) {
        setMessage(null);

        startTransition(async () => {
            try {
                const data = (await requestJson(`/api/admin/system-updates/${item._id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        isActive: !item.isActive,
                    }),
                })) as SystemUpdateRecord;

                setItems((current) =>
                    current.map((entry) => (entry._id === item._id ? data : entry))
                );
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to update system notice.",
                });
            }
        });
    }

    const selectedRoles =
        useWatch({
            control: form.control,
            name: "targetRoles",
            defaultValue: [],
        }) ?? [];

    function toggleRole(role: string) {
        const nextRoles = selectedRoles.includes(role)
            ? selectedRoles.filter((item) => item !== role)
            : [...selectedRoles, role];

        form.setValue("targetRoles", nextRoles);
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Card>
                <CardHeader>
                    <CardTitle>Publish system communication</CardTitle>
                    <CardDescription>
                        Create notices, dashboard stats, news, or visitor metrics for the UMIS platform.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                        <Field label="Type" id="system-type" error={form.formState.errors.type?.message}>
                            <Controller
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <SelectTrigger id="system-type" className="w-full">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Notification">Notification</SelectItem>
                                            <SelectItem value="News">News</SelectItem>
                                            <SelectItem value="DashboardStat">Dashboard Stat</SelectItem>
                                            <SelectItem value="VisitorCount">Visitor Count</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </Field>

                        <Field label="Title" id="system-title" error={form.formState.errors.title?.message}>
                            <Input id="system-title" {...form.register("title")} />
                        </Field>

                        <Field label="Category" id="system-category" error={form.formState.errors.category?.message}>
                            <Input id="system-category" placeholder="Admissions / Exam / IQAC" {...form.register("category")} />
                        </Field>

                        <Field label="Expires at" id="system-expires" error={form.formState.errors.expiresAt?.message}>
                            <Input id="system-expires" type="datetime-local" {...form.register("expiresAt")} />
                        </Field>

                        <Field label="Content" id="system-content" error={form.formState.errors.content?.message}>
                            <Textarea
                                id="system-content"
                                placeholder="Plain text or JSON payload for dashboard stats."
                                {...form.register("content")}
                            />
                        </Field>

                        <div className="grid gap-2">
                            <Label>Target roles</Label>
                            <div className="flex flex-wrap gap-2">
                                {roleOptions.map((role) => (
                                    <button
                                        className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                                            selectedRoles.includes(role)
                                                ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                                                : "border-zinc-200 bg-white text-zinc-500"
                                        }`}
                                        key={role}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            toggleRole(role);
                                        }}
                                        type="button"
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button className="w-full" disabled={isPending} type="submit">
                            {isPending ? <Spinner /> : <Plus className="size-4" />}
                            Publish Update
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Live system items</CardTitle>
                    <CardDescription>
                        Review active announcements, news, and dashboard messages currently stored in UMIS.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {items.length ? (
                        items.map((item) => (
                            <div
                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                key={item._id}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold text-zinc-950">
                                                {item.title || "Untitled system item"}
                                            </h3>
                                            <Badge>{item.type}</Badge>
                                            {item.category ? <Badge>{item.category}</Badge> : null}
                                            <Badge
                                                className={
                                                    item.isActive
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                        : "border-rose-200 bg-rose-50 text-rose-700"
                                                }
                                            >
                                                {item.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-zinc-500">
                                            {typeof item.content === "string"
                                                ? item.content
                                                : JSON.stringify(item.content)}
                                        </p>
                                        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-zinc-500">
                                            Target roles: {item.targetRoles.length ? item.targetRoles.join(", ") : "All"}
                                        </p>
                                    </div>
                                    <Button
                                        disabled={isPending}
                                        onClick={() => toggleStatus(item)}
                                        variant="secondary"
                                    >
                                        {item.isActive ? "Archive" : "Activate"}
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No system updates have been created yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
                </div>
                <div className="inline-flex size-12 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                    {icon}
                </div>
            </CardContent>
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
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            <FieldError message={error} />
        </div>
    );
}
