"use client";

import { useMemo, useState, useTransition } from "react";
import {
    Background,
    Controls,
    MarkerType,
    MiniMap,
    Position,
    ReactFlow,
    type Edge,
    type Node,
} from "@xyflow/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { organizationSchema } from "@/lib/admin/hierarchy-validators";
import { cn } from "@/lib/utils";

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

function getTypeNodeStyle(type: string) {
    if (type === "University") {
        return "border-sky-300 bg-sky-50 text-sky-900";
    }

    if (type === "College") {
        return "border-emerald-300 bg-emerald-50 text-emerald-900";
    }

    if (type === "Department") {
        return "border-amber-300 bg-amber-50 text-amber-900";
    }

    if (type === "Center") {
        return "border-violet-300 bg-violet-50 text-violet-900";
    }

    return "border-zinc-300 bg-zinc-100 text-zinc-900";
}

function getTypeMinimapColor(type: string) {
    if (type === "University") {
        return "#0284c7";
    }

    if (type === "College") {
        return "#059669";
    }

    if (type === "Department") {
        return "#d97706";
    }

    if (type === "Center") {
        return "#7c3aed";
    }

    return "#52525b";
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
    const [searchValue, setSearchValue] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("All");
    const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
    const [isPending, startTransition] = useTransition();
    const emptySelectValue = "__none__";

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

    const hierarchySummary = useMemo(() => {
        const total = organizations.length;
        const active = organizations.filter((item) => item.isActive).length;
        const inactive = total - active;
        const byType = organizations.reduce<Record<string, number>>((accumulator, item) => {
            accumulator[item.type] = (accumulator[item.type] ?? 0) + 1;
            return accumulator;
        }, {});

        return {
            total,
            active,
            inactive,
            byType,
        };
    }, [organizations]);

    const normalizedSearch = searchValue.trim().toLowerCase();
    const filteredOrganizations = useMemo(() => {
        return organizations
            .filter((item) => {
                if (typeFilter !== "All" && item.type !== typeFilter) {
                    return false;
                }

                if (statusFilter === "Active" && !item.isActive) {
                    return false;
                }

                if (statusFilter === "Inactive" && item.isActive) {
                    return false;
                }

                if (!normalizedSearch) {
                    return true;
                }

                const searchable = [
                    item.name,
                    item.type,
                    item.parentOrganizationName,
                    item.headName,
                    item.headTitle,
                    item.universityName,
                    item.collegeName,
                    item.code,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(normalizedSearch);
            })
            .sort(
                (left, right) =>
                    left.hierarchyLevel - right.hierarchyLevel ||
                    left.type.localeCompare(right.type) ||
                    left.name.localeCompare(right.name)
            );
    }, [organizations, typeFilter, statusFilter, normalizedSearch]);

    const filteredCount = filteredOrganizations.length;

    const graphItems = useMemo(() => {
        const byName = new Map(organizations.map((item) => [item.name, item]));
        const included = new Map<string, OrganizationRecord>();

        for (const item of filteredOrganizations) {
            included.set(item._id, item);

            let parentName = item.parentOrganizationName;
            while (parentName) {
                const parent = byName.get(parentName);
                if (!parent) {
                    break;
                }

                if (!included.has(parent._id)) {
                    included.set(parent._id, parent);
                }

                parentName = parent.parentOrganizationName;
            }
        }

        return Array.from(included.values()).sort(
            (left, right) =>
                left.hierarchyLevel - right.hierarchyLevel ||
                left.type.localeCompare(right.type) ||
                left.name.localeCompare(right.name)
        );
    }, [organizations, filteredOrganizations]);

    const graphNodesAndEdges = useMemo(() => {
        const nameToId = new Map(graphItems.map((item) => [item.name, item._id]));
        const levels = new Map<number, OrganizationRecord[]>();

        for (const item of graphItems) {
            const levelItems = levels.get(item.hierarchyLevel) ?? [];
            levelItems.push(item);
            levels.set(item.hierarchyLevel, levelItems);
        }

        for (const [, levelItems] of levels) {
            levelItems.sort((left, right) => left.name.localeCompare(right.name));
        }

        const gapX = 280;
        const gapY = 170;
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        for (const [level, levelItems] of levels) {
            levelItems.forEach((item, index) => {
                nodes.push({
                    id: item._id,
                    position: {
                        x: index * gapX,
                        y: (level - 1) * gapY,
                    },
                    draggable: false,
                    data: {
                        label: (
                            <div className={cn("min-w-52 rounded-xl border px-3 py-2 text-left shadow-sm", getTypeNodeStyle(item.type), !item.isActive && "opacity-75") }>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{item.type}</p>
                                <p className="mt-1 text-sm font-semibold">{item.name}</p>
                                <p className="mt-1 text-xs">{item.headName || "No head assigned"}</p>
                                {!item.isActive ? <p className="mt-1 text-[11px] font-medium">Inactive</p> : null}
                            </div>
                        ),
                        type: item.type,
                        isActive: item.isActive,
                    },
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top,
                });

                const parentName = item.parentOrganizationName;
                if (parentName) {
                    const parentId = nameToId.get(parentName);
                    if (parentId) {
                        edges.push({
                            id: `${parentId}-${item._id}`,
                            source: parentId,
                            target: item._id,
                            type: "smoothstep",
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                width: 16,
                                height: 16,
                            },
                            style: {
                                stroke: "#64748b",
                                strokeWidth: 1.5,
                            },
                        });
                    }
                }
            });
        }

        return { nodes, edges };
    }, [graphItems]);

    return (
        <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
            <Card>
                <CardHeader>
                    <CardTitle>Define hierarchy</CardTitle>
                    <CardDescription>
                        Configure institutions in a single place with clean parent-child mapping and accountable ownership.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Quick Guide
                        </p>
                        <p className="mt-2 text-sm text-zinc-700">
                            Create University first, then College, then Department. Centers and Offices can be attached under University or College.
                        </p>
                    </div>

                    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Basic Details
                            </p>
                            <Field label="Organization name" id="organization-name" error={form.formState.errors.name?.message}>
                                <Input id="organization-name" placeholder="e.g. School of Engineering" {...form.register("name")} />
                            </Field>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Type" id="organization-type" error={form.formState.errors.type?.message}>
                                    <Controller
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value || undefined}
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    if (value === "University") {
                                                        form.setValue("parentOrganizationId", "");
                                                    }
                                                }}
                                            >
                                                <SelectTrigger id="organization-type" className="w-full">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {organizationTypes.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </Field>
                                <Field label="Code" id="organization-code" error={form.formState.errors.code?.message}>
                                    <Input id="organization-code" placeholder="e.g. CSE, IQAC" {...form.register("code")} />
                                </Field>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Short name" id="organization-short-name" error={form.formState.errors.shortName?.message}>
                                    <Input id="organization-short-name" placeholder="Optional" {...form.register("shortName")} />
                                </Field>
                                <Field label="Status" id="organization-active" error={form.formState.errors.isActive?.message}>
                                    <Controller
                                        control={form.control}
                                        name="isActive"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value ? "active" : "inactive"}
                                                onValueChange={(value) => field.onChange(value === "active")}
                                            >
                                                <SelectTrigger id="organization-active" className="w-full">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Reporting And Leadership
                            </p>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Parent unit" id="organization-parent" error={form.formState.errors.parentOrganizationId?.message}>
                                    <Controller
                                        control={form.control}
                                        name="parentOrganizationId"
                                        render={({ field }) => (
                                            <Select
                                                disabled={organizationType === "University"}
                                                value={field.value ? field.value : emptySelectValue}
                                                onValueChange={(value) =>
                                                    field.onChange(value === emptySelectValue ? "" : value)
                                                }
                                            >
                                                <SelectTrigger id="organization-parent" className="w-full">
                                                    <SelectValue placeholder={organizationType === "University" ? "Root node" : "Select parent"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={emptySelectValue}>
                                                        {organizationType === "University" ? "Root node" : "No parent"}
                                                    </SelectItem>
                                                    {potentialParents.map((item) => (
                                                        <SelectItem key={item._id} value={item._id}>
                                                            {item.name} ({item.type})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        {organizationType === "University"
                                            ? "Universities are always root-level nodes."
                                            : `${potentialParents.length} parent option(s) available for ${organizationType}.`}
                                    </p>
                                </Field>
                                <Field label="Head user" id="organization-head" error={form.formState.errors.headUserId?.message}>
                                    <Controller
                                        control={form.control}
                                        name="headUserId"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value ? field.value : emptySelectValue}
                                                onValueChange={(value) =>
                                                    field.onChange(value === emptySelectValue ? "" : value)
                                                }
                                            >
                                                <SelectTrigger id="organization-head" className="w-full">
                                                    <SelectValue placeholder="No head assigned" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={emptySelectValue}>No head assigned</SelectItem>
                                                    {assignableUsers.map((user) => (
                                                        <SelectItem key={user._id} value={user._id}>
                                                            {user.name} ({user.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </Field>
                            </div>

                            <Field label="Head title" id="organization-head-title" error={form.formState.errors.headTitle?.message}>
                                <Input id="organization-head-title" placeholder="Head of Department / Principal / Office Head" {...form.register("headTitle")} />
                            </Field>
                        </div>

                        <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Contact And Context
                            </p>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Email" id="organization-email" error={form.formState.errors.email?.message}>
                                    <Input id="organization-email" placeholder="office@institution.edu" {...form.register("email")} />
                                </Field>
                                <Field label="Phone" id="organization-phone" error={form.formState.errors.phone?.message}>
                                    <Input id="organization-phone" placeholder="Contact number" {...form.register("phone")} />
                                </Field>
                            </div>

                            <Field label="Website" id="organization-website" error={form.formState.errors.website?.message}>
                                <Input id="organization-website" placeholder="https://example.edu" {...form.register("website")} />
                            </Field>

                            <Field label="Description" id="organization-description" error={form.formState.errors.description?.message}>
                                <Textarea id="organization-description" placeholder="Briefly describe the scope and responsibility of this unit." {...form.register("description")} />
                            </Field>
                        </div>

                        <Button disabled={isPending} type="submit">
                            {isPending ? <Spinner /> : null}
                            Create Hierarchy Node
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>Hierarchy structure</CardTitle>
                        <Badge variant="secondary">{hierarchySummary.total} Total</Badge>
                        <Badge variant="secondary">{hierarchySummary.active} Active</Badge>
                        {hierarchySummary.inactive ? (
                            <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">
                                {hierarchySummary.inactive} Inactive
                            </Badge>
                        ) : null}
                    </div>
                    <CardDescription>
                        Search and filter the hierarchy for quick verification, audits, and cleanup.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-[1fr_180px_140px]">
                        <Input
                            placeholder="Search by name, type, parent, or head"
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                        />
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All types</SelectItem>
                                {organizationTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type} ({hierarchySummary.byType[type] ?? 0})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                                setStatusFilter(value as "All" | "Active" | "Inactive")
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All status</SelectItem>
                                <SelectItem value="Active">Active only</SelectItem>
                                <SelectItem value="Inactive">Inactive only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                        Showing {filteredCount} of {hierarchySummary.total} nodes
                    </p>

                    <Tabs className="gap-3" defaultValue="cards">
                        <TabsList className="w-fit">
                            <TabsTrigger value="cards">Cards View</TabsTrigger>
                            <TabsTrigger value="tree">Visual Tree</TabsTrigger>
                        </TabsList>

                        <TabsContent value="cards">
                            {filteredOrganizations.length ? (
                                <div className="grid gap-3">
                                    {filteredOrganizations.map((item) => (
                                        <div
                                            className={cn(
                                                "rounded-lg border p-4 transition",
                                                item.isActive
                                                    ? "border-zinc-200 bg-zinc-50"
                                                    : "border-amber-200 bg-amber-50/40"
                                            )}
                                            key={item._id}
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline">Level {item.hierarchyLevel}</Badge>
                                                        <Badge variant="secondary">{item.type}</Badge>
                                                        <Badge
                                                            className={cn(
                                                                "border",
                                                                item.isActive
                                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                                            )}
                                                            variant="outline"
                                                        >
                                                            {item.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                        {item.code ? (
                                                            <Badge className="border-zinc-300 bg-white text-zinc-700" variant="outline">
                                                                {item.code}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
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
                                                    variant={item.isActive ? "secondary" : "default"}
                                                >
                                                    {item.isActive ? "Deactivate" : "Activate"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                                    <p className="text-sm font-medium text-zinc-700">No hierarchy nodes match these filters.</p>
                                    <p className="mt-1 text-xs text-zinc-500">Try clearing search or changing type/status filters.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="tree">
                            {graphNodesAndEdges.nodes.length ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-zinc-500">
                                        Interactive view: drag canvas, zoom with wheel, and use controls to fit hierarchy.
                                    </p>
                                    <div className="h-[560px] overflow-hidden rounded-xl border border-zinc-200 bg-white">
                                        <ReactFlow
                                            fitView
                                            fitViewOptions={{
                                                padding: 0.3,
                                            }}
                                            nodes={graphNodesAndEdges.nodes}
                                            edges={graphNodesAndEdges.edges}
                                            proOptions={{ hideAttribution: true }}
                                        >
                                            <Background color="#e4e4e7" gap={20} />
                                            <MiniMap
                                                pannable
                                                zoomable
                                                nodeColor={(node) => getTypeMinimapColor(String(node.data?.type ?? ""))}
                                            />
                                            <Controls showInteractive={false} />
                                        </ReactFlow>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                                    <p className="text-sm font-medium text-zinc-700">No nodes available for visual tree.</p>
                                    <p className="mt-1 text-xs text-zinc-500">Create hierarchy nodes or adjust filters to render the graph.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
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
