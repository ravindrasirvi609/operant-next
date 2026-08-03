"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert, type FeedbackMessage } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiFileUpload } from "@/components/ui/file-upload";
import { StatCard } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
import { DetailList } from "@/components/workspace/detail-list";
import { RecordCard } from "@/components/workspace/record-card";
import { RecordGrid, WorkspaceDetail, WorkspaceIndex } from "@/components/workspace/record-workspace";
import { SsrProse } from "@/components/ssr/ssr-response-view";
import { requestJson, toErrorMessage } from "@/lib/http/request-json";
import { toDateInputValue, formatDateLabel, formatTimestamp } from "@/lib/ui/dates";
import type { UploadedDocument } from "@/lib/upload/service";

/**
 * SSR contributor workspace.
 *
 * The original put every assignment's picker, metadata, guidance, and the whole
 * response form on one screen behind an `xl:grid-cols-[340px_minmax(0,1fr)]`
 * split, with a duplicate `<Select>` shown below `xl` to stand in for the list —
 * two separate controls for the same state, kept in sync by hand. The index /
 * detail split removes the duplicate entirely.
 *
 * Two substantive fixes:
 *
 *   - **Document ids were edited as a comma-separated string.** The state held
 *     `documentIds: "a, b, c"` and reconstructed fake `UploadedDocument`s from it
 *     with `{ _id: id, fileName: "Existing document", fileUrl: "" }`, so every
 *     already-uploaded file rendered as an unopenable item literally labelled
 *     "Existing document". It is a real array now.
 *   - **Invalid JSON was reported only on save.** `buildPayload` threw
 *     "Table data must be valid JSON" from inside the submit handler; the field
 *     itself gave no indication. It validates as you type.
 */

type AssignmentRecord = {
    _id: string;
    cycleId: string;
    cycleTitle: string;
    cycleCode: string;
    cycleStatus: string;
    criterionId: string;
    criterionCode: string;
    criterionTitle: string;
    metricId: string;
    metricCode: string;
    metricTitle: string;
    metricDescription?: string;
    metricInstructions?: string;
    metricType?: string;
    dataType?: string;
    ownershipScope?: string;
    evidenceMode?: string;
    unitLabel?: string;
    sectionId?: string;
    sectionTitle?: string;
    sectionPrompt?: string;
    sectionGuidance?: string;
    wordLimitMin?: number;
    wordLimitMax?: number;
    dueDate?: string;
    notes?: string;
    status: string;
    isActive: boolean;
    response: {
        _id: string;
        status: string;
        version: number;
        narrativeResponse?: string;
        metricValueNumeric?: number;
        metricValueText?: string;
        metricValueBoolean?: boolean;
        metricValueDate?: string;
        tableData?: Record<string, unknown>;
        supportingLinks: string[];
        documentIds: string[];
        contributorRemarks?: string;
        reviewRemarks?: string;
        submittedAt?: string;
        reviewedAt?: string;
        approvedAt?: string;
    } | null;
};

type ResponseDraft = {
    narrativeResponse: string;
    metricValueNumeric: string;
    metricValueText: string;
    metricValueBoolean: boolean;
    metricValueDate: string;
    tableData: string;
    supportingLinks: string;
    documentIds: string[];
    contributorRemarks: string;
};

const NUMERIC_TYPES = ["Number", "Percentage", "Currency"];

function toDraft(assignment: AssignmentRecord): ResponseDraft {
    const response = assignment.response;

    return {
        narrativeResponse: response?.narrativeResponse ?? "",
        metricValueNumeric:
            response?.metricValueNumeric !== undefined && response?.metricValueNumeric !== null
                ? String(response.metricValueNumeric)
                : "",
        metricValueText: response?.metricValueText ?? "",
        metricValueBoolean: Boolean(response?.metricValueBoolean),
        metricValueDate: toDateInputValue(response?.metricValueDate),
        tableData: JSON.stringify(response?.tableData ?? {}, null, 2),
        supportingLinks: (response?.supportingLinks ?? []).join("\n"),
        documentIds: response?.documentIds ?? [],
        contributorRemarks: response?.contributorRemarks ?? "",
    };
}

