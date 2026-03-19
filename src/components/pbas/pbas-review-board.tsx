"use client";

import { useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type PbasReviewApplication = {
    _id: string;
    academicYear: string;
    currentDesignation: string;
    status: string;
    apiScore: { totalScore: number };
    facultyName?: string;
};

type IndicatorEntry = {
    indicatorId: string;
    indicatorCode: string;
    indicatorName: string;
    category?: { id?: string; code?: string; name?: string; maxScore?: number };
    maxScore: number;
    claimedScore: number;
    approvedScore?: number;
    remarks?: string;
};

export function PbasReviewBoard({
    applications,
    mode,
}: {
    applications: PbasReviewApplication[];
    mode: "review" | "approve";
}) {
    const [items, setItems] = useState(applications);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [entryMessage, setEntryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);
    const [entriesByApplication, setEntriesByApplication] = useState<Record<string, IndicatorEntry[]>>({});
    const [isEntryLoading, setIsEntryLoading] = useState<Record<string, boolean>>({});
    const [isEntrySaving, setIsEntrySaving] = useState<Record<string, boolean>>({});
    const [isPending, startTransition] = useTransition();

    function act(applicationId: string, decision: string) {
        setMessage(null);

        startTransition(async () => {
            const endpoint = mode === "review" ? `/api/pbas/${applicationId}/review` : `/api/pbas/${applicationId}/approve`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decision,
                    remarks: notes[applicationId] ?? "Reviewed in PBAS board.",
                }),
            });

            const data = (await response.json()) as { message?: string; application?: PbasReviewApplication };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to process PBAS review." });
                return;
            }

            setItems((current) => current.map((item) => (item._id === applicationId ? data.application! : item)));
            setMessage({ type: "success", text: data.message ?? "PBAS workflow updated." });
        });
    }

    function updateEntryValue(applicationId: string, indicatorId: string, value: number) {
        setEntriesByApplication((current) => ({
            ...current,
            [applicationId]: (current[applicationId] ?? []).map((entry) =>
                entry.indicatorId === indicatorId
                    ? { ...entry, approvedScore: Number.isFinite(value) ? value : 0 }
                    : entry
            ),
        }));
    }

    function loadEntries(applicationId: string) {
        setEntryMessage(null);
        setIsEntryLoading((current) => ({ ...current, [applicationId]: true }));

        fetch(`/api/pbas/${applicationId}/entries`)
            .then((response) => response.json())
            .then((data) => {
                const items = (data?.entries?.items as IndicatorEntry[] | undefined) ?? [];
                setEntriesByApplication((current) => ({ ...current, [applicationId]: items }));
            })
            .catch(() => {
                setEntryMessage({ type: "error", text: "Unable to load PBAS indicator entries." });
            })
            .finally(() => {
                setIsEntryLoading((current) => ({ ...current, [applicationId]: false }));
            });
    }

    function toggleIndicatorPanel(applicationId: string) {
        const next = activeApplicationId === applicationId ? null : applicationId;
        setActiveApplicationId(next);

        if (next && !entriesByApplication[applicationId]) {
            loadEntries(applicationId);
        }
    }

    function saveApprovedScores(applicationId: string) {
        const entries = entriesByApplication[applicationId] ?? [];
        if (!entries.length) {
            setEntryMessage({ type: "error", text: "No indicator rows available to save." });
            return;
        }

        setEntryMessage(null);
        setIsEntrySaving((current) => ({ ...current, [applicationId]: true }));

        fetch(`/api/pbas/${applicationId}/entries/moderate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                updates: entries.map((entry) => ({
                    indicatorId: entry.indicatorId,
                    approvedScore: entry.approvedScore ?? entry.claimedScore,
                    remarks: entry.remarks,
                })),
            }),
        })
            .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                if (!ok || !data?.entries?.items) {
                    throw new Error(data?.message ?? "Unable to save approved scores.");
                }

                setEntriesByApplication((current) => ({
                    ...current,
                    [applicationId]: data.entries.items as IndicatorEntry[],
                }));
                setEntryMessage({ type: "success", text: data.message ?? "Approved scores updated." });
            })
            .catch((error) => {
                setEntryMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to save approved scores.",
                });
            })
            .finally(() => {
                setIsEntrySaving((current) => ({ ...current, [applicationId]: false }));
            });
    }

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}
            {entryMessage ? <FormMessage message={entryMessage.text} type={entryMessage.type} /> : null}
            {items.length ? (
                items.map((application) => (
                    <Card key={application._id}>
                        <CardHeader>
                            <CardTitle>{application.facultyName ?? "Faculty PBAS Application"}</CardTitle>
                            <CardDescription>
                                {application.currentDesignation} | {application.academicYear} | {application.status}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <Metric label="API Score" value={String(application.apiScore.totalScore)} />
                                <Metric label="Academic Year" value={application.academicYear} />
                                <Metric label="Status" value={application.status} />
                            </div>
                            <Textarea
                                placeholder={mode === "review" ? "Add department head or committee remarks" : "Add final admin approval remarks"}
                                value={notes[application._id] ?? ""}
                                onChange={(event) => setNotes((current) => ({ ...current, [application._id]: event.target.value }))}
                            />
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => toggleIndicatorPanel(application._id)}
                                >
                                    {activeApplicationId === application._id ? "Hide Indicator Scores" : "Manage Indicator Scores"}
                                </Button>
                                {mode === "review" ? (
                                    <>
                                        <Button
                                            disabled={isPending}
                                            onClick={() => act(application._id, application.status === "Submitted" ? "Forward" : "Recommend")}
                                        >
                                            {isPending ? <Spinner /> : null}
                                            {application.status === "Submitted" ? "Move To Under Review" : "Move To Committee Review"}
                                        </Button>
                                        <Button disabled={isPending} variant="secondary" onClick={() => act(application._id, "Reject")}>
                                            Reject
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button disabled={isPending} onClick={() => act(application._id, "Approve")}>
                                            {isPending ? <Spinner /> : null}
                                            Final Approve
                                        </Button>
                                        <Button disabled={isPending} variant="secondary" onClick={() => act(application._id, "Reject")}>
                                            Final Reject
                                        </Button>
                                    </>
                                )}
                            </div>

                            {activeApplicationId === application._id ? (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    {isEntryLoading[application._id] ? (
                                        <p className="text-sm text-zinc-500">Loading indicator entries...</p>
                                    ) : (entriesByApplication[application._id] ?? []).length ? (
                                        <>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full border-collapse text-sm">
                                                    <thead>
                                                        <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                                                            <th className="px-2 py-2">Indicator</th>
                                                            <th className="px-2 py-2 text-right">Claimed</th>
                                                            <th className="px-2 py-2 text-right">Approved</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(entriesByApplication[application._id] ?? []).map((entry) => (
                                                            <tr key={entry.indicatorId} className="border-b border-zinc-200">
                                                                <td className="px-2 py-2 align-top">
                                                                    <p className="font-medium text-zinc-900">{entry.indicatorName}</p>
                                                                    <p className="text-xs text-zinc-500">{entry.indicatorCode} • Max {entry.maxScore}</p>
                                                                </td>
                                                                <td className="px-2 py-2 text-right align-top text-zinc-700">{entry.claimedScore}</td>
                                                                <td className="px-2 py-2 text-right align-top">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={entry.maxScore}
                                                                        step="0.1"
                                                                        value={entry.approvedScore ?? entry.claimedScore}
                                                                        onChange={(event) =>
                                                                            updateEntryValue(
                                                                                application._id,
                                                                                entry.indicatorId,
                                                                                Number(event.target.value)
                                                                            )
                                                                        }
                                                                        className="w-24 rounded border border-zinc-300 bg-white px-2 py-1 text-right"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-3 flex justify-end">
                                                <Button
                                                    type="button"
                                                    onClick={() => saveApprovedScores(application._id)}
                                                    disabled={Boolean(isEntrySaving[application._id])}
                                                >
                                                    {isEntrySaving[application._id] ? <Spinner /> : null}
                                                    Save Approved Scores
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-zinc-500">No indicator entries available for this PBAS form.</p>
                                    )}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card>
                    <CardContent className="p-6 text-sm text-zinc-500">
                        No PBAS applications are waiting in this review queue.
                    </CardContent>
                </Card>
            )}
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
