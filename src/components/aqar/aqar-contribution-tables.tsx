"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronDown, Table2 } from "lucide-react";
import { summarizeAqarSections } from "@/lib/aqar/metrics";

/**
 * Read-only roll-up of everything currently in the form.
 *
 * The original `AQARDataTables` hand-built six sections, each with its own
 * `columns: [...]` array and a `rows:` mapper that indexed into the entry by
 * field name — a second, parallel description of the same data the form config
 * already describes, and one that silently disagreed with it (it covered six of
 * the twelve sections, so fellowships, research fellows, and PhD awards never
 * appeared here at all).
 *
 * Driving it from each section's own `summary()` means it covers all twelve and
 * cannot drift from the editors again.
 *
 * It was also rendered above *every* step, so the same tables sat between the
 * stepper and the fields on all seven steps. It belongs on the review step.
 */
export function AqarContributionTables({
    contribution,
}: {
    contribution: Record<string, unknown[]>;
}) {
    const sections = summarizeAqarSections(contribution);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Current AQAR records</CardTitle>
                <CardDescription>
                    Everything this report will submit, grouped by section.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {sections.length ? (
                    sections.map((section) => (
                        <Collapsible key={section.key} defaultOpen className="rounded-lg border bg-muted/30">
                            <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                <ChevronDown
                                    aria-hidden
                                    className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                                />
                                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                                    {section.title}
                                </span>
                                <Badge variant="outline">{section.rows.length}</Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <ol className="divide-y border-t">
                                    {section.rows.map((row, index) => (
                                        <li
                                            key={`${section.key}-${index}`}
                                            className="flex min-w-0 items-baseline gap-3 px-3 py-2"
                                        >
                                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                {index + 1}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm break-words text-foreground">
                                                    {row.primary || `Untitled ${section.itemLabel.toLowerCase()}`}
                                                </span>
                                                {row.secondary ? (
                                                    <span className="block text-xs break-words text-muted-foreground">
                                                        {row.secondary}
                                                    </span>
                                                ) : null}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </CollapsibleContent>
                        </Collapsible>
                    ))
                ) : (
                    <EmptyState
                        bordered
                        icon={Table2}
                        title="No records yet"
                        description="Add contributions on the earlier steps and they will be listed here."
                        className="py-8"
                    />
                )}
            </CardContent>
        </Card>
    );
}
