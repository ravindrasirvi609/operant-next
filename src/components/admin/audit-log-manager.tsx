"use client";

import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type AuditLogUser = {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
};

type AuditLogItem = {
    _id: string;
    action: string;
    tableName: string;
    recordId?: string;
    ipAddress?: string;
    oldData?: unknown;
    newData?: unknown;
    createdAt: string;
    userId?: AuditLogUser | string | null;
};

type AuditLogResponse = {
    items: AuditLogItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
    filterOptions: {
        actions: string[];
        tableNames: string[];
    };
};

type Filters = {
    query: string;
    action: string;
    tableName: string;
    startDate: string;
    endDate: string;
    page: number;
};

function getUserLabel(user: AuditLogItem["userId"]) {
    if (!user || typeof user === "string") {
        return "System";
    }

    return user.name || user.email || "System";
}

function serializePreview(value: unknown) {
    if (value === undefined) {
        return "";
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

async function requestAuditLogs(filters: Filters) {
    const params = new URLSearchParams();
    if (filters.query.trim()) params.set("query", filters.query.trim());
    if (filters.action !== "all") params.set("action", filters.action);
    if (filters.tableName !== "all") params.set("tableName", filters.tableName);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    params.set("page", String(filters.page));
    params.set("pageSize", "25");

    const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
    });

    const payload = (await response.json()) as AuditLogResponse | { message?: string };
    if (!response.ok) {
        throw new Error("message" in payload ? payload.message ?? "Unable to load audit logs." : "Unable to load audit logs.");
    }

    return payload as AuditLogResponse;
}

export function AuditLogManager({ initialData }: { initialData: AuditLogResponse }) {
    const [data, setData] = useState(initialData);
    const [filters, setFilters] = useState<Filters>({
        query: "",
        action: "all",
        tableName: "all",
        startDate: "",
        endDate: "",
        page: 1,
    });
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const activeFilterCount = useMemo(
        () =>
            [filters.query, filters.startDate, filters.endDate].filter(Boolean).length +
            (filters.action !== "all" ? 1 : 0) +
            (filters.tableName !== "all" ? 1 : 0),
        [filters]
    );

    function runSearch(nextFilters: Filters) {
        startTransition(async () => {
            try {
                setError(null);
                const nextData = await requestAuditLogs(nextFilters);
                setData(nextData);
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : "Unable to load audit logs.");
            }
        });
    }

    function updateFilters(patch: Partial<Filters>) {
        const nextFilters = {
            ...filters,
            ...patch,
            page: patch.page ?? 1,
        };
        setFilters(nextFilters);
        runSearch(nextFilters);
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <CardTitle>Audit Logs</CardTitle>
                        <CardDescription>
                            Review production write activity across AQAR, faculty, student, evidence, and admin configuration modules.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{data.pagination.total} entries</Badge>
                        <Badge variant="outline">{activeFilterCount} filters</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-5">
                    <Input
                        placeholder="Search action, table, or record id"
                        value={filters.query}
                        onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                        onBlur={() => runSearch(filters)}
                    />
                    <Select value={filters.action} onValueChange={(value) => updateFilters({ action: value })}>
                        <SelectTrigger>
                            <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All actions</SelectItem>
                            {data.filterOptions.actions.map((action) => (
                                <SelectItem key={action} value={action}>
                                    {action}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.tableName} onValueChange={(value) => updateFilters({ tableName: value })}>
                        <SelectTrigger>
                            <SelectValue placeholder="All tables" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All tables</SelectItem>
                            {data.filterOptions.tableNames.map((tableName) => (
                                <SelectItem key={tableName} value={tableName}>
                                    {tableName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(event) => updateFilters({ startDate: event.target.value })}
                    />
                    <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(event) => updateFilters({ endDate: event.target.value })}
                    />
                </div>

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                {isPending ? <p className="text-sm text-zinc-500">Refreshing audit logs...</p> : null}

                <div className="space-y-3">
                    {data.items.map((item) => (
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={item._id}>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge>{item.action}</Badge>
                                        <Badge variant="outline">{item.tableName}</Badge>
                                        {item.recordId ? <Badge variant="secondary">{item.recordId}</Badge> : null}
                                    </div>
                                    <p className="text-sm text-zinc-700">
                                        {getUserLabel(item.userId)}{" "}
                                        {typeof item.userId === "object" && item.userId?.role
                                            ? `(${item.userId.role})`
                                            : ""}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {new Date(item.createdAt).toLocaleString()}
                                        {item.ipAddress ? ` • ${item.ipAddress}` : ""}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                {item.oldData !== undefined ? (
                                    <details className="rounded-md border border-zinc-200 bg-white p-3">
                                        <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                                            Previous data
                                        </summary>
                                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-600">
                                            {serializePreview(item.oldData)}
                                        </pre>
                                    </details>
                                ) : null}
                                {item.newData !== undefined ? (
                                    <details className="rounded-md border border-zinc-200 bg-white p-3">
                                        <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                                            New data
                                        </summary>
                                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-600">
                                            {serializePreview(item.newData)}
                                        </pre>
                                    </details>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-zinc-500">
                        Page {data.pagination.page} of {data.pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            disabled={data.pagination.page <= 1 || isPending}
                            onClick={() => updateFilters({ page: data.pagination.page - 1 })}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            disabled={data.pagination.page >= data.pagination.totalPages || isPending}
                            onClick={() => updateFilters({ page: data.pagination.page + 1 })}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
