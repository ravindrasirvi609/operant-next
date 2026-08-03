"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, Lock, Plus, RefreshCw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert, type FeedbackMessage } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard, StatTile } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
import { DetailList } from "@/components/workspace/detail-list";
import { RecordCard } from "@/components/workspace/record-card";
import { RecordGrid, WorkspaceDetail, WorkspaceIndex } from "@/components/workspace/record-workspace";
import { StatusTimeline, type TimelineEntry } from "@/components/workspace/status-timeline";
import { getAcademicYearReportingPeriod } from "@/lib/academic-year";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import { formatDateRange, formatTimestamp } from "@/lib/ui/dates";
import { humanizeStatus } from "@/lib/ui/status";

/**
 * Institution-wide AQAR cycle compilation.
 *
 * Rebuilt on the shared workspace shell. Beyond the layout, four things were
 * wrong in a way worth naming:
 *
 *   - **The create row had no labels.** Three unlabelled controls — a year Select
 *     and two bare `<input type="date">` — sat in a `md:grid-cols-4` row with the
 *     Create button, so "from" and "to" were distinguishable only by position.
 *   - **The narrative saved on blur, silently.** `onBlur={…saveNarrative}` fired a
 *     PATCH per criterion with no indication that anything had been sent, and
 *     `defaultValue` meant the field never reflected what the server stored back.
 *   - **`completionPercent` was a bare `<Badge>{n}%</Badge>`.** It is a progress
 *     value; it renders as one now.
 *   - **Metric keys were printed raw.** `Object.entries(criterion.metrics)` fed
 *     camelCase keys straight into a label, so the UI read "approvedPbasReports".
 *     `humanizeStatus` from lib/ui/status.ts already splits those.
 */

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

type AcademicYearOption = { id: string; label: string; isActive?: boolean };

