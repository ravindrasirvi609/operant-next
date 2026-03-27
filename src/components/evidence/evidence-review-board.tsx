"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type EvidenceItem = {
    recordType: string;
    recordId: string;
    summary: string;
    submittedAt?: string;
    student: {
        id: string;
        name: string;
        enrollmentNo: string;
        departmentName?: string;
        programName?: string;
    };
    document: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        fileType?: string;
        uploadedAt?: string;
        verificationStatus?: string;
        verificationRemarks?: string;
    };
};

type EvidenceSummary = {
    totalItems: number;
    pendingCount: number;
    verifiedCount: number;
    rejectedCount: number;
    departmentCount: number;
    recentUploadsCount: number;
    stalePendingCount: number;
    recordTypeBreakdown: Array<{
        label: string;
        count: number;
    }>;
    departmentBreakdown: Array<{
        label: string;
        count: number;
        pendingCount: number;
    }>;
};

const STATUS_OPTIONS = ["Pending", "Rejected", "Verified", "All"] as const;

function formatDate(value?: string) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status?: string) {
    if (status === "Verified") {
        return <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>;
    }
    if (status === "Rejected") {
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
}

export function EvidenceReviewBoard() {
    const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("Pending");
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<EvidenceItem[]>([]);
    const [summary, setSummary] = useState<EvidenceSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const deferredSearch = useDeferredValue(search);

    const load = () => {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/evidence/review?status=${status}`);
                const data = (await res.json()) as {
                    items?: EvidenceItem[];
                    summary?: EvidenceSummary;
                    message?: string;
                };
                if (!res.ok) {
                    throw new Error(data.message ?? "Unable to load evidence queue.");
                }
                setItems(data.items ?? []);
                setSummary(data.summary ?? null);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to load evidence queue.");
            }
        });
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const filteredItems = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        if (!query) {
            return items;
        }

        return items.filter((item) =>
            [
                item.student.name,
                item.student.enrollmentNo,
                item.student.departmentName,
                item.summary,
                item.recordType,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [deferredSearch, items]);

    const emptyState = useMemo(() => {
        if (isPending) return "Loading evidence...";
        if (filteredItems.length === 0) {
            return status === "All"
                ? items.length
                    ? "No evidence items matched this search."
                    : "No evidence uploaded yet."
                : items.length
                  ? `No ${status.toLowerCase()} evidence items matched this search.`
                  : `No ${status.toLowerCase()} evidence items found.`;
        }
        return null;
    }, [filteredItems.length, isPending, items.length, status]);

    async function updateStatus(documentId: string, nextStatus: "Verified" | "Rejected") {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/evidence/review/${documentId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: nextStatus,
                        remarks: remarks[documentId],
                    }),
                });
                const data = (await res.json()) as { message?: string };
                if (!res.ok) {
                    throw new Error(data.message ?? "Unable to update evidence status.");
                }
                setRemarks((current) => ({ ...current, [documentId]: "" }));
                load();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to update evidence status.");
            }
        });
    }

    return (
        <div className="space-y-6">
            {summary ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <DashboardMetric
                        label="Total documents"
                        value={summary.totalItems}
                        helper="All uploaded evidence linked to student records"
                    />
                    <DashboardMetric
                        label="Pending review"
                        value={summary.pendingCount}
                        helper="Verification items still waiting for action"
                    />
                    <DashboardMetric
                        label="Verified"
                        value={summary.verifiedCount}
                        helper="Evidence approved by reviewers"
                    />
                    <DashboardMetric
                        label="Rejected"
                        value={summary.rejectedCount}
                        helper="Evidence returned for changes"
                    />
                    <DashboardMetric
                        label="Departments"
                        value={summary.departmentCount}
                        helper="Departments represented in the queue"
                    />
                    <DashboardMetric
                        label="Stale pending"
                        value={summary.stalePendingCount}
                        helper={`${summary.recentUploadsCount} new upload(s) in the last 7 days`}
                    />
                </section>
            ) : null}

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle>Student Evidence Verification</CardTitle>
                    <CardDescription>
                        Review evidence documents submitted by students and mark them as verified or rejected.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">Filter</div>
                    <select
                        className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                        {error ? <span className="text-sm text-rose-600">{error}</span> : null}
                    </div>
                    <div className="w-full max-w-sm">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search student, department, record type, or summary"
                        />
                    </div>
                </CardContent>
            </Card>

            {summary ? (
                <section className="grid gap-6 xl:grid-cols-2">
                    <Card className="border-zinc-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle>By Record Type</CardTitle>
                            <CardDescription>
                                Which student modules are creating the most verification work.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {summary.recordTypeBreakdown.slice(0, 6).map((entry) => (
                                <div
                                    key={entry.label}
                                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
                                >
                                    <span className="text-sm font-medium capitalize text-zinc-900">
                                        {entry.label}
                                    </span>
                                    <Badge variant="secondary">{entry.count}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle>Department Backlog</CardTitle>
                            <CardDescription>
                                Departments with the largest pending verification load right now.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {summary.departmentBreakdown.slice(0, 6).map((entry) => (
                                <div
                                    key={entry.label}
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-zinc-900">
                                            {entry.label}
                                        </span>
                                        <Badge variant="secondary">{entry.count} total</Badge>
                                    </div>
                                    <p className="mt-2 text-xs text-zinc-500">
                                        {entry.pendingCount} pending verification item(s)
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>
            ) : null}

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle>Evidence Queue</CardTitle>
                </CardHeader>
                <CardContent>
                    {emptyState ? (
                        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            {emptyState}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Record</TableHead>
                                    <TableHead>Evidence</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.document.id}>
                                        <TableCell>
                                            <div className="font-medium text-zinc-900">{item.student.name || "-"}</div>
                                            <div className="text-xs text-zinc-500">
                                                {item.student.enrollmentNo}
                                                {item.student.departmentName ? ` • ${item.student.departmentName}` : ""}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium text-zinc-900">{item.summary}</div>
                                            <div className="text-xs text-zinc-500">
                                                {item.recordType.toUpperCase()} • {formatDate(item.submittedAt)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {item.document.fileUrl ? (
                                                <a
                                                    className="text-sm font-medium text-sky-700 underline"
                                                    href={item.document.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {item.document.fileName ?? "Evidence file"}
                                                </a>
                                            ) : (
                                                <span className="text-sm text-zinc-500">No file</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{statusBadge(item.document.verificationStatus)}</TableCell>
                                        <TableCell className="min-w-[200px]">
                                            <Textarea
                                                value={remarks[item.document.id] ?? item.document.verificationRemarks ?? ""}
                                                onChange={(event) =>
                                                    setRemarks((current) => ({
                                                        ...current,
                                                        [item.document.id]: event.target.value,
                                                    }))
                                                }
                                                rows={2}
                                                placeholder="Optional remarks"
                                                className="text-xs"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={isPending || item.document.verificationStatus === "Verified"}
                                                    onClick={() => updateStatus(item.document.id, "Verified")}
                                                >
                                                    Verify
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isPending || item.document.verificationStatus === "Rejected"}
                                                    onClick={() => updateStatus(item.document.id, "Rejected")}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function DashboardMetric({
    label,
    value,
    helper,
}: {
    label: string;
    value: number;
    helper: string;
}) {
    return (
        <Card className="border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
                <p className="mt-2 text-xs text-zinc-500">{helper}</p>
            </CardContent>
        </Card>
    );
}
