"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    const [items, setItems] = useState<EvidenceItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [remarks, setRemarks] = useState<Record<string, string>>({});

    const load = () => {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/evidence/review?status=${status}`);
                const data = (await res.json()) as { items?: EvidenceItem[]; message?: string };
                if (!res.ok) {
                    throw new Error(data.message ?? "Unable to load evidence queue.");
                }
                setItems(data.items ?? []);
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

    const emptyState = useMemo(() => {
        if (isPending) return "Loading evidence...";
        if (items.length === 0) {
            return status === "All"
                ? "No evidence uploaded yet."
                : `No ${status.toLowerCase()} evidence items found.`;
        }
        return null;
    }, [isPending, items.length, status]);

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
            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle>Student Evidence Verification</CardTitle>
                    <CardDescription>
                        Review evidence documents submitted by students and mark them as verified or rejected.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
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
                </CardContent>
            </Card>

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
                                {items.map((item) => (
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
