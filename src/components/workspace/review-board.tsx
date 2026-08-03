"use client";

import * as React from "react";
import { ChevronDown, Search, ShieldOff, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert, type FeedbackMessage } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatTile } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import { cn } from "@/lib/utils";

/**
 * The generic approval queue.
 *
 * `aqar-review-board.tsx` and `cas-review-board.tsx` are both exactly 212 lines
 * and differ in only 154 — every one of which is a record type, an endpoint
 * prefix, or a label string. `pbas-review-board.tsx` is the same component again
 * plus an indicator-moderation panel. The decision logic in particular was
 * duplicated verbatim three times, including the non-obvious
 * `status === "Submitted" ? "Forward" : "Recommend"` split and the
 * scoped-permission fallback.
 *
 * That logic now lives here once, so a change to the workflow contract is one
 * edit rather than three that can drift. Per-module differences are supplied as
 * a config object.
 *
 * Two accessibility fixes: the search input had no label of any kind (a bare
 * placeholder), and status was rendered as plain text inside a pipe-delimited
 * description string, so approved and rejected records were visually identical.
 */

export type ReviewPermissions = {
    canReview?: boolean;
    canApprove?: boolean;
    canReject?: boolean;
    canOverride?: boolean;
};

export type ReviewRecord = {
    _id: string;
    status: string;
    facultyName?: string;
    permissions?: ReviewPermissions;
};

/** `scoped` derives the action from each record's own permissions. */
export type ReviewMode = "review" | "approve" | "scoped";

export type ReviewStat = { label: string; value: React.ReactNode; helper?: string };

export type ReviewBoardConfig<T extends ReviewRecord> = {
    /** Module name used in headings and messages, e.g. "PBAS". */
    noun: string;
    /** Collection base, e.g. "/api/pbas". `/{id}/review` and `/{id}/approve` derive from it. */
    endpointBase: string;
    description: string;
    searchPlaceholder: string;
    /** Fields the free-text search matches against. */
    searchValues: (record: T) => Array<string | number | undefined>;
    cardTitle: (record: T) => string;
    cardSubtitle: (record: T) => string;
    stats: (record: T) => ReviewStat[];
    /** Optional expandable panel — PBAS uses it for indicator moderation. */
    expansion?: {
        label: string;
        render: (record: T) => React.ReactNode;
    };
};

type TabKey = "actionable" | "history" | "all";

function canAct(record: ReviewRecord) {
    return Boolean(record.permissions?.canReview || record.permissions?.canApprove);
}

