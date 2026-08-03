"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { casSections } from "@/lib/cas/form-config";
import type { CasAchievementBucket } from "@/components/cas/cas-types";

/**
 * Read-only achievement list, used for both the PBAS-linked bucket and the
 * manually added one.
 *
 * `cas-linked-achievements-table.tsx` (126 lines) and
 * `cas-manual-achievements-readonly.tsx` (127 lines) were the same component
 * twice: three `AccordionItem`s each wrapping a `<Table>`, with the column
 * headers, the cell accessors, and the `|| "-"` fallbacks written out by hand in
 * both files. The only differences were the heading, the empty-state wording, and
 * whether the conference count was shown.
 *
 * Columns now come from `casSections[key].fields`, so this list and the editable
 * `RepeatableSection` for the same data can no longer disagree about what a
 * publication has on it. The tables themselves are gone — five columns of
 * free-text inside an accordion inside a card could not fit any viewport, and the
 * `<Table>` had no responsive behaviour, so it scrolled sideways on every screen
 * narrower than about 1100px.
 */

type BucketKey = "publications" | "books" | "researchProjects";

const BUCKET_ORDER: BucketKey[] = ["publications", "books", "researchProjects"];

export function CasAchievementsList({
    achievements,
    title,
    description,
    showConferenceCount = false,
    emptyNoun,
}: {
    achievements: CasAchievementBucket;
    title: string;
    description: string;
    showConferenceCount?: boolean;
    /** e.g. "linked" or "manually added", used in the per-section empty text. */
    emptyNoun: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {BUCKET_ORDER.map((key) => {
                    const config = casSections[key];
                    const rows = achievements[key] as Array<Record<string, unknown>>;

                    return (
                        <Collapsible key={key} className="rounded-lg border bg-muted/30">
                            <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                <ChevronDown
                                    aria-hidden
                                    className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                                />
                                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                                    {config.title.replace(/^Additional /, "")}
                                </span>
                                <Badge variant="outline">{rows.length}</Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                {rows.length ? (
                                    <ul className="divide-y border-t">
                                        {rows.map((row, index) => (
                                            <li key={`${key}-${index}`} className="space-y-1 px-3 py-2.5">
                                                <p className="text-sm font-medium break-words text-foreground">
                                                    {config.summary(row).primary || `Untitled ${config.itemLabel.toLowerCase()}`}
                                                </p>
                                                <dl className="flex flex-wrap gap-x-4 gap-y-1">
                                                    {config.fields
                                                        // The first field is the title, already the heading above.
                                                        .slice(1)
                                                        .map((field) => {
                                                            const value = row[field.name];
                                                            if (value === undefined || value === null || value === "") {
                                                                return null;
                                                            }

                                                            return (
                                                                <div key={field.name} className="flex gap-1.5 text-xs">
                                                                    <dt className="text-muted-foreground">
                                                                        {field.label}:
                                                                    </dt>
                                                                    <dd className="text-foreground">{String(value)}</dd>
                                                                </div>
                                                            );
                                                        })}
                                                </dl>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="border-t px-3 py-3 text-sm text-muted-foreground">
                                        No {emptyNoun} {config.itemLabel.toLowerCase()}s.
                                    </p>
                                )}
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })}

                {showConferenceCount ? (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
                        <span className="text-sm font-medium text-foreground">Conferences</span>
                        <Badge variant="outline">{achievements.conferences}</Badge>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
