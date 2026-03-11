"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Plus, Shield, Users } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type UserRecord = {
    _id: string;
    name: string;
    email: string;
    role: string;
    universityName?: string;
    collegeName?: string;
    department?: string;
    emailVerified: boolean;
    isActive: boolean;
    lastLoginAt?: string;
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
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [entries, setEntries] = useState(initialData);

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

                setEntries((current) => ({
                    ...current,
                    [data.category]: [data, ...(current[data.category] ?? [])],
                }));

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

    const parentCategory = useWatch({
        control: form.control,
        name: "parentCategory",
        defaultValue: "",
    });
    const parentOptions = parentCategory ? entries[parentCategory] ?? [] : [];

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
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

            <Card>
                <CardHeader>
                    <CardTitle>Managed enum categories</CardTitle>
                    <CardDescription>
                        Entries are grouped by business category and can be activated or retired without code changes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue={categories[0]?.id}>
                        <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-[26px] p-2 md:grid-cols-3 xl:grid-cols-5">
                            {categories.map((category) => (
                                <TabsTrigger key={category.id} value={category.id}>
                                    {category.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {categories.map((category) => (
                            <TabsContent className="mt-6" key={category.id} value={category.id}>
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold text-zinc-950">
                                        {category.label}
                                    </h3>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        {category.description}
                                    </p>
                                </div>
                                <div className="grid gap-3">
                                    {(entries[category.id] ?? []).length ? (
                                        (entries[category.id] ?? []).map((item) => (
                                            <div
                                                className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                                                key={item._id}
                                            >
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-base font-semibold text-zinc-950">
                                                            {item.label}
                                                        </h4>
                                                        <Badge>{item.code || item.key}</Badge>
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
                                                    <p className="mt-2 text-sm text-zinc-500">
                                                        {item.description || "No description provided."}
                                                    </p>
                                                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-zinc-500">
                                                        Parent: {item.parentCategory || "None"} / {item.parentKey || "None"}
                                                    </p>
                                                </div>
                                                <Button
                                                    disabled={isPending}
                                                    onClick={() => toggleEntry(item)}
                                                    variant={item.isActive ? "secondary" : "default"}
                                                >
                                                    {item.isActive ? "Deactivate" : "Activate"}
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                            No entries created yet for this category.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        ))}
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
