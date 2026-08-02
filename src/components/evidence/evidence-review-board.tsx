"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
    Building2,
    CheckCheck,
    Clock,
    ExternalLink,
    FileSearch,
    FileStack,
    FileX2,
    Hourglass,
    Layers,
    RefreshCw,
    Search,
    ShieldCheck,
    TriangleAlert,
    X,
} from "lucide-react";

import { BreakdownBarChart } from "@/components/charts/breakdown-bar-chart";
import { StatusDonutChart } from "@/components/charts/status-donut-chart";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

type StatusOption = (typeof STATUS_OPTIONS)[number];

function formatDate(value?: string) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function EvidenceReviewBoard() {
    const [status, setStatus] = useState<StatusOption>("Pending");
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<EvidenceItem[]>([]);
    const [summary, setSummary] = useState<EvidenceSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    // Tracks which row+action is in flight, so only that button spins rather
    // than every button in the table.
    const [actingOn, setActingOn] = useState<string | null>(null);
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
        if (isPending) {
            return { title: "Loading evidence…", description: "Fetching the verification queue." };
        }

        if (filteredItems.length === 0) {
            if (items.length) {
                return {
                    title: "No matches",
                    description:
                        status === "All"
                            ? "No evidence items matched this search."
                            : `No ${status.toLowerCase()} evidence items matched this search.`,
                };
            }

            return {
                title: status === "All" ? "No evidence uploaded yet" : `Nothing ${status.toLowerCase()}`,
                description:
                    status === "All"
                        ? "Documents uploaded by students will appear here for verification."
                        : `There are no ${status.toLowerCase()} evidence items right now.`,
            };
        }

        return null;
    }, [filteredItems.length, isPending, items.length, status]);

    async function updateStatus(documentId: string, nextStatus: "Verified" | "Rejected") {
        setActingOn(`${documentId}:${nextStatus}`);
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
            } finally {
                setActingOn(null);
            }
        });
    }

    return (
        <div className="space-y-6">
            {summary ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <StatCard
                        icon={FileStack}
                        label="Total documents"
                        value={summary.totalItems}
                        helper="All uploaded evidence linked to student records"
                        tone="accent"
                    />
                    <StatCard
                        icon={Hourglass}
                        label="Pending review"
                        value={summary.pendingCount}
                        helper="Verification items still waiting for action"
                        tone={summary.pendingCount > 0 ? "warning" : "success"}
                    />
                    <StatCard
                        icon={ShieldCheck}
                        label="Verified"
                        value={summary.verifiedCount}
                        helper="Evidence approved by reviewers"
                        tone="success"
                    />
                    <StatCard
                        icon={FileX2}
                        label="Rejected"
                        value={summary.rejectedCount}
                        helper="Evidence returned for changes"
                        tone={summary.rejectedCount > 0 ? "danger" : "neutral"}
                    />
                    <StatCard
                        icon={Building2}
                        label="Departments"
                        value={summary.departmentCount}
                        helper="Departments represented in the queue"
                        tone="info"
                    />
                    <StatCard
                        icon={Clock}
                        label="Stale pending"
                        value={summary.stalePendingCount}
                        helper={`${summary.recentUploadsCount} new upload(s) in the last 7 days`}
                        tone={summary.stalePendingCount > 0 ? "danger" : "success"}
                    />
                </section>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSearch className="size-4 text-muted-foreground" aria-hidden />
                        Student Evidence Verification
                    </CardTitle>
                    <CardDescription>
                        Review evidence documents submitted by students and mark them as verified or rejected.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Was a bare <select>. A toggle group shows the whole filter
                            state at once, which matters when triaging the queue is the job. */}
                        <ToggleGroup
                            type="single"
                            value={status}
                            onValueChange={(value) => {
                                if (value) setStatus(value as StatusOption);
                            }}
                            variant="outline"
                            className="w-fit"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <ToggleGroupItem key={option} value={option} aria-label={`Show ${option}`}>
                                    {option}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>

                        <div className="flex items-center gap-2">
                            <InputGroup className="w-full max-w-sm">
                                <InputGroupAddon>
                                    <Search aria-hidden />
                                </InputGroupAddon>
                                <InputGroupInput
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search student, department, or record type"
                                />
                            </InputGroup>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={load}
                                        loading={isPending && !actingOn}
                                    >
                                        {isPending && !actingOn ? null : <RefreshCw aria-hidden />}
                                        <span className="sr-only">Refresh queue</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Refresh queue</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {error ? <InlineAlert message={{ type: "error", text: error }} /> : null}
                </CardContent>
            </Card>

            {summary ? (
                <section className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="size-4 text-muted-foreground" aria-hidden />
                                Verification status split
                            </CardTitle>
                            <CardDescription>
                                Where the queue currently stands across all uploaded evidence.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StatusDonutChart
                                totalLabel="Documents"
                                data={[
                                    { status: "Pending", value: summary.pendingCount },
                                    { status: "Verified", value: summary.verifiedCount },
                                    { status: "Rejected", value: summary.rejectedCount },
                                ]}
                                emptyMessage="No evidence has been uploaded yet."
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileStack className="size-4 text-muted-foreground" aria-hidden />
                                By record type
                            </CardTitle>
                            <CardDescription>
                                Which student modules are creating the most verification work.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BreakdownBarChart
                                valueLabel="Documents"
                                data={summary.recordTypeBreakdown.map((entry) => ({
                                    label: entry.label,
                                    value: entry.count,
                                }))}
                                emptyMessage="No records have attached evidence yet."
                            />
                        </CardContent>
                    </Card>

                    <Card className="xl:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="size-4 text-muted-foreground" aria-hidden />
                                Department backlog
                            </CardTitle>
                            <CardDescription>
                                Departments with the largest verification load. Hover a bar for its pending count.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BreakdownBarChart
                                valueLabel="Documents"
                                secondaryLabel="Pending"
                                data={summary.departmentBreakdown.map((entry) => ({
                                    label: entry.label,
                                    value: entry.count,
                                    secondaryValue: entry.pendingCount,
                                }))}
                                emptyMessage="No departments have submitted evidence yet."
                            />
                        </CardContent>
                    </Card>
                </section>
            ) : null}

            {summary && summary.stalePendingCount > 0 ? (
                <InlineAlert tone="warning" title="Stale items in the queue" icon={TriangleAlert}>
                    {summary.stalePendingCount} pending item(s) have been waiting longer than expected. Clearing
                    these first keeps departments unblocked.
                </InlineAlert>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hourglass className="size-4 text-muted-foreground" aria-hidden />
                        Evidence Queue
                        <span className="text-sm font-normal text-muted-foreground tabular-nums">
                            ({filteredItems.length})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {emptyState ? (
                        <EmptyState
                            bordered
                            icon={FileSearch}
                            title={emptyState.title}
                            description={emptyState.description}
                        />
                    ) : (
                        <div className="overflow-x-auto">
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
                                    {filteredItems.map((item) => {
                                        const verifying = actingOn === `${item.document.id}:Verified`;
                                        const rejecting = actingOn === `${item.document.id}:Rejected`;

                                        return (
                                            <TableRow key={item.document.id}>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">
                                                        {item.student.name || "-"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.student.enrollmentNo}
                                                        {item.student.departmentName
                                                            ? ` • ${item.student.departmentName}`
                                                            : ""}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-foreground">
                                                        {item.summary}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.recordType.toUpperCase()} •{" "}
                                                        {formatDate(item.submittedAt)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.document.fileUrl ? (
                                                        <Button asChild variant="link" size="sm" className="px-0">
                                                            <a
                                                                href={item.document.fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <ExternalLink aria-hidden />
                                                                {item.document.fileName ?? "Evidence file"}
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            No file
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={item.document.verificationStatus ?? "Pending"}
                                                    />
                                                </TableCell>
                                                <TableCell className="min-w-[200px]">
                                                    <Textarea
                                                        value={
                                                            remarks[item.document.id] ??
                                                            item.document.verificationRemarks ??
                                                            ""
                                                        }
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
                                                            loading={verifying}
                                                            disabled={
                                                                isPending ||
                                                                item.document.verificationStatus === "Verified"
                                                            }
                                                            onClick={() =>
                                                                updateStatus(item.document.id, "Verified")
                                                            }
                                                        >
                                                            {verifying ? null : <CheckCheck aria-hidden />}
                                                            Verify
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            loading={rejecting}
                                                            disabled={
                                                                isPending ||
                                                                item.document.verificationStatus === "Rejected"
                                                            }
                                                            onClick={() =>
                                                                updateStatus(item.document.id, "Rejected")
                                                            }
                                                        >
                                                            {rejecting ? null : <X aria-hidden />}
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
