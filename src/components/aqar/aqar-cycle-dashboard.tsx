"use client";

import { useMemo, useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getAcademicYearReportingPeriod } from "@/lib/academic-year";

type Criterion = {
    criterionCode: string;
    title: string;
    summary: string;
    narrative?: string;
    metrics: Record<string, number | string>;
    completionPercent: number;
    status: string;
    sourceSnapshots: Array<{ sourceType: string; label: string; count?: number; value?: string }>;
};

type AqarCycle = {
    _id: string;
    academicYear: string;
    reportingPeriod: { fromDate: string; toDate: string };
    institutionProfile: {
        universityName?: string;
        collegeName?: string;
        totalFaculty: number;
        totalStudents: number;
        totalDepartments: number;
        totalPrograms: number;
    };
    summaryMetrics: {
        approvedPbasReports: number;
        casApplications: number;
        facultyAqarContributions: number;
        placements: number;
        publications: number;
        projects: number;
    };
    criteriaSections: Criterion[];
    status: string;
    statusLogs: Array<{
        action: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt: string;
    }>;
};

type AcademicYearOption = {
    id: string;
    label: string;
    isActive?: boolean;
};

const cycleStatusOptions = ["Draft", "Department Review", "IQAC Review", "Finalized", "Submitted"] as const;

