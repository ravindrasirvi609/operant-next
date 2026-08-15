"use client";

import { useCallback, useEffect, useState } from "react";

import { FormMessage } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;

const CHANGE_FIELD_LABELS: Record<string, string> = {
    sgpa: "SGPA",
    cgpa: "CGPA",
    percentage: "Percentage",
    rank: "Rank",
    resultStatus: "Result",
};

function studentLabel(request: AnyRecord) {
    const student = request.studentId;
    if (!student || typeof student !== "object") return "-";
    const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
    return student.enrollmentNo ? `${name} (${student.enrollmentNo})` : name;
}

function semesterLabel(request: AnyRecord) {
    const semester = request.semesterId;
    if (!semester || typeof semester !== "object") return "-";
    return semester.semesterNumber != null ? `Semester ${semester.semesterNumber}` : "-";
}

function ChangeSummary({ request }: { request: AnyRecord }) {
    const fields = Object.keys(request.requestedChanges ?? {});
    if (fields.length === 0) return <span className="text-muted-foreground">-</span>;

    return (
        <ul className="space-y-1 text-sm">
            {fields.map((field) => (
                <li key={field}>
                    <span className="font-medium">{CHANGE_FIELD_LABELS[field] ?? field}:</span>{" "}
                    <span className="text-muted-foreground">{request.previousValues?.[field] ?? "-"}</span>
                    {" → "}
                    <span>{request.requestedChanges?.[field] ?? "-"}</span>
                </li>
            ))}
        </ul>
    );
}

export function AcademicRecordRequestsBoard() {
    const [requests, setRequests] = useState<AnyRecord[]>([]);
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
        setLoading(true);
        fetch("/api/admin/academic-record-requests")
            .then((res) => res.json())
            .then((data) => setRequests((data?.requests ?? []) as AnyRecord[]))
            .catch(() => setMessage({ type: "error", text: "Unable to load correction requests." }))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    async function review(requestId: string, decision: "Approve" | "Reject") {
        setMessage(null);
        setPendingId(requestId);
        const res = await fetch(`/api/admin/academic-record-requests/${requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision, remarks: remarks[requestId] }),
        });
        const result = (await res.json()) as { message?: string };
        setPendingId(null);
        if (!res.ok) {
            setMessage({ type: "error", text: result.message ?? "Failed to review request." });
            return;
        }
        setMessage({ type: "success", text: result.message ?? "Request reviewed." });
        refresh();
    }

    if (loading) {
        return (
            <Card className="border-border bg-card">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    Loading correction requests...
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            {requests.length === 0 ? (
                <Card className="border-border bg-card">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        No academic record correction requests pending review.
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Semester</TableHead>
                                    <TableHead>Requested Change</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="text-right">Decision</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={request._id}>
                                        <TableCell className="font-medium">{studentLabel(request)}</TableCell>
                                        <TableCell>{semesterLabel(request)}</TableCell>
                                        <TableCell>
                                            <ChangeSummary request={request} />
                                        </TableCell>
                                        <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                                            {request.reason}
                                        </TableCell>
                                        <TableCell className="min-w-[200px]">
                                            <Textarea
                                                rows={2}
                                                placeholder="Optional remarks"
                                                value={remarks[request._id] ?? ""}
                                                onChange={(e) =>
                                                    setRemarks((prev) => ({ ...prev, [request._id]: e.target.value }))
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    loading={pendingId === request._id}
                                                    disabled={pendingId === request._id}
                                                    onClick={() => review(request._id, "Approve")}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    loading={pendingId === request._id}
                                                    disabled={pendingId === request._id}
                                                    onClick={() => review(request._id, "Reject")}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
