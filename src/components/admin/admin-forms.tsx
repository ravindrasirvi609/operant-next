"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Plus, Shield, Users } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
    collegeName?: string;
    schoolName?: string;
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
    collegeOptions,
    schoolOptions,
    departmentOptions,
}: {
    collegeOptions: Option[];
    schoolOptions: Option[];
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
            collegeName: collegeOptions[0]?.label ?? "",
            schoolName: schoolOptions[0]?.label ?? "",
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
                        <Field label="College" id="bootstrap-college" error={form.formState.errors.collegeName?.message}>
                            {collegeOptions.length ? (
                                <Select id="bootstrap-college" {...form.register("collegeName")}>
                                    <option value="">Select college</option>
                                    {collegeOptions.map((item) => (
                                        <option key={item.key} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input id="bootstrap-college" placeholder="College name" {...form.register("collegeName")} />
                            )}
                        </Field>
                        <Field label="School" id="bootstrap-school" error={form.formState.errors.schoolName?.message}>
                            {schoolOptions.length ? (
                                <Select id="bootstrap-school" {...form.register("schoolName")}>
                                    <option value="">Select school</option>
                                    {schoolOptions.map((item) => (
                                        <option key={item.key} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input id="bootstrap-school" placeholder="School name" {...form.register("schoolName")} />
                            )}
                        </Field>
                        <Field label="Department" id="bootstrap-department" error={form.formState.errors.department?.message}>
                            {departmentOptions.length ? (
                                <Select id="bootstrap-department" {...form.register("department")}>
                                    <option value="">Select department</option>
                                    {departmentOptions.map((item) => (
                                        <option key={item.key} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </Select>
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
            category: categories[0]?.id ?? "college",
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
                        Use this to add colleges, schools, departments, academic years, report categories, and other enum-style values.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                        <Field label="Category" id="master-category" error={form.formState.errors.category?.message}>
                            <Select id="master-category" {...form.register("category")}>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Label" id="master-label" error={form.formState.errors.label?.message}>
                            <Input id="master-label" placeholder="School of Engineering" {...form.register("label")} />
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
                                <Select id="master-parent-category" {...form.register("parentCategory")}>
                                    <option value="">No parent</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Parent item" id="master-parent-key" error={form.formState.errors.parentKey?.message}>
                                <Select id="master-parent-key" {...form.register("parentKey")}>
                                    <option value="">No parent item</option>
                                    {parentOptions.map((item) => (
                                        <option key={item._id} value={item.key}>
                                            {item.label}
                                        </option>
                                    ))}
                                </Select>
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
    collegeOptions,
    schoolOptions,
    departmentOptions,
}: {
    initialUsers: UserRecord[];
    collegeOptions: Option[];
    schoolOptions: Option[];
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
                                        {user.collegeName || "No college"} / {user.schoolName || "No school"} /{" "}
                                        {user.department || "No department"}
                                    </p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:min-w-[640px] xl:grid-cols-5">
                                    <Select
                                        defaultValue={user.role}
                                        disabled={isPending}
                                        onChange={(event) =>
                                            updateUser(user._id, { role: event.target.value as UserUpdateValues["role"] })
                                        }
                                    >
                                        {roleOptions.map((role) => (
                                            <option key={role} value={role}>
                                                {role}
                                            </option>
                                        ))}
                                    </Select>
                                    <Select
                                        defaultValue={user.collegeName || ""}
                                        disabled={isPending}
                                        onChange={(event) =>
                                            updateUser(user._id, { collegeName: event.target.value })
                                        }
                                    >
                                        <option value="">No college</option>
                                        {collegeOptions.map((item) => (
                                            <option key={item.key} value={item.label}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </Select>
                                    <Select
                                        defaultValue={user.schoolName || ""}
                                        disabled={isPending}
                                        onChange={(event) =>
                                            updateUser(user._id, { schoolName: event.target.value })
                                        }
                                    >
                                        <option value="">No school</option>
                                        {schoolOptions.map((item) => (
                                            <option key={item.key} value={item.label}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </Select>
                                    <Select
                                        defaultValue={user.department || ""}
                                        disabled={isPending}
                                        onChange={(event) =>
                                            updateUser(user._id, { department: event.target.value })
                                        }
                                    >
                                        <option value="">No department</option>
                                        {departmentOptions.map((item) => (
                                            <option key={item.key} value={item.label}>
                                                {item.label}
                                            </option>
                                        ))}
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
                            <Select id="system-type" {...form.register("type")}>
                                <option value="Notification">Notification</option>
                                <option value="News">News</option>
                                <option value="DashboardStat">Dashboard Stat</option>
                                <option value="VisitorCount">Visitor Count</option>
                            </Select>
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