function countWords(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function SsrContributorWorkspace({
    assignments,
    actorLabel,
}: {
    assignments: AssignmentRecord[];
    actorLabel: string;
}) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [message, setMessage] = useState<FeedbackMessage | null>(null);
    const [action, setAction] = useState<"save" | "submit" | null>(null);
    const [draft, setDraft] = useState<ResponseDraft | null>(null);

    const selected = selectedId ? assignments.find((item) => item._id === selectedId) : undefined;

    useEffect(() => {
        setDraft(selected ? toDraft(selected) : null);
        setMessage(null);
    }, [selected]);

    const counts = useMemo(() => {
        const editable = assignments.filter(
            (item) =>
                item.isActive &&
                ["Draft", "Rejected"].includes(item.status) &&
                !["Locked", "Archived"].includes(item.cycleStatus)
        );

        return {
            total: assignments.length,
            open: editable.length,
            submitted: assignments.filter((item) => item.status === "Submitted").length,
            approved: assignments.filter((item) => item.status === "Approved").length,
        };
    }, [assignments]);

    if (!assignments.length) {
        return (
            <EmptyState
                bordered
                icon={ClipboardList}
                title="No SSR assignments yet"
                description={`No SSR metrics or narrative sections are mapped to this ${actorLabel.toLowerCase()} account. Your IQAC coordinator assigns them.`}
            />
        );
    }

    // --- index view ---------------------------------------------------------

    if (!selected || !draft) {
        return (
            <WorkspaceIndex
                message={message}
                listTitle={`${actorLabel} SSR assignments`}
                listDescription="Open an assignment to draft or revise your response."
                overview={
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard label="Assigned" value={counts.total} dense tone="neutral" />
                        <StatCard label="Open to edit" value={counts.open} dense tone="warning" />
                        <StatCard label="Submitted" value={counts.submitted} dense tone="info" />
                        <StatCard label="Approved" value={counts.approved} dense tone="success" />
                    </div>
                }
            >
                <RecordGrid>
                    {assignments.map((assignment) => (
                        <RecordCard
                            key={assignment._id}
                            title={`${assignment.metricCode} · ${assignment.metricTitle}`}
                            subtitle={`${assignment.sectionTitle || "Whole metric"} · ${assignment.criterionCode}`}
                            status={assignment.status}
                            openLabel={`Open ${assignment.metricCode}`}
                            openHint={
                                ["Draft", "Rejected"].includes(assignment.status)
                                    ? "Continue drafting"
                                    : "View response"
                            }
                            onOpen={() => setSelectedId(assignment._id)}
                            meta={[
                                { label: "Due", value: formatDateLabel(assignment.dueDate) },
                                { label: "Type", value: assignment.dataType || "—" },
                            ]}
                        />
                    ))}
                </RecordGrid>
            </WorkspaceIndex>
        );
    }

    // --- detail view --------------------------------------------------------

    const isEditable =
        selected.isActive &&
        ["Draft", "Rejected"].includes(selected.status) &&
        !["Locked", "Archived"].includes(selected.cycleStatus);
    const busy = action !== null;

    // Parsed eagerly so the field can report a syntax error while typing rather
    // than only when the save is attempted.
    const tableDataError = (() => {
        if (!draft.tableData.trim()) return null;
        try {
            JSON.parse(draft.tableData);
            return null;
        } catch (cause) {
            return cause instanceof Error ? cause.message : "This is not valid JSON.";
        }
    })();

    const words = countWords(draft.narrativeResponse);
    const belowMin = selected.wordLimitMin ? words < selected.wordLimitMin : false;
    const aboveMax = selected.wordLimitMax ? words > selected.wordLimitMax : false;

    function patch(next: Partial<ResponseDraft>) {
        setDraft((current) => (current ? { ...current, ...next } : current));
    }

    // Arrow consts rather than `function` declarations: hoisted functions are not
    // covered by the `if (!selected || !draft) return` narrowing above, so TS
    // would treat both as possibly null inside them.
    const buildPayload = () => {
        return {
            narrativeResponse: draft.narrativeResponse || undefined,
            metricValueNumeric:
                draft.metricValueNumeric.trim() !== "" ? Number(draft.metricValueNumeric) : undefined,
            metricValueText: draft.metricValueText || undefined,
            metricValueBoolean: draft.metricValueBoolean,
            metricValueDate: draft.metricValueDate || undefined,
            tableData: draft.tableData.trim()
                ? (JSON.parse(draft.tableData) as Record<string, unknown>)
                : undefined,
            supportingLinks: draft.supportingLinks
                .split(/\n+/)
                .map((value) => value.trim())
                .filter(Boolean),
            documentIds: draft.documentIds,
            contributorRemarks: draft.contributorRemarks || undefined,
        };
    };

    const run = async (kind: "save" | "submit") => {
        if (tableDataError) {
            setMessage({ type: "error", text: "Fix the structured data field before saving." });
            return;
        }

        setMessage(null);
        setAction(kind);

        try {
            // Submit always persists first: the original had a Save button and a
            // Submit button that posted to different endpoints, so submitting
            // without saving silently discarded the current edits.
            await requestJson(`/api/ssr/assignments/${selected._id}/response`, {
                method: "PUT",
                body: buildPayload(),
                fallbackMessage: "Unable to save your response.",
            });

            if (kind === "submit") {
                await requestJson(`/api/ssr/assignments/${selected._id}/submit`, {
                    method: "POST",
                    fallbackMessage: "Unable to submit your response.",
                });
            }

            setMessage({
                type: "success",
                text: kind === "submit" ? "Response submitted for review." : "Draft saved.",
            });
            router.refresh();
        } catch (cause) {
            setMessage({ type: "error", text: toErrorMessage(cause, "Something went wrong.") });
        } finally {
            setAction(null);
        }
    };

    const rail = (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailList
                        columns={1}
                        items={[
                            { label: "Cycle", value: `${selected.cycleCode} · ${selected.cycleTitle}` },
                            { label: "Criterion", value: `${selected.criterionCode} · ${selected.criterionTitle}` },
                            { label: "Section", value: selected.sectionTitle || "Whole metric" },
                            { label: "Response type", value: selected.dataType || selected.metricType },
                            { label: "Unit", value: selected.unitLabel },
                            { label: "Ownership", value: selected.ownershipScope },
                            { label: "Evidence mode", value: selected.evidenceMode },
                            { label: "Due date", value: formatDateLabel(selected.dueDate) },
                            { label: "Last submitted", value: formatTimestamp(selected.response?.submittedAt) },
                        ]}
                    />
                </CardContent>
            </Card>

            {selected.metricDescription ||
            selected.metricInstructions ||
            selected.sectionPrompt ||
            selected.sectionGuidance ||
            selected.notes ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Guidance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {selected.metricDescription ? (
                            <SsrProse title="What this metric covers" body={selected.metricDescription} />
                        ) : null}
                        {selected.metricInstructions ? (
                            <SsrProse title="Instructions" body={selected.metricInstructions} />
                        ) : null}
                        {selected.sectionPrompt ? (
                            <SsrProse title="Prompt" body={selected.sectionPrompt} />
                        ) : null}
                        {selected.sectionGuidance ? (
                            <SsrProse title="Section guidance" body={selected.sectionGuidance} />
                        ) : null}
                        {selected.notes ? (
                            <SsrProse title="Assignment notes" body={selected.notes} />
                        ) : null}
                    </CardContent>
                </Card>
            ) : null}
        </>
    );

    return (
        <WorkspaceDetail
            onBack={() => setSelectedId(null)}
            backLabel="All assignments"
            title={`${selected.metricCode} · ${selected.metricTitle}`}
            subtitle={`${selected.sectionTitle || "Whole metric"} · ${selected.criterionCode}`}
            status={selected.status}
            message={message}
            rail={rail}
            railTitle="Assignment details"
        >
            {!isEditable ? (
                <InlineAlert tone="info" title="This response is read-only">
                    {["Locked", "Archived"].includes(selected.cycleStatus)
                        ? `The ${selected.cycleCode} cycle is ${selected.cycleStatus.toLowerCase()}.`
                        : !selected.isActive
                          ? "This assignment is no longer active."
                          : `It is ${selected.status.toLowerCase()} and cannot be edited until it is returned to you.`}
                </InlineAlert>
            ) : null}

            {selected.response?.reviewRemarks ? (
                <InlineAlert tone="warning" title="Reviewer feedback">
                    {selected.response.reviewRemarks}
                </InlineAlert>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Your response</CardTitle>
                    <CardDescription>
                        Save as often as you like. Submitting starts the governed SSR review workflow.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {selected.dataType === "Narrative" ? (
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <Label htmlFor="ssr-narrative">Narrative response</Label>
                                <span
                                    className={
                                        belowMin || aboveMax
                                            ? "text-xs font-medium text-warning-muted-foreground"
                                            : "text-xs text-muted-foreground"
                                    }
                                >
                                    {words} word{words === 1 ? "" : "s"}
                                    {selected.wordLimitMin || selected.wordLimitMax
                                        ? ` (${selected.wordLimitMin ?? 0}–${selected.wordLimitMax ?? "∞"})`
                                        : ""}
                                </span>
                            </div>
                            <Textarea
                                id="ssr-narrative"
                                rows={14}
                                disabled={!isEditable || busy}
                                value={draft.narrativeResponse}
                                onChange={(event) => patch({ narrativeResponse: event.target.value })}
                            />
                        </div>
                    ) : null}

                    {NUMERIC_TYPES.includes(selected.dataType ?? "") ? (
                        <div className="space-y-2">
                            <Label htmlFor="ssr-numeric">
                                Value{selected.unitLabel ? ` (${selected.unitLabel})` : ""}
                            </Label>
                            <Input
                                id="ssr-numeric"
                                type="number"
                                inputMode="decimal"
                                disabled={!isEditable || busy}
                                value={draft.metricValueNumeric}
                                onChange={(event) => patch({ metricValueNumeric: event.target.value })}
                            />
                        </div>
                    ) : null}

                    {selected.dataType === "Text" ? (
                        <div className="space-y-2">
                            <Label htmlFor="ssr-text">Text value</Label>
                            <Input
                                id="ssr-text"
                                disabled={!isEditable || busy}
                                value={draft.metricValueText}
                                onChange={(event) => patch({ metricValueText: event.target.value })}
                            />
                        </div>
                    ) : null}

                    {selected.dataType === "Boolean" ? (
                        <div className="flex items-start gap-3 rounded-lg border p-3">
                            <Checkbox
                                id="ssr-boolean"
                                checked={draft.metricValueBoolean}
                                disabled={!isEditable || busy}
                                onCheckedChange={(checked) => patch({ metricValueBoolean: checked === true })}
                            />
                            <Label htmlFor="ssr-boolean" className="leading-snug font-normal">
                                Yes / completed / applicable
                            </Label>
                        </div>
                    ) : null}

                    {selected.dataType === "Date" ? (
                        <div className="space-y-2">
                            <Label htmlFor="ssr-date">Date value</Label>
                            <Input
                                id="ssr-date"
                                type="date"
                                disabled={!isEditable || busy}
                                value={draft.metricValueDate}
                                onChange={(event) => patch({ metricValueDate: event.target.value })}
                            />
                        </div>
                    ) : null}

                    {selected.dataType === "Json" ? (
                        <div className="space-y-2">
                            <Label htmlFor="ssr-table">Structured data (JSON)</Label>
                            <Textarea
                                id="ssr-table"
                                rows={10}
                                className="font-mono text-xs"
                                aria-invalid={Boolean(tableDataError)}
                                aria-describedby={tableDataError ? "ssr-table-error" : undefined}
                                disabled={!isEditable || busy}
                                value={draft.tableData}
                                onChange={(event) => patch({ tableData: event.target.value })}
                            />
                            {tableDataError ? (
                                <p id="ssr-table-error" className="text-sm font-medium text-destructive">
                                    {tableDataError}
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <Label htmlFor="ssr-links">Supporting links</Label>
                        <Textarea
                            id="ssr-links"
                            rows={4}
                            placeholder="One URL per line"
                            disabled={!isEditable || busy}
                            value={draft.supportingLinks}
                            onChange={(event) => patch({ supportingLinks: event.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Supporting documents</Label>
                        <MultiFileUpload
                            category="document"
                            ownerId={selected._id}
                            disabled={!isEditable || busy}
                            value={draft.documentIds.map(
                                (id) => ({ _id: id, fileName: "Uploaded document", fileUrl: "" }) as UploadedDocument
                            )}
                            onChange={(docs) => patch({ documentIds: docs.map((doc) => doc._id) })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ssr-remarks">Notes for the reviewer</Label>
                        <Textarea
                            id="ssr-remarks"
                            rows={3}
                            disabled={!isEditable || busy}
                            value={draft.contributorRemarks}
                            onChange={(event) => patch({ contributorRemarks: event.target.value })}
                        />
                    </div>
                </CardContent>
            </Card>

            {isEditable ? (
                <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={action === "save"}
                        disabled={busy || Boolean(tableDataError)}
                        onClick={() => void run("save")}
                    >
                        <Save aria-hidden />
                        Save draft
                    </Button>
                    <div className="ml-auto">
                        <Button
                            type="button"
                            size="sm"
                            loading={action === "submit"}
                            disabled={busy || Boolean(tableDataError)}
                            onClick={() => void run("submit")}
                        >
                            <Send aria-hidden />
                            Save and submit
                        </Button>
                    </div>
                </div>
            ) : null}
        </WorkspaceDetail>
    );
}
