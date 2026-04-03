"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    const data = (await response.json()) as T & { message?: string };
    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

function normalizeDateInput(value?: string) {
    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
}

function toPrettyDateTime(value?: string) {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleString();
}

export function SsrContributorWorkspace({
    assignments,
    actorLabel,
}: {
    assignments: AssignmentRecord[];
    actorLabel: string;
}) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState(assignments[0]?._id ?? "");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState({
        narrativeResponse: "",
        metricValueNumeric: "",
        metricValueText: "",
        metricValueBoolean: false,
        metricValueDate: "",
        tableData: "{}",
        supportingLinks: "",
        documentIds: "",
        contributorRemarks: "",
    });

    const selectedAssignment = useMemo(
        () => assignments.find((item) => item._id === selectedId) ?? assignments[0] ?? null,
        [assignments, selectedId]
    );

    useEffect(() => {
        if (!selectedAssignment) {
            return;
        }

        setForm({
            narrativeResponse: selectedAssignment.response?.narrativeResponse ?? "",
            metricValueNumeric:
                selectedAssignment.response?.metricValueNumeric !== undefined &&
                selectedAssignment.response?.metricValueNumeric !== null
                    ? String(selectedAssignment.response.metricValueNumeric)
                    : "",
            metricValueText: selectedAssignment.response?.metricValueText ?? "",
            metricValueBoolean: Boolean(selectedAssignment.response?.metricValueBoolean),
            metricValueDate: normalizeDateInput(selectedAssignment.response?.metricValueDate),
            tableData: JSON.stringify(selectedAssignment.response?.tableData ?? {}, null, 2),
            supportingLinks: (selectedAssignment.response?.supportingLinks ?? []).join("\n"),
            documentIds: (selectedAssignment.response?.documentIds ?? []).join(", "),
            contributorRemarks: selectedAssignment.response?.contributorRemarks ?? "",
        });
    }, [selectedAssignment]);

    if (!selectedAssignment) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>SSR Workspace</CardTitle>
                    <CardDescription>No SSR assignments are mapped to this account yet.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const isEditable =
        selectedAssignment.isActive &&
        ["Draft", "Rejected"].includes(selectedAssignment.status) &&
        !["Locked", "Archived"].includes(selectedAssignment.cycleStatus);

    function buildPayload() {
        let parsedTableData: Record<string, unknown> | undefined;

        if (form.tableData.trim()) {
            try {
                parsedTableData = JSON.parse(form.tableData) as Record<string, unknown>;
            } catch {
                throw new Error("Table data must be valid JSON.");
            }
        }

        return {
            narrativeResponse: form.narrativeResponse || undefined,
            metricValueNumeric:
                form.metricValueNumeric.trim() !== "" ? Number(form.metricValueNumeric) : undefined,
            metricValueText: form.metricValueText || undefined,
            metricValueBoolean: form.metricValueBoolean,
            metricValueDate: form.metricValueDate || undefined,
            tableData: parsedTableData,
            supportingLinks: form.supportingLinks
                .split(/\n+/)
                .map((value) => value.trim())
                .filter(Boolean),
            documentIds: form.documentIds
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            contributorRemarks: form.contributorRemarks || undefined,
        };
    }

    function saveDraft() {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson(`/api/ssr/assignments/${selectedAssignment._id}/response`, {
                    method: "PUT",
                    body: JSON.stringify(buildPayload()),
                });

                setMessage({ type: "success", text: "SSR draft saved." });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save draft.",
                });
            }
        });
    }

    function submitResponse() {
        setMessage(null);

        startTransition(async () => {
            try {
                await requestJson(`/api/ssr/assignments/${selectedAssignment._id}/submit`, {
                    method: "POST",
                });

                setMessage({ type: "success", text: "SSR response submitted." });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to submit response.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            {message ? (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        message.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                >
                    {message.text}
                </div>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>{actorLabel} SSR Assignments</CardTitle>
                        <CardDescription>
                            Only assigned metrics and sections can be edited from this workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {assignments.map((item) => (
                            <button
                                key={item._id}
                                type="button"
                                onClick={() => setSelectedId(item._id)}
                                className={`w-full rounded-xl border p-4 text-left transition ${
                                    item._id === selectedAssignment._id
                                        ? "border-zinc-950 bg-zinc-950 text-white"
                                        : "border-zinc-200 bg-white hover:border-zinc-300"
                                }`}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={item._id === selectedAssignment._id ? "secondary" : "outline"}>
                                        {item.status}
                                    </Badge>
                                    <Badge variant={item._id === selectedAssignment._id ? "secondary" : "outline"}>
                                        {item.metricCode}
                                    </Badge>
                                </div>
                                <p className="mt-3 font-medium">{item.metricTitle}</p>
                                <p className={`mt-1 text-xs ${item._id === selectedAssignment._id ? "text-white/75" : "text-zinc-500"}`}>
                                    {item.sectionTitle || "Whole metric"} · {item.criterionCode}
                                </p>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge>{selectedAssignment.cycleCode}</Badge>
                                <Badge variant="outline">{selectedAssignment.status}</Badge>
                                <Badge variant="outline">{selectedAssignment.dataType}</Badge>
                                <Badge variant="outline">{selectedAssignment.evidenceMode}</Badge>
                            </div>
                            <CardTitle>{selectedAssignment.metricCode} · {selectedAssignment.metricTitle}</CardTitle>
                            <CardDescription>
                                {selectedAssignment.criterionCode} · {selectedAssignment.criterionTitle}
                                {selectedAssignment.sectionTitle ? ` · ${selectedAssignment.sectionTitle}` : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <InfoRow label="Cycle" value={selectedAssignment.cycleTitle} />
                            <InfoRow label="Ownership" value={selectedAssignment.ownershipScope || "-"} />
                            <InfoRow label="Due Date" value={normalizeDateInput(selectedAssignment.dueDate) || "-"} />
                            <InfoRow label="Unit" value={selectedAssignment.unitLabel || "-"} />
                            <InfoRow label="Last Submitted" value={toPrettyDateTime(selectedAssignment.response?.submittedAt)} />
                            <InfoRow label="Review Feedback" value={selectedAssignment.response?.reviewRemarks || "-"} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Contribution Guidance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm leading-6 text-zinc-600">
                            {selectedAssignment.metricDescription ? (
                                <p>{selectedAssignment.metricDescription}</p>
                            ) : null}
                            {selectedAssignment.metricInstructions ? (
                                <p>{selectedAssignment.metricInstructions}</p>
                            ) : null}
                            {selectedAssignment.sectionPrompt ? (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="font-medium text-zinc-950">Section Prompt</p>
                                    <p className="mt-2">{selectedAssignment.sectionPrompt}</p>
                                </div>
                            ) : null}
                            {selectedAssignment.sectionGuidance ? (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="font-medium text-zinc-950">Section Guidance</p>
                                    <p className="mt-2">{selectedAssignment.sectionGuidance}</p>
                                </div>
                            ) : null}
                            {selectedAssignment.notes ? (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <p className="font-medium text-zinc-950">Assignment Notes</p>
                                    <p className="mt-2">{selectedAssignment.notes}</p>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Response Entry</CardTitle>
                            <CardDescription>
                                Draft safely as needed. Submission starts the governed SSR review workflow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedAssignment.dataType === "Narrative" ? (
                                <FieldBlock label="Narrative Response">
                                    <Textarea
                                        disabled={!isEditable || isPending}
                                        rows={12}
                                        value={form.narrativeResponse}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                narrativeResponse: event.target.value,
                                            }))
                                        }
                                    />
                                    {selectedAssignment.wordLimitMin || selectedAssignment.wordLimitMax ? (
                                        <p className="text-xs text-zinc-500">
                                            Word guidance:
                                            {selectedAssignment.wordLimitMin
                                                ? ` min ${selectedAssignment.wordLimitMin}`
                                                : ""}
                                            {selectedAssignment.wordLimitMax
                                                ? ` max ${selectedAssignment.wordLimitMax}`
                                                : ""}
                                        </p>
                                    ) : null}
                                </FieldBlock>
                            ) : null}

                            {["Number", "Percentage", "Currency"].includes(selectedAssignment.dataType || "") ? (
                                <FieldBlock label={`Metric Value${selectedAssignment.unitLabel ? ` (${selectedAssignment.unitLabel})` : ""}`}>
                                    <Input
                                        disabled={!isEditable || isPending}
                                        type="number"
                                        value={form.metricValueNumeric}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                metricValueNumeric: event.target.value,
                                            }))
                                        }
                                    />
                                </FieldBlock>
                            ) : null}

                            {selectedAssignment.dataType === "Text" ? (
                                <FieldBlock label="Text Value">
                                    <Input
                                        disabled={!isEditable || isPending}
                                        value={form.metricValueText}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                metricValueText: event.target.value,
                                            }))
                                        }
                                    />
                                </FieldBlock>
                            ) : null}

                            {selectedAssignment.dataType === "Boolean" ? (
                                <FieldBlock label="Boolean Value">
                                    <label className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                                        <Checkbox
                                            checked={form.metricValueBoolean}
                                            disabled={!isEditable || isPending}
                                            onCheckedChange={(checked) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    metricValueBoolean: checked === true,
                                                }))
                                            }
                                        />
                                        <span className="text-sm">Yes / Completed / Applicable</span>
                                    </label>
                                </FieldBlock>
                            ) : null}

                            {selectedAssignment.dataType === "Date" ? (
                                <FieldBlock label="Date Value">
                                    <Input
                                        disabled={!isEditable || isPending}
                                        type="date"
                                        value={form.metricValueDate}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                metricValueDate: event.target.value,
                                            }))
                                        }
                                    />
                                </FieldBlock>
                            ) : null}

                            {selectedAssignment.dataType === "Json" ? (
                                <FieldBlock label="Structured Table Data (JSON)">
                                    <Textarea
                                        disabled={!isEditable || isPending}
                                        rows={10}
                                        value={form.tableData}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                tableData: event.target.value,
                                            }))
                                        }
                                    />
                                </FieldBlock>
                            ) : null}

                            <FieldBlock label="Supporting Links">
                                <Textarea
                                    disabled={!isEditable || isPending}
                                    rows={4}
                                    value={form.supportingLinks}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            supportingLinks: event.target.value,
                                        }))
                                    }
                                    placeholder="One URL per line"
                                />
                            </FieldBlock>

                            <FieldBlock label="Document IDs">
                                <Input
                                    disabled={!isEditable || isPending}
                                    value={form.documentIds}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            documentIds: event.target.value,
                                        }))
                                    }
                                    placeholder="Comma separated document ids"
                                />
                            </FieldBlock>

                            <FieldBlock label="Contributor Remarks">
                                <Textarea
                                    disabled={!isEditable || isPending}
                                    rows={4}
                                    value={form.contributorRemarks}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            contributorRemarks: event.target.value,
                                        }))
                                    }
                                />
                            </FieldBlock>

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={!isEditable || isPending} type="button" onClick={saveDraft}>
                                    Save Draft
                                </Button>
                                <Button
                                    disabled={!isEditable || isPending}
                                    type="button"
                                    variant="outline"
                                    onClick={submitResponse}
                                >
                                    Submit Response
                                </Button>
                            </div>

                            {!isEditable ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    This assignment is currently read-only because it is under review, approved, inactive, or the cycle is locked.
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function FieldBlock({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-zinc-950">{value}</p>
        </div>
    );
}