export function AqarCycleDashboard({
    initialCycles,
    academicYearOptions,
    defaultAcademicYearLabel = "",
}: {
    initialCycles: AqarCycle[];
    academicYearOptions: AcademicYearOption[];
    defaultAcademicYearLabel?: string;
}) {
    const [cycles, setCycles] = useState(initialCycles);
    const [selectedId, setSelectedId] = useState<string | null>(initialCycles[0]?._id ?? null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [createForm, setCreateForm] = useState(() => {
        const initialOption =
            academicYearOptions.find((option) => option.label === defaultAcademicYearLabel) ??
            academicYearOptions.find((option) => option.isActive) ??
            academicYearOptions[0];
        const initialLabel = initialOption?.label ?? defaultAcademicYearLabel;
        const period = getAcademicYearReportingPeriod(initialLabel);
        return {
            academicYearId: initialOption?.id ?? "",
            academicYear: initialLabel,
            fromDate: period?.fromDate ?? "",
            toDate: period?.toDate ?? "",
        };
    });

    const selected = useMemo(
        () => cycles.find((cycle) => cycle._id === selectedId) ?? null,
        [cycles, selectedId]
    );

    function replaceCycle(updated: AqarCycle) {
        setCycles((current) => {
            const exists = current.some((cycle) => cycle._id === updated._id);
            if (!exists) return [updated, ...current];
            return current.map((cycle) => (cycle._id === updated._id ? updated : cycle));
        });
        setSelectedId(updated._id);
    }

    function createCycle() {
        setMessage(null);
        startTransition(async () => {
            const response = await fetch("/api/admin/aqar/cycles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: createForm.academicYearId,
                    academicYear: createForm.academicYear,
                    reportingPeriod: { fromDate: createForm.fromDate, toDate: createForm.toDate },
                }),
            });

            const data = (await response.json()) as { message?: string; cycle?: AqarCycle };
            if (!response.ok || !data.cycle) {
                setMessage({ type: "error", text: data.message ?? "Unable to create AQAR cycle." });
                return;
            }

            replaceCycle(data.cycle);
            setMessage({ type: "success", text: data.message ?? "AQAR cycle created." });
        });
    }

    function runAction(action: "generate" | "finalize" | "submit") {
        if (!selectedId) return;

        startTransition(async () => {
            const response = await fetch(`/api/admin/aqar/cycles/${selectedId}/${action}`, {
                method: "POST",
            });
            const data = (await response.json()) as { message?: string; cycle?: AqarCycle };
            if (!response.ok || !data.cycle) {
                setMessage({ type: "error", text: data.message ?? `Unable to ${action} AQAR cycle.` });
                return;
            }

            replaceCycle(data.cycle);
            setMessage({ type: "success", text: data.message ?? "AQAR cycle updated." });
        });
    }

    function updateCycleStatus(status: string) {
        if (!selectedId) return;

        startTransition(async () => {
            const response = await fetch(`/api/admin/aqar/cycles/${selectedId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            const data = (await response.json()) as { message?: string; cycle?: AqarCycle };
            if (!response.ok || !data.cycle) {
                setMessage({ type: "error", text: data.message ?? "Unable to update AQAR cycle status." });
                return;
            }

            replaceCycle(data.cycle);
            setMessage({ type: "success", text: data.message ?? "AQAR cycle status updated." });
        });
    }

    function saveNarrative(criterionCode: string, narrative: string) {
        if (!selectedId) return;

        startTransition(async () => {
            const response = await fetch(`/api/admin/aqar/cycles/${selectedId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    criteriaSections: [{ criterionCode, narrative, status: "Reviewed" }],
                }),
            });
            const data = (await response.json()) as { message?: string; cycle?: AqarCycle };
            if (!response.ok || !data.cycle) {
                setMessage({ type: "error", text: data.message ?? "Unable to save AQAR narrative." });
                return;
            }

            replaceCycle(data.cycle);
            setMessage({ type: "success", text: data.message ?? "AQAR criterion updated." });
        });
    }

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <Card>
                <CardHeader>
                    <CardTitle>Institutional AQAR Cycles</CardTitle>
                    <CardDescription>
                        Generate NAAC-ready AQAR cycles from PBAS, CAS, faculty, student, and institutional source modules.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                    <Select
                        value={createForm.academicYearId || undefined}
                        onValueChange={(value) => {
                            const selectedOption = academicYearOptions.find((option) => option.id === value);
                            if (!selectedOption) {
                                return;
                            }

                            const period = getAcademicYearReportingPeriod(selectedOption.label);
                            setCreateForm((current) => ({
                                ...current,
                                academicYearId: selectedOption.id,
                                academicYear: selectedOption.label,
                                fromDate: period?.fromDate ?? current.fromDate,
                                toDate: period?.toDate ?? current.toDate,
                            }));
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                        </SelectTrigger>
                        <SelectContent>
                            {academicYearOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}{option.isActive ? " (Active)" : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        value={createForm.fromDate}
                        onChange={(event) => setCreateForm((current) => ({ ...current, fromDate: event.target.value }))}
                    />
                    <Input
                        type="date"
                        value={createForm.toDate}
                        onChange={(event) => setCreateForm((current) => ({ ...current, toDate: event.target.value }))}
                    />
                    <Button onClick={createCycle} disabled={isPending}>
                        {isPending ? <Spinner /> : null}
                        Create AQAR Cycle
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Cycle List</CardTitle>
                        <CardDescription>Academic-year AQAR cycles and their current institutional status.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {cycles.length ? cycles.map((cycle) => (
                            <button
                                type="button"
                                key={cycle._id}
                                onClick={() => setSelectedId(cycle._id)}
                                className={`rounded-lg border p-4 text-left ${
                                    selectedId === cycle._id ? "border-zinc-400 bg-white" : "border-zinc-200 bg-zinc-50"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-zinc-950">{cycle.academicYear}</p>
                                    <Badge>{cycle.status}</Badge>
                                </div>
                                <p className="mt-2 text-sm text-zinc-600">
                                    Criteria {cycle.criteriaSections.length} | Publications {cycle.summaryMetrics.publications}
                                </p>
                            </button>
                        )) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No institutional AQAR cycles created yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {selected ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{selected.academicYear} AQAR Cycle</CardTitle>
                                <CardDescription>
                                    Institutional AQAR compilation workspace with auto-generated NAAC criteria snapshots.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <Metric label="Faculty" value={String(selected.institutionProfile.totalFaculty)} />
                                    <Metric label="Students" value={String(selected.institutionProfile.totalStudents)} />
                                    <Metric label="PBAS Reports" value={String(selected.summaryMetrics.approvedPbasReports)} />
                                    <Metric label="Publications" value={String(selected.summaryMetrics.publications)} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="grid gap-2">
                                        <p className="text-sm font-medium text-zinc-950">Cycle Status</p>
                                        <Select value={selected.status} onValueChange={updateCycleStatus}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {cycleStatusOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="button" variant="secondary" onClick={() => runAction("generate")} disabled={isPending}>
                                        {isPending ? <Spinner /> : null}
                                        Regenerate Snapshot
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={() => runAction("finalize")} disabled={isPending}>
                                        Finalize Cycle
                                    </Button>
                                    <div className="flex gap-3">
                                        <Button type="button" onClick={() => runAction("submit")} disabled={isPending}>
                                            Submit Cycle
                                        </Button>
                                        <Button asChild type="button" variant="secondary">
                                            <a href={`/api/admin/aqar/cycles/${selected._id}/report`}>Download PDF</a>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4">
                            {selected.criteriaSections.map((criterion) => (
                                <Card key={criterion.criterionCode}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <CardTitle>{criterion.criterionCode} {criterion.title}</CardTitle>
                                                <CardDescription>{criterion.summary}</CardDescription>
                                            </div>
                                            <Badge>{criterion.completionPercent}%</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid gap-4">
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                            {Object.entries(criterion.metrics).map(([key, value]) => (
                                                <Metric key={key} label={key} value={String(value)} />
                                            ))}
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                            <p className="text-sm font-medium text-zinc-950">Source snapshots</p>
                                            <div className="mt-3 grid gap-2">
                                                {criterion.sourceSnapshots.map((source) => (
                                                    <p className="text-sm text-zinc-600" key={`${criterion.criterionCode}-${source.label}`}>
                                                        {source.label}: {source.count ?? source.value ?? "-"}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <p className="text-sm font-medium text-zinc-950">IQAC Narrative</p>
                                            <Textarea
                                                defaultValue={criterion.narrative ?? ""}
                                                placeholder="Add criterion-level institutional narrative for the final NAAC AQAR report."
                                                onBlur={(event) => saveNarrative(criterion.criterionCode, event.target.value)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cycle Audit Trail</CardTitle>
                                <CardDescription>All AQAR cycle generation and workflow updates are logged here.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {selected.statusLogs.map((log, index) => (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${log.action}-${index}`}>
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="font-semibold text-zinc-950">{log.action}</p>
                                            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                                                {new Date(log.changedAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="mt-2 text-sm text-zinc-600">
                                            {log.actorName ? `${log.actorName} (${log.actorRole ?? "User"})` : "System"}
                                        </p>
                                        {log.remarks ? <p className="mt-1 text-sm text-zinc-500">{log.remarks}</p> : null}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