const CYCLE_STATUS_OPTIONS = [
    "Draft",
    "Department Review",
    "IQAC Review",
    "Finalized",
    "Submitted",
] as const;

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
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [message, setMessage] = useState<FeedbackMessage | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState(() => {
        const option =
            academicYearOptions.find((item) => item.label === defaultAcademicYearLabel) ??
            academicYearOptions.find((item) => item.isActive) ??
            academicYearOptions[0];
        const label = option?.label ?? defaultAcademicYearLabel;
        const period = getAcademicYearReportingPeriod(label);

        return {
            academicYearId: option?.id ?? "",
            academicYear: label,
            fromDate: period?.fromDate ?? "",
            toDate: period?.toDate ?? "",
        };
    });

    const selected = useMemo(
        () => cycles.find((cycle) => cycle._id === selectedId) ?? null,
        [cycles, selectedId]
    );

    const replaceCycle = useCallback((updated: AqarCycle) => {
        setCycles((current) => {
            const exists = current.some((cycle) => cycle._id === updated._id);
            return exists
                ? current.map((cycle) => (cycle._id === updated._id ? updated : cycle))
                : [updated, ...current];
        });
    }, []);

    const mutate = useCallback(
        async (
            key: string,
            url: string,
            init: { method: string; body?: unknown },
            fallback: string,
            options?: { select?: boolean }
        ) => {
            setMessage(null);
            setBusy(key);

            try {
                const payload = await requestJson<{ message?: string; cycle?: AqarCycle }>(url, {
                    method: init.method,
                    body: init.body,
                    fallbackMessage: fallback,
                });

                if (!payload.cycle) {
                    setMessage({ type: "error", text: payload.message ?? fallback });
                    return;
                }

                replaceCycle(payload.cycle);
                if (options?.select) {
                    setSelectedId(payload.cycle._id);
                }
                setMessage({ type: "success", text: payload.message ?? "Cycle updated." });
            } catch (cause) {
                setMessage({ type: "error", text: toErrorMessage(cause, fallback) });
            } finally {
                setBusy(null);
            }
        },
        [replaceCycle]
    );

    // --- index view ---------------------------------------------------------

    if (!selected) {
        return (
            <WorkspaceIndex
                message={message}
                listTitle="AQAR cycles"
                listDescription="One institutional cycle per academic year."
                overview={
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Create a cycle</CardTitle>
                            <CardDescription>
                                Compiles NAAC-ready criteria snapshots from PBAS, CAS, faculty, student, and
                                organizational sources for the chosen year.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="cycle-year">Academic year</Label>
                                <Select
                                    value={createForm.academicYearId || undefined}
                                    onValueChange={(value) => {
                                        const option = academicYearOptions.find((item) => item.id === value);
                                        if (!option) return;

                                        const period = getAcademicYearReportingPeriod(option.label);
                                        setCreateForm((current) => ({
                                            academicYearId: option.id,
                                            academicYear: option.label,
                                            fromDate: period?.fromDate ?? current.fromDate,
                                            toDate: period?.toDate ?? current.toDate,
                                        }));
                                    }}
                                >
                                    <SelectTrigger id="cycle-year" className="w-full">
                                        <SelectValue placeholder="Select academic year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYearOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.isActive ? `${option.label} (Active)` : option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cycle-from">Reporting from</Label>
                                <Input
                                    id="cycle-from"
                                    type="date"
                                    value={createForm.fromDate}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            fromDate: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cycle-to">Reporting to</Label>
                                <Input
                                    id="cycle-to"
                                    type="date"
                                    value={createForm.toDate}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            toDate: event.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <Button
                                type="button"
                                loading={busy === "create"}
                                disabled={busy !== null || !createForm.academicYearId}
                                onClick={() =>
                                    void mutate(
                                        "create",
                                        "/api/admin/aqar/cycles",
                                        {
                                            method: "POST",
                                            body: {
                                                academicYearId: createForm.academicYearId,
                                                academicYear: createForm.academicYear,
                                                reportingPeriod: {
                                                    fromDate: createForm.fromDate,
                                                    toDate: createForm.toDate,
                                                },
                                            },
                                        },
                                        "Unable to create the AQAR cycle.",
                                        { select: true }
                                    )
                                }
                            >
                                <Plus aria-hidden />
                                Create cycle
                            </Button>
                        </CardContent>
                    </Card>
                }
            >
                {cycles.length ? (
                    <RecordGrid>
                        {cycles.map((cycle) => (
                            <RecordCard
                                key={cycle._id}
                                title={cycle.academicYear}
                                subtitle={formatDateRange(
                                    cycle.reportingPeriod.fromDate,
                                    cycle.reportingPeriod.toDate
                                )}
                                status={cycle.status}
                                openLabel={`Open the ${cycle.academicYear} AQAR cycle`}
                                openHint="Open cycle"
                                onOpen={() => setSelectedId(cycle._id)}
                                meta={[
                                    { label: "Criteria", value: cycle.criteriaSections.length },
                                    { label: "Publications", value: cycle.summaryMetrics.publications },
                                ]}
                            />
                        ))}
                    </RecordGrid>
                ) : (
                    <EmptyState
                        bordered
                        title="No AQAR cycles yet"
                        description="Create a cycle for the active academic year to compile institution-wide NAAC criteria."
                    />
                )}
            </WorkspaceIndex>
        );
    }

    // --- detail view --------------------------------------------------------

    const auditEntries: TimelineEntry[] = selected.statusLogs.map((log, index) => ({
        id: `${log.action}-${index}`,
        status: log.action,
        actorName: log.actorName,
        actorRole: log.actorRole,
        remarks: log.remarks,
        changedAt: log.changedAt,
    }));

    const rail = (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Institution profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailList
                        columns={1}
                        items={[
                            { label: "University", value: selected.institutionProfile.universityName },
                            { label: "College", value: selected.institutionProfile.collegeName },
                            { label: "Departments", value: selected.institutionProfile.totalDepartments },
                            { label: "Programs", value: selected.institutionProfile.totalPrograms },
                            {
                                label: "Reporting period",
                                value: formatDateRange(
                                    selected.reportingPeriod.fromDate,
                                    selected.reportingPeriod.toDate
                                ),
                            },
                        ]}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Audit trail</CardTitle>
                    <CardDescription>Every generation and workflow update.</CardDescription>
                </CardHeader>
                <CardContent>
                    <StatusTimeline
                        entries={auditEntries}
                        emptyTitle="No activity yet"
                        emptyDescription="Cycle generation and status changes appear here."
                    />
                </CardContent>
            </Card>
        </>
    );

    return (
        <WorkspaceDetail
            onBack={() => setSelectedId(null)}
            backLabel="All cycles"
            title={`${selected.academicYear} AQAR cycle`}
            subtitle={`${selected.criteriaSections.length} NAAC criteria`}
            status={selected.status}
            message={message}
            rail={rail}
            railTitle="Cycle details"
        >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Faculty" value={selected.institutionProfile.totalFaculty} dense tone="info" />
                <StatCard label="Students" value={selected.institutionProfile.totalStudents} dense tone="info" />
                <StatCard
                    label="PBAS reports"
                    value={selected.summaryMetrics.approvedPbasReports}
                    dense
                    tone="success"
                />
                <StatCard label="CAS applications" value={selected.summaryMetrics.casApplications} dense tone="accent" />
                <StatCard label="Publications" value={selected.summaryMetrics.publications} dense tone="accent" />
                <StatCard label="Projects" value={selected.summaryMetrics.projects} dense tone="neutral" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Cycle actions</CardTitle>
                    <CardDescription>
                        Regenerating replaces every criterion snapshot from the current source data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-xs space-y-2">
                        <Label htmlFor="cycle-status">Cycle status</Label>
                        <Select
                            value={selected.status}
                            onValueChange={(status) =>
                                void mutate(
                                    "status",
                                    `/api/admin/aqar/cycles/${selected._id}`,
                                    { method: "PATCH", body: { status } },
                                    "Unable to update the cycle status."
                                )
                            }
                        >
                            <SelectTrigger id="cycle-status" className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {CYCLE_STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            loading={busy === "generate"}
                            disabled={busy !== null}
                            onClick={() =>
                                void mutate(
                                    "generate",
                                    `/api/admin/aqar/cycles/${selected._id}/generate`,
                                    { method: "POST" },
                                    "Unable to regenerate the cycle snapshot."
                                )
                            }
                        >
                            <RefreshCw aria-hidden />
                            Regenerate snapshot
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            loading={busy === "finalize"}
                            disabled={busy !== null}
                            onClick={() =>
                                void mutate(
                                    "finalize",
                                    `/api/admin/aqar/cycles/${selected._id}/finalize`,
                                    { method: "POST" },
                                    "Unable to finalize the cycle."
                                )
                            }
                        >
                            <Lock aria-hidden />
                            Finalize
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            loading={busy === "submit"}
                            disabled={busy !== null}
                            onClick={() =>
                                void mutate(
                                    "submit",
                                    `/api/admin/aqar/cycles/${selected._id}/submit`,
                                    { method: "POST" },
                                    "Unable to submit the cycle."
                                )
                            }
                        >
                            <Send aria-hidden />
                            Submit
                        </Button>
                        <Button asChild type="button" size="sm" variant="ghost">
                            <a href={`/api/admin/aqar/cycles/${selected._id}/report`}>
                                <Download aria-hidden />
                                Download PDF
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-4">
                <SectionHeader
                    title="NAAC criteria"
                    description="Auto-generated snapshots, with an IQAC narrative per criterion."
                />

                {selected.criteriaSections.map((criterion) => (
                    <CriterionCard
                        key={criterion.criterionCode}
                        cycleId={selected._id}
                        criterion={criterion}
                        busy={busy}
                        onSaveNarrative={(narrative) =>
                            void mutate(
                                `narrative-${criterion.criterionCode}`,
                                `/api/admin/aqar/cycles/${selected._id}`,
                                {
                                    method: "PATCH",
                                    body: {
                                        criteriaSections: [
                                            {
                                                criterionCode: criterion.criterionCode,
                                                narrative,
                                                status: "Reviewed",
                                            },
                                        ],
                                    },
                                },
                                "Unable to save the criterion narrative."
                            )
                        }
                    />
                ))}
            </section>
        </WorkspaceDetail>
    );
}

