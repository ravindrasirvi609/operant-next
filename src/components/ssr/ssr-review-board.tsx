"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert, type FeedbackMessage } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DetailList } from "@/components/workspace/detail-list";
import { RecordCard } from "@/components/workspace/record-card";
import { RecordGrid, WorkspaceDetail, WorkspaceIndex } from "@/components/workspace/record-workspace";
import { StatusTimeline, type TimelineEntry } from "@/components/workspace/status-timeline";
import { SsrEvidence, SsrProse, SsrSubmittedValues, type SsrDocument } from "@/components/ssr/ssr-response-view";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import { formatDateLabel, formatTimestamp } from "@/lib/ui/dates";

/**
 * SSR reviewer workspace.
 *
 * Was 747 lines built on the same `xl:grid-cols-[360px_minmax(0,1fr)]` split as
 * the other modules, with the register on the left and — on the right — eight
 * stacked cards holding the metric header, the response payload, links, documents,
 * the workflow action, review history, and the status timeline. Below 1280px all
 * of that became one column, so reaching the action buttons meant scrolling past
 * the entire submitted response.
 *
 * Split into an index (the register) and a focused detail view, with the two
 * histories moved to the rail and the decision buttons pinned in the header where
 * they are reachable at any scroll position.
 */

type SsrReviewRecord = {
    _id: string;
    assignmentId: string;
    cycleTitle: string;
    cycleCode: string;
    criterionCode: string;
    criterionTitle: string;
    metricCode: string;
    metricTitle: string;
    metricDescription?: string;
    metricInstructions?: string;
    metricType?: string;
    dataType?: string;
    ownershipScope?: string;
    evidenceMode?: string;
    sourceModule?: string;
    benchmarkValue?: string;
    unitLabel?: string;
    sectionTitle?: string;
    sectionPrompt?: string;
    sectionGuidance?: string;
    wordLimitMin?: number;
    wordLimitMax?: number;
    contributorName: string;
    contributorEmail: string;
    contributorRole: string;
    status: string;
    assignmentStatus: string;
    dueDate?: string | Date;
    assignmentNotes?: string;
    valueSummary: string;
    narrativeResponse?: string;
    metricValueNumeric?: number;
    metricValueText?: string;
    metricValueBoolean?: boolean;
    metricValueDate?: string | Date;
    tableData?: Record<string, unknown>;
    supportingLinks: string[];
    documents: SsrDocument[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: Array<{
        reviewerName?: string;
        reviewerRole?: string;
        stage: string;
        decision: string;
        remarks?: string;
        reviewedAt?: string | Date;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: string | Date;
    }>;
    submittedAt?: string | Date;
    reviewedAt?: string | Date;
    approvedAt?: string | Date;
    updatedAt?: string | Date;
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    currentStageLabel: string;
    currentStageKind: string | null;
    availableDecisions: string[];
    permissions: {
        canView: boolean;
        canReview: boolean;
        canApprove: boolean;
        canReject: boolean;
    };
};

type SsrReviewSummary = {
    total: number;
    actionableCount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
};

type TabKey = "actionable" | "history" | "all";

function isActionable(record: SsrReviewRecord) {
    return record.permissions.canReview || record.permissions.canApprove;
}

function toIso(value?: string | Date) {
    return value ? String(value) : undefined;
}

export function SsrReviewBoard({
    records,
    summary,
    viewerLabel,
}: {
    records: SsrReviewRecord[];
    summary: SsrReviewSummary;
    viewerLabel: string;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [activeTab, setActiveTab] = useState<TabKey>("actionable");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<FeedbackMessage | null>(null);
    const [pendingDecision, setPendingDecision] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        return records.filter((record) => {
            if (activeTab === "actionable" && !isActionable(record)) return false;
            if (activeTab === "history" && isActionable(record)) return false;
            if (!query) return true;

            return [
                record.metricCode,
                record.metricTitle,
                record.cycleTitle,
                record.criterionCode,
                record.contributorName,
                record.contributorEmail,
                record.status,
                record.currentStageLabel,
                record.scopeDepartmentName,
                record.scopeCollegeName,
                record.scopeUniversityName,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [activeTab, deferredSearch, records]);

    const selected = selectedId ? records.find((record) => record._id === selectedId) : undefined;

    async function submitDecision(record: SsrReviewRecord, decision: string) {
        setMessage(null);
        setPendingDecision(decision);

        try {
            const payload = await requestJson<{ message?: string }>(
                `/api/ssr/responses/${record._id}/review`,
                {
                    method: "POST",
                    body: {
                        decision,
                        remarks:
                            remarks[record._id]?.trim() ||
                            `Recorded from the ${viewerLabel.toLowerCase()} SSR workspace.`,
                    },
                    fallbackMessage: "Unable to record the SSR review decision.",
                }
            );

            setRemarks((current) => ({ ...current, [record._id]: "" }));
            setMessage({ type: "success", text: payload.message ?? "Decision recorded." });
            // The server owns stage transitions and permissions, so re-fetch rather
            // than trying to recompute the new workflow state on the client.
            router.refresh();
        } catch (cause) {
            setMessage({
                type: "error",
                text: toErrorMessage(cause, "Unable to record the SSR review decision."),
            });
        } finally {
            setPendingDecision(null);
        }
    }

    // --- index view ---------------------------------------------------------

    if (!selected) {
        return (
            <WorkspaceIndex
                message={message}
                listTitle="Submission register"
                listDescription={`${filtered.length} of ${records.length} responses shown.`}
                overview={
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                            <StatCard label="Total" value={summary.total} dense tone="neutral" />
                            <StatCard
                                label="Actionable"
                                value={summary.actionableCount}
                                dense
                                tone="warning"
                            />
                            <StatCard label="Pending" value={summary.pendingCount} dense tone="info" />
                            <StatCard label="Approved" value={summary.approvedCount} dense tone="success" />
                            <StatCard label="Rejected" value={summary.rejectedCount} dense tone="danger" />
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="min-w-0">
                                        <CardTitle>{viewerLabel} SSR review</CardTitle>
                                        <CardDescription>
                                            Open a response to inspect the narrative, values, and evidence before
                                            recording a decision.
                                        </CardDescription>
                                    </div>
                                    <div className="w-full lg:max-w-sm">
                                        <Label htmlFor="ssr-review-search" className="sr-only">
                                            Search SSR responses
                                        </Label>
                                        <div className="relative">
                                            <Search
                                                aria-hidden
                                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                            />
                                            <Input
                                                id="ssr-review-search"
                                                className="pl-9"
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                                placeholder="Metric, contributor, status, or scope"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
                                    <TabsList>
                                        <TabsTrigger value="actionable">
                                            Actionable ({records.filter(isActionable).length})
                                        </TabsTrigger>
                                        <TabsTrigger value="history">
                                            History ({records.filter((record) => !isActionable(record)).length})
                                        </TabsTrigger>
                                        <TabsTrigger value="all">All ({records.length})</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                }
            >
                {filtered.length ? (
                    <RecordGrid>
                        {filtered.map((record) => (
                            <RecordCard
                                key={record._id}
                                title={`${record.metricCode} · ${record.metricTitle}`}
                                subtitle={`${record.contributorName || "Contributor not mapped"} · ${record.currentStageLabel}`}
                                status={record.status}
                                openLabel={`Review ${record.metricCode}`}
                                openHint={isActionable(record) ? "Review now" : "View response"}
                                onOpen={() => setSelectedId(record._id)}
                                meta={[
                                    { label: "Evidence", value: `${record.documents.length} docs · ${record.supportingLinks.length} links` },
                                    { label: "Updated", value: formatTimestamp(toIso(record.updatedAt)) },
                                ]}
                            />
                        ))}
                    </RecordGrid>
                ) : (
                    <EmptyState
                        bordered
                        icon={records.length ? Search : ShieldOff}
                        title={
                            records.length
                                ? "No responses match these filters"
                                : "No SSR responses in your scope"
                        }
                        description={
                            records.length
                                ? "Try a different search term, or switch to the All tab."
                                : "Responses appear here once they reach a stage assigned to your account."
                        }
                    />
                )}
            </WorkspaceIndex>
        );
    }

    // --- detail view --------------------------------------------------------

    const canAct = isActionable(selected) && selected.availableDecisions.length > 0;
    const remarksId = `ssr-remarks-${selected._id}`;

    const reviewEntries: TimelineEntry[] = selected.reviewHistory.map((entry, index) => ({
        id: `${entry.stage}-${index}`,
        status: entry.decision,
        actorName: entry.reviewerName,
        actorRole: entry.reviewerRole,
        remarks: entry.remarks ? `${entry.stage}: ${entry.remarks}` : `Stage: ${entry.stage}`,
        changedAt: toIso(entry.reviewedAt),
    }));

    const statusEntries: TimelineEntry[] = selected.statusLogs.map((entry, index) => ({
        id: `${entry.status}-${index}`,
        status: entry.status,
        actorName: entry.actorName,
        actorRole: entry.actorRole,
        remarks: entry.remarks,
        changedAt: toIso(entry.changedAt),
    }));

    const rail = (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Response</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailList
                        columns={1}
                        items={[
                            { label: "Cycle", value: `${selected.cycleCode} · ${selected.cycleTitle}` },
                            { label: "Criterion", value: `${selected.criterionCode} · ${selected.criterionTitle}` },
                            { label: "Section", value: selected.sectionTitle || "Whole metric" },
                            {
                                label: "Contributor",
                                value: `${selected.contributorName || "Not mapped"} · ${selected.contributorRole}`,
                            },
                            { label: "Contributor email", value: selected.contributorEmail || "Not recorded" },
                            {
                                label: "Scope",
                                value:
                                    selected.scopeDepartmentName ||
                                    selected.scopeCollegeName ||
                                    selected.scopeUniversityName ||
                                    "Unscoped",
                            },
                            { label: "Response type", value: selected.dataType || selected.metricType },
                            { label: "Evidence mode", value: selected.evidenceMode },
                            { label: "Due date", value: formatDateLabel(toIso(selected.dueDate)) },
                            { label: "Submitted", value: formatTimestamp(toIso(selected.submittedAt)) },
                            { label: "Reviewed", value: formatTimestamp(toIso(selected.reviewedAt)) },
                            { label: "Approved", value: formatTimestamp(toIso(selected.approvedAt)) },
                        ]}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Review history</CardTitle>
                </CardHeader>
                <CardContent>
                    <StatusTimeline
                        entries={reviewEntries}
                        emptyTitle="No review actions yet"
                        emptyDescription="Decisions recorded by reviewers appear here."
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Status timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <StatusTimeline
                        entries={statusEntries}
                        emptyTitle="No status changes yet"
                        emptyDescription="Workflow transitions appear here."
                    />
                </CardContent>
            </Card>
        </>
    );

    return (
        <WorkspaceDetail
            onBack={() => setSelectedId(null)}
            backLabel="All responses"
            title={`${selected.metricCode} · ${selected.metricTitle}`}
            subtitle={`${selected.currentStageLabel} · ${selected.contributorName || "Contributor not mapped"}`}
            status={selected.status}
            message={message}
            rail={rail}
            railTitle="Response details"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Workflow decision</CardTitle>
                    <CardDescription>
                        {canAct
                            ? "Remarks are recorded on the response timeline and are visible to the contributor."
                            : "This response is read-only in your current governance scope."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {canAct ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor={remarksId}>Review remarks</Label>
                                <Textarea
                                    id={remarksId}
                                    rows={3}
                                    value={remarks[selected._id] ?? ""}
                                    onChange={(event) =>
                                        setRemarks((current) => ({
                                            ...current,
                                            [selected._id]: event.target.value,
                                        }))
                                    }
                                    placeholder="Explain the decision for the next reviewer or the contributor."
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selected.availableDecisions.map((decision) => (
                                    <Button
                                        key={decision}
                                        type="button"
                                        size="sm"
                                        variant={decision === "Reject" ? "outline" : "default"}
                                        loading={pendingDecision === decision}
                                        disabled={pendingDecision !== null}
                                        onClick={() => void submitDecision(selected, decision)}
                                    >
                                        {decision}
                                    </Button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <InlineAlert tone="info" icon={ShieldOff}>
                            The current stage — {selected.currentStageLabel} — is not assigned to your account.
                        </InlineAlert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Submitted response</CardTitle>
                    <CardDescription>{selected.valueSummary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SsrSubmittedValues
                        numeric={selected.metricValueNumeric}
                        text={selected.metricValueText}
                        boolean={selected.metricValueBoolean}
                        date={selected.metricValueDate}
                        tableData={selected.tableData}
                        unitLabel={selected.unitLabel}
                    />

                    {selected.narrativeResponse ? (
                        <SsrProse title="Narrative response" body={selected.narrativeResponse} />
                    ) : null}
                    {selected.contributorRemarks ? (
                        <SsrProse title="Contributor remarks" body={selected.contributorRemarks} />
                    ) : null}
                    {selected.reviewRemarks ? (
                        <SsrProse title="Previous review remarks" body={selected.reviewRemarks} />
                    ) : null}
                </CardContent>
            </Card>

            <SsrEvidence links={selected.supportingLinks} documents={selected.documents} />

            <section className="space-y-3">
                <SectionHeader
                    title="Metric guidance"
                    description="What the contributor was asked to provide."
                />
                {selected.metricDescription ? (
                    <SsrProse title="Metric description" body={selected.metricDescription} />
                ) : null}
                {selected.metricInstructions ? (
                    <SsrProse title="Instructions" body={selected.metricInstructions} />
                ) : null}
                {selected.sectionPrompt ? (
                    <SsrProse
                        title="Narrative prompt"
                        body={selected.sectionPrompt}
                        helper={
                            selected.wordLimitMin || selected.wordLimitMax
                                ? `Word limit: ${selected.wordLimitMin ?? 0} to ${selected.wordLimitMax ?? "unbounded"}`
                                : selected.sectionGuidance
                        }
                    />
                ) : null}
                {selected.assignmentNotes ? (
                    <SsrProse title="Assignment notes" body={selected.assignmentNotes} />
                ) : null}
                {selected.benchmarkValue ? (
                    <SsrProse title="Benchmark" body={selected.benchmarkValue} />
                ) : null}
            </section>
        </WorkspaceDetail>
    );
}
