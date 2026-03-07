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

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}
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