function CriterionCard({
    cycleId,
    criterion,
    busy,
    onSaveNarrative,
}: {
    cycleId: string;
    criterion: Criterion;
    busy: string | null;
    onSaveNarrative: (narrative: string) => void;
}) {
    const [narrative, setNarrative] = useState(criterion.narrative ?? "");
    const narrativeId = `narrative-${cycleId}-${criterion.criterionCode}`;
    const saveKey = `narrative-${criterion.criterionCode}`;
    const dirty = narrative !== (criterion.narrative ?? "");

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-base">
                            {criterion.criterionCode} · {criterion.title}
                        </CardTitle>
                        <CardDescription>{criterion.summary}</CardDescription>
                    </div>
                    <div className="w-full max-w-40 shrink-0 space-y-1">
                        <p className="text-right text-xs text-muted-foreground">
                            {criterion.completionPercent}% complete
                        </p>
                        <Progress
                            value={criterion.completionPercent}
                            aria-label={`${criterion.criterionCode} completion`}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.keys(criterion.metrics).length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                        {Object.entries(criterion.metrics).map(([key, value]) => (
                            // `humanizeStatus` splits camelCase; the original printed
                            // the raw key, so labels read "approvedPbasReports".
                            <StatTile key={key} label={humanizeStatus(key)} value={String(value)} />
                        ))}
                    </div>
                ) : null}

                {criterion.sourceSnapshots.length ? (
                    <div className="rounded-lg border bg-muted/40 p-3">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Source snapshots
                        </p>
                        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                            {criterion.sourceSnapshots.map((source) => (
                                <div
                                    key={`${criterion.criterionCode}-${source.label}`}
                                    className="flex justify-between gap-3 text-sm"
                                >
                                    <dt className="min-w-0 text-muted-foreground">{source.label}</dt>
                                    <dd className="shrink-0 font-medium text-foreground">
                                        {source.count ?? source.value ?? "—"}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ) : null}

                <div className="space-y-2">
                    <Label htmlFor={narrativeId}>IQAC narrative</Label>
                    <Textarea
                        id={narrativeId}
                        rows={4}
                        value={narrative}
                        onChange={(event) => setNarrative(event.target.value)}
                        placeholder="Criterion-level institutional narrative for the final NAAC AQAR report."
                    />
                    {/* An explicit Save, rather than the original's silent
                        `onBlur` PATCH per criterion — which gave no feedback and,
                        with `defaultValue`, never reflected what the server stored. */}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            loading={busy === saveKey}
                            disabled={busy !== null || !dirty}
                            onClick={() => onSaveNarrative(narrative)}
                        >
                            Save narrative
                        </Button>
                        {dirty ? (
                            <span className="text-xs text-warning-muted-foreground">Unsaved changes</span>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
