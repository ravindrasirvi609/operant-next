"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { organizationSchema } from "@/lib/admin/hierarchy-validators";

type OrganizationFormValues = z.input<typeof organizationSchema>;
type OrganizationResolvedValues = z.output<typeof organizationSchema>;

type OrganizationRecord = {
    _id: string;
    name: string;
    type: string;
    code?: string;
    parentOrganizationName?: string;
    hierarchyLevel: number;
    universityName?: string;
    collegeName?: string;
    headName?: string;
    headTitle?: string;
    isActive: boolean;
};

type AssignableUser = {
    _id: string;
    name: string;
    role: string;
    email: string;
    designation?: string;
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

export function HierarchyManager({
    initialOrganizations,
    assignableUsers,
    organizationTypes,
}: {
    initialOrganizations: OrganizationRecord[];
    assignableUsers: AssignableUser[];
    organizationTypes: readonly string[];
}) {
    const [organizations, setOrganizations] = useState(initialOrganizations);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [isPending, startTransition] = useTransition();

    const form = useForm<
        OrganizationFormValues,
        unknown,
        OrganizationResolvedValues
    >({
        resolver: zodResolver(organizationSchema),
        defaultValues: {
            name: "",
            type: "College",
            code: "",
            shortName: "",
            description: "",
            parentOrganizationId: "",
            headUserId: "",
            headTitle: "",
            email: "",
            phone: "",
            website: "",
            isActive: true,
        },
    });

    function onSubmit(values: OrganizationResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            try {
                const organization = (await requestJson("/api/admin/hierarchy", {
                    method: "POST",
                    body: JSON.stringify(values),
                })) as OrganizationRecord;

                setOrganizations((current) =>
                    [...current, organization].sort(
                        (left, right) =>
                            left.hierarchyLevel - right.hierarchyLevel ||
                            left.name.localeCompare(right.name)
                    )
                );

                form.reset({
                    ...form.getValues(),
                    name: "",
                    code: "",
                    shortName: "",
                    description: "",
                    headTitle: "",
                    email: "",
                    phone: "",
                    website: "",
                });
                setMessage({
                    type: "success",
                    text: "Hierarchy node created successfully.",
                });
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to create hierarchy node.",
                });
            }
        });
    }

    function toggleStatus(item: OrganizationRecord) {
        startTransition(async () => {
            try {
                const organization = (await requestJson(`/api/admin/hierarchy/${item._id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        isActive: !item.isActive,
                    }),
                })) as OrganizationRecord;

                setOrganizations((current) =>
                    current.map((entry) =>
                        entry._id === item._id ? organization : entry
                    )
                );
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to update hierarchy node.",
                });
            }
        });
    }

    const organizationType = useWatch({
        control: form.control,
        name: "type",
        defaultValue: "College",
    });
    const potentialParents = organizations.filter((item) => {
        if (organizationType === "University") {
            return false;
        }

        if (organizationType === "College") {
            return item.type === "University";
        }

        if (organizationType === "Department" || organizationType === "Center") {
            return item.type === "College";
        }

        return item.type === "University" || item.type === "College";
    });

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Card>
                <CardHeader>
                    <CardTitle>Define hierarchy</CardTitle>
                    <CardDescription>
                        Build the university, college, department, center, and office structure and assign the proper institutional head.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <Field label="Organization name" id="organization-name" error={form.formState.errors.name?.message}>
                            <Input id="organization-name" {...form.register("name")} />
                        </Field>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Type" id="organization-type" error={form.formState.errors.type?.message}>
                                <Select id="organization-type" {...form.register("type")}>
                                    {organizationTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Code" id="organization-code" error={form.formState.errors.code?.message}>
                                <Input id="organization-code" {...form.register("code")} />
                            </Field>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Parent unit" id="organization-parent" error={form.formState.errors.parentOrganizationId?.message}>
                                <Select id="organization-parent" {...form.register("parentOrganizationId")}>
                                    <option value="">No parent</option>
                                    {potentialParents.map((item) => (
                                        <option key={item._id} value={item._id}>
                                            {item.name} ({item.type})
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Head user" id="organization-head" error={form.formState.errors.headUserId?.message}>
                                <Select id="organization-head" {...form.register("headUserId")}>
                                    <option value="">No head assigned</option>
                                    {assignableUsers.map((user) => (
                                        <option key={user._id} value={user._id}>
                                            {user.name} ({user.role})
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <Field label="Head title" id="organization-head-title" error={form.formState.errors.headTitle?.message}>
                            <Input id="organization-head-title" placeholder="Director / Head of Department" {...form.register("headTitle")} />
                        </Field>

                        <Field label="Description" id="organization-description" error={form.formState.errors.description?.message}>
                            <Textarea id="organization-description" {...form.register("description")} />
                        </Field>

                        <Button disabled={isPending} type="submit">
                            {isPending ? <Spinner /> : null}
                            Create Hierarchy Node
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hierarchy structure</CardTitle>
                    <CardDescription>
                        Review the active reporting hierarchy and the current leadership assignments.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                    {organizations.map((item) => (
                        <div
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                            key={item._id}
                        >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                                        Level {item.hierarchyLevel} • {item.type}
                                    </p>
                                    <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                                        {item.name}
                                    </h3>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        Parent: {item.parentOrganizationName || "Root"}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        Head: {item.headName || "Unassigned"} {item.headTitle ? `• ${item.headTitle}` : ""}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        {item.universityName || "No university"} / {item.collegeName || "No college"}
                                    </p>
                                </div>
                                <Button
                                    disabled={isPending}
                                    onClick={() => toggleStatus(item)}
                                    variant="secondary"
                                >
                                    {item.isActive ? "Deactivate" : "Activate"}
                                </Button>
                            </div>
                        </div>
                    ))}
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
            <FieldError message={error} />
        </div>
    );
}
