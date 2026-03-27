"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type CasReviewApplication = {
    _id: string;
    applicationYear: string;
    currentDesignation: string;
    applyingForDesignation: string;
    status: string;
    apiScore: { totalScore: number };
    experienceYears: number;
    facultyName?: string;
    permissions?: {
        canReview: boolean;
        canApprove: boolean;
        canReject: boolean;
        canOverride: boolean;
    };
};

export function CasReviewBoard({
    applications,
    mode,
}: {
    applications: CasReviewApplication[];
    mode: "review" | "approve" | "scoped";
}) {
    const [items, setItems] = useState(applications);
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [activeTab, setActiveTab] = useState<"actionable" | "history" | "all">(
        mode === "scoped" ? "actionable" : "all"
    );
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredItems = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        return items.filter((application) => {
            const canAct = Boolean(application.permissions?.canReview || application.permissions?.canApprove);
            if (activeTab === "actionable" && !canAct) {
                return false;
            }

            if (activeTab === "history" && canAct) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                application.facultyName,
                application.currentDesignation,
                application.applyingForDesignation,
                application.applicationYear,
                application.status,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [activeTab, deferredSearch, items]);

    const actionableCount = items.filter((item) => item.permissions?.canReview || item.permissions?.canApprove).length;
    const historyCount = Math.max(items.length - actionableCount, 0);

    function act(applicationId: string, decision: string) {
        setMessage(null);

        startTransition(async () => {
            const application = items.find((item) => item._id === applicationId);
            const scopedMode =
                application?.permissions?.canApprove ? "approve" : application?.permissions?.canReview ? "review" : null;
            const effectiveMode = mode === "scoped" ? scopedMode : mode;

            if (!effectiveMode) {
                setMessage({ type: "error", text: "You cannot act on this CAS record at the current stage." });
                return;
            }

            const endpoint =
                effectiveMode === "review" ? `/api/cas/${applicationId}/review` : `/api/cas/${applicationId}/approve`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decision,
                    remarks: notes[applicationId] ?? "Reviewed in CAS board.",
                }),
            });

            const data = (await response.json()) as { message?: string; application?: CasReviewApplication };

            if (!response.ok || !data.application) {
                setMessage({ type: "error", text: data.message ?? "Unable to process CAS review." });
                return;
            }

            setItems((current) => current.map((item) => (item._id === applicationId ? data.application! : item)));
            setMessage({ type: "success", text: data.message ?? "CAS workflow updated." });
        });
    }

    return (
        <div className="space-y-6">
            {message ? <FormMessage message={message.text} type={message.type} /> : null}
            <Card>
                <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <CardTitle>CAS record browser</CardTitle>
                        <CardDescription>
                            Separate active approvals from read-only scoped history with quick search and filters.
                        </CardDescription>
                    </div>
                    <div className="w-full max-w-sm">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search faculty, designation, year, or status"
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "actionable" | "history" | "all")}>
                        <TabsList>
                            <TabsTrigger value="actionable">Actionable</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                            <TabsTrigger value="all">All</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{actionableCount} actionable</Badge>
                        <Badge variant="secondary">{historyCount} history</Badge>
                        <Badge variant="secondary">{items.length} total</Badge>
                    </div>
                </CardContent>
            </Card>
            {filteredItems.length ? filteredItems.map((application) => (
                <Card key={application._id}>
                    <CardHeader>
                        <CardTitle>{application.facultyName ?? "Faculty CAS Application"}</CardTitle>
                        <CardDescription>
                            {application.currentDesignation} to {application.applyingForDesignation} | {application.applicationYear} | {application.status}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <Metric label="API Score" value={String(application.apiScore.totalScore)} />
                            <Metric label="Experience" value={`${application.experienceYears} years`} />
                            <Metric label="Current Status" value={application.status} />
                            <Metric label="Application Year" value={application.applicationYear} />
                        </div>
                        <Textarea
                            placeholder={mode === "approve" ? "Add principal approval remarks" : "Add workflow remarks"}
                            value={notes[application._id] ?? ""}
                            onChange={(event) => setNotes((current) => ({ ...current, [application._id]: event.target.value }))}
                        />
                        <div className="flex flex-wrap gap-3">
                            {(mode === "review" || (mode === "scoped" && application.permissions?.canReview)) ? (
                                <>
                                    <Button disabled={isPending} onClick={() => act(application._id, application.status === "Submitted" ? "Forward" : "Recommend")}>
                                        {isPending ? <Spinner /> : null}
                                        {application.status === "Submitted" ? "Move To Under Review" : "Move To Committee Review"}
                                    </Button>
                                    <Button disabled={isPending} variant="secondary" onClick={() => act(application._id, "Reject")}>
                                        Reject
                                    </Button>
                                </>
                            ) : mode === "approve" || (mode === "scoped" && application.permissions?.canApprove) ? (
                                <>
                                    <Button disabled={isPending} onClick={() => act(application._id, "Approve")}>
                                        {isPending ? <Spinner /> : null}
                                        Final Approve
                                    </Button>
                                    <Button disabled={isPending} variant="secondary" onClick={() => act(application._id, "Reject")}>
                                        Final Reject
                                    </Button>
                                </>
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    Read-only in your current governance scope.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )) : (
                <Card>
                    <CardContent className="p-6 text-sm text-zinc-500">
                        {items.length
                            ? "No CAS records matched the current filters."
                            : "No CAS records are available in your current governance scope."}
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