export function ReviewBoard<T extends ReviewRecord>({
    records,
    mode,
    config,
}: {
    records: T[];
    mode: ReviewMode;
    config: ReviewBoardConfig<T>;
}) {
    const [items, setItems] = React.useState(records);
    const [search, setSearch] = React.useState("");
    const deferredSearch = React.useDeferredValue(search);
    const [activeTab, setActiveTab] = React.useState<TabKey>(mode === "scoped" ? "actionable" : "all");
    const [notes, setNotes] = React.useState<Record<string, string>>({});
    const [message, setMessage] = React.useState<FeedbackMessage | null>(null);
    const [pendingId, setPendingId] = React.useState<string | null>(null);

    const actionableCount = items.filter(canAct).length;
    const historyCount = Math.max(items.length - actionableCount, 0);

    const filtered = React.useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        return items.filter((record) => {
            if (activeTab === "actionable" && !canAct(record)) return false;
            if (activeTab === "history" && canAct(record)) return false;
            if (!query) return true;

            return config
                .searchValues(record)
                .filter((value) => value !== undefined && value !== null && value !== "")
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [activeTab, config, deferredSearch, items]);

    async function act(record: T, decision: string) {
        setMessage(null);

        // In `scoped` mode the viewer's stage authority varies per record, so the
        // endpoint is chosen from that record's permissions rather than a
        // page-level mode. Approve outranks review when both are granted.
        const effectiveMode =
            mode === "scoped"
                ? record.permissions?.canApprove
                    ? "approve"
                    : record.permissions?.canReview
                      ? "review"
                      : null
                : mode;

        if (!effectiveMode) {
            setMessage({
                type: "error",
                text: `You cannot act on this ${config.noun} record at the current stage.`,
            });
            return;
        }

        setPendingId(record._id);

        try {
            const payload = await requestJson<{ message?: string; application?: T }>(
                `${config.endpointBase}/${record._id}/${effectiveMode}`,
                {
                    method: "POST",
                    body: {
                        decision,
                        remarks: notes[record._id]?.trim() || `Reviewed in ${config.noun} board.`,
                    },
                    fallbackMessage: `Unable to process the ${config.noun} decision.`,
                }
            );

            if (!payload.application) {
                setMessage({
                    type: "error",
                    text: payload.message ?? `Unable to process the ${config.noun} decision.`,
                });
                return;
            }

            const updated = payload.application;
            setItems((current) => current.map((item) => (item._id === record._id ? updated : item)));
            setMessage({ type: "success", text: payload.message ?? `${config.noun} workflow updated.` });
        } catch (cause) {
            setMessage({
                type: "error",
                text: toErrorMessage(cause, `Unable to process the ${config.noun} decision.`),
            });
        } finally {
            setPendingId(null);
        }
    }

    return (
        <div className="space-y-6">
            {message ? <InlineAlert message={message} /> : null}

            <Card>
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            <CardTitle>{config.noun} record browser</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
                        </div>
                        <div className="w-full lg:max-w-sm">
                            <Label htmlFor="review-search" className="sr-only">
                                Search {config.noun} records
                            </Label>
                            <div className="relative">
                                <Search
                                    aria-hidden
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    id="review-search"
                                    className="pl-9"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={config.searchPlaceholder}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
                        <TabsList>
                            <TabsTrigger value="actionable">Actionable ({actionableCount})</TabsTrigger>
                            <TabsTrigger value="history">History ({historyCount})</TabsTrigger>
                            <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <p className="text-sm text-muted-foreground">
                        Showing {filtered.length} of {items.length}
                    </p>
                </CardContent>
            </Card>

            {filtered.length ? (
                <div className="space-y-4">
                    {filtered.map((record) => (
                        <ReviewRecordCard
                            key={record._id}
                            record={record}
                            mode={mode}
                            config={config}
                            note={notes[record._id] ?? ""}
                            onNoteChange={(value) =>
                                setNotes((current) => ({ ...current, [record._id]: value }))
                            }
                            isPending={pendingId === record._id}
                            disabled={pendingId !== null}
                            onAct={(decision) => void act(record, decision)}
                        />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <EmptyState
                            icon={items.length ? Search : ShieldOff}
                            title={
                                items.length
                                    ? `No ${config.noun} records match these filters`
                                    : `No ${config.noun} records in your scope`
                            }
                            description={
                                items.length
                                    ? "Try a different search term, or switch to the All tab."
                                    : `${config.noun} records appear here once they reach a stage assigned to your account.`
                            }
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ReviewRecordCard<T extends ReviewRecord>({
    record,
    mode,
    config,
    note,
    onNoteChange,
    isPending,
    disabled,
    onAct,
}: {
    record: T;
    mode: ReviewMode;
    config: ReviewBoardConfig<T>;
    note: string;
    onNoteChange: (value: string) => void;
    isPending: boolean;
    disabled: boolean;
    onAct: (decision: string) => void;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const remarksId = `review-remarks-${record._id}`;

    const showReview = mode === "review" || (mode === "scoped" && record.permissions?.canReview);
    const showApprove = mode === "approve" || (mode === "scoped" && record.permissions?.canApprove);

    // A record still at "Submitted" moves to Under Review; anything further along
    // is being recommended onward to committee. Preserved from the original three
    // boards, which each hardcoded this identically.
    const isFirstHop = record.status === "Submitted";
    const stats = config.stats(record);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="break-words">{config.cardTitle(record)}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{config.cardSubtitle(record)}</p>
                    </div>
                    <StatusBadge status={record.status} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {stats.length ? (
                    <div
                        className={cn(
                            "grid gap-3",
                            stats.length >= 4
                                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        )}
                    >
                        {stats.map((stat) => (
                            <StatTile
                                key={stat.label}
                                label={stat.label}
                                value={stat.value}
                                helper={stat.helper}
                            />
                        ))}
                    </div>
                ) : null}

                {showReview || showApprove ? (
                    <div className="space-y-2">
                        <Label htmlFor={remarksId}>
                            {showApprove && !showReview ? "Approval remarks" : "Workflow remarks"}
                        </Label>
                        <Textarea
                            id={remarksId}
                            rows={3}
                            value={note}
                            onChange={(event) => onNoteChange(event.target.value)}
                            placeholder="Recorded on the record's status timeline for the faculty member to see."
                        />
                    </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                    {config.expansion ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setExpanded((value) => !value)}
                            aria-expanded={expanded}
                        >
                            <ChevronDown
                                aria-hidden
                                className={cn("transition-transform", expanded && "rotate-180")}
                            />
                            {config.expansion.label}
                        </Button>
                    ) : null}

                    {showReview ? (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                loading={isPending}
                                disabled={disabled}
                                onClick={() => onAct(isFirstHop ? "Forward" : "Recommend")}
                            >
                                {isFirstHop ? "Move to Under Review" : "Move to Committee Review"}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                loading={isPending}
                                disabled={disabled}
                                onClick={() => onAct("Reject")}
                            >
                                <X aria-hidden />
                                Reject
                            </Button>
                        </>
                    ) : showApprove ? (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                loading={isPending}
                                disabled={disabled}
                                onClick={() => onAct("Approve")}
                            >
                                Final approve
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                loading={isPending}
                                disabled={disabled}
                                onClick={() => onAct("Reject")}
                            >
                                <X aria-hidden />
                                Final reject
                            </Button>
                        </>
                    ) : (
                        <Badge variant="outline" className="gap-1.5">
                            <ShieldOff aria-hidden />
                            Read-only in your current scope
                        </Badge>
                    )}
                </div>

                {config.expansion ? (
                    <Collapsible open={expanded} onOpenChange={setExpanded}>
                        {/* Trigger lives in the button row above; this only renders the panel. */}
                        <CollapsibleTrigger className="sr-only" aria-hidden tabIndex={-1} />
                        <CollapsibleContent>
                            <div className="rounded-lg border bg-muted/40 p-4">
                                {config.expansion.render(record)}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ) : null}
            </CardContent>
        </Card>
    );
}
