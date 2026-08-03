"use client";

import { ExternalLink, FileText, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTimestamp } from "@/lib/ui/dates";

/**
 * Read-only rendering of one SSR response: prose, values, links, documents.
 *
 * Extracted from `ssr-review-board.tsx`, where it made up ~330 of the file's 747
 * lines and carried three local components — `MetricCard`, `InfoCard`, and
 * `SectionBlock`. The first two were one-line pass-throughs to `StatCard` and
 * `StatTile` (a name for a name), and `SectionBlock` was the app's fourth
 * prose-block style.
 *
 * The four "Numeric value / Text value / Boolean value / Date value" tiles were
 * rendered unconditionally for every response, so a narrative metric showed four
 * tiles reading "-", "-", "-", "-". Only the populated ones render now.
 */

export type SsrProseBlock = { title: string; body: string; helper?: string };

export function SsrProse({ title, body, helper }: SsrProseBlock) {
    return (
        <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-foreground">{body}</p>
            {helper ? <p className="mt-2 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
    );
}

export type SsrDocument = {
    id: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    uploadedAt?: string | Date;
    verificationStatus?: string;
    verificationRemarks?: string;
};

export function SsrEvidence({
    links,
    documents,
}: {
    links: string[];
    documents: SsrDocument[];
}) {
    return (
        <div className="grid gap-6 2xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Supporting links</CardTitle>
                    <CardDescription>URLs submitted with this response.</CardDescription>
                </CardHeader>
                <CardContent>
                    {links.length ? (
                        <ul className="space-y-2">
                            {links.map((link) => (
                                <li key={link}>
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-foreground hover:border-ring/50 hover:bg-accent/30"
                                    >
                                        <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                                        {/* `break-all` because a bare URL has no
                                            break opportunities and would otherwise
                                            force the whole card to overflow. */}
                                        <span className="min-w-0 break-all">{link}</span>
                                        <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={Link2} title="No supporting links" className="py-6" />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Uploaded documents</CardTitle>
                    <CardDescription>Evidence files and their verification state.</CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length ? (
                        <ul className="space-y-2">
                            {documents.map((document) => (
                                <li key={document.id} className="rounded-lg border bg-muted/40 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium break-words text-foreground">
                                                {document.fileName || "Untitled document"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {[
                                                    document.fileType || "Unknown type",
                                                    `Uploaded ${formatTimestamp(
                                                        document.uploadedAt
                                                            ? String(document.uploadedAt)
                                                            : undefined
                                                    )}`,
                                                ].join(" · ")}
                                            </p>
                                        </div>
                                        <StatusBadge status={document.verificationStatus || "Pending"} />
                                    </div>

                                    {document.verificationRemarks ? (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {document.verificationRemarks}
                                        </p>
                                    ) : null}

                                    {document.fileUrl ? (
                                        <a
                                            href={document.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                                        >
                                            <FileText className="size-3.5" aria-hidden />
                                            Open document
                                        </a>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon={FileText} title="No documents attached" className="py-6" />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Submitted metric values. Only renders the ones that actually carry a value —
 * which is what `dataType` determines, so at most one of the four is meaningful.
 */
export function SsrSubmittedValues({
    numeric,
    text,
    boolean: booleanValue,
    date,
    tableData,
    unitLabel,
}: {
    numeric?: number;
    text?: string;
    boolean?: boolean;
    date?: string | Date;
    tableData?: Record<string, unknown>;
    unitLabel?: string;
}) {
    const values: Array<{ label: string; value: string }> = [];

    if (numeric !== undefined && numeric !== null) {
        values.push({
            label: unitLabel ? `Value (${unitLabel})` : "Numeric value",
            value: String(numeric),
        });
    }
    if (text) {
        values.push({ label: "Text value", value: text });
    }
    if (booleanValue !== undefined) {
        values.push({ label: "Boolean value", value: booleanValue ? "Yes" : "No" });
    }
    if (date) {
        values.push({ label: "Date value", value: formatTimestamp(String(date)) });
    }

    const hasTable = tableData && Object.keys(tableData).length > 0;

    if (!values.length && !hasTable) {
        return null;
    }

    return (
        <div className="space-y-3">
            {values.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {values.map((item) => (
                        <li key={item.label} className="rounded-lg border bg-muted/40 px-3 py-2.5">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {item.label}
                            </p>
                            <p className="mt-1 text-sm font-medium break-words text-foreground">{item.value}</p>
                        </li>
                    ))}
                </ul>
            ) : null}

            {hasTable ? (
                <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Structured data
                        </p>
                        <Badge variant="outline">{Object.keys(tableData!).length} keys</Badge>
                    </div>
                    <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-background p-3 text-xs text-foreground">
                        {JSON.stringify(tableData, null, 2)}
                    </pre>
                </div>
            ) : null}
        </div>
    );
}
