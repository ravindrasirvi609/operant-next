"use client";

import * as React from "react";
import { ChevronDown, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useFieldArray, useFormContext, type FieldValues } from "react-hook-form";

import {
    DescriptorFields,
    descriptorPaths,
    type FieldDescriptor,
} from "@/components/forms/field-descriptor";
import { FieldGrid } from "@/components/forms/rhf-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/page-header";
import { hasErrorAtPath } from "@/lib/forms/has-errors-for-paths";
import { cn } from "@/lib/utils";

/**
 * The declarative field-array editor.
 *
 * This one component replaces fifteen hand-written repeating editors — twelve in
 * aqar-dashboard.tsx and three in the CAS steps. Each of those was the same
 * five-part shape (heading, entry loop, per-entry delete, empty state, add
 * button) and each duplicated its "new empty entry" object literal **twice**:
 * once for the empty-state button and once for the footer button. See
 * aqar-dashboard.tsx:1197 and :1218 for the same eleven-key literal written out
 * back to back. Nothing kept the two copies in sync.
 *
 * Here `config.emptyItem()` is the single source of truth, and
 * lib/aqar/form-config.test.ts asserts every one of them parses against its zod
 * schema.
 *
 * The other change is that **entries collapse**. The originals rendered every
 * entry fully expanded; a research-paper entry is eleven fields, so ten papers
 * produced a ~110-input wall with no way to scan it. Collapsed rows show a
 * one-line summary and expand on demand — and an entry with a validation error
 * starts expanded so its message is never hidden behind a closed panel.
 */

export type RepeatableSectionConfig = {
    id: string;
    title: string;
    description: string;
    /** Absolute form path of the array, e.g. "facultyContribution.patents". */
    arrayName: string;
    /** Singular noun for buttons and entry headings, e.g. "Patent". */
    itemLabel: string;
    fields: FieldDescriptor[];
    /** One source of truth for a new entry's shape. */
    emptyItem: () => Record<string, unknown>;
    /** Collapsed-row text. `primary` should be the entry's most identifying field. */
    summary: (item: Record<string, unknown>) => { primary: string; secondary?: string };
};

/** Every field path this section owns — for wizard step error detection. */
export function sectionFieldPaths(config: RepeatableSectionConfig): string[] {
    return [config.arrayName];
}

export function sectionEntryPaths(config: RepeatableSectionConfig, index: number): string[] {
    return descriptorPaths(config.fields, `${config.arrayName}.${index}.`);
}

export function RepeatableSection({
    config,
    disabled = false,
    ownerId,
    className,
}: {
    config: RepeatableSectionConfig;
    disabled?: boolean;
    /** Faculty id, required when the section has any upload field. */
    ownerId?: string;
    className?: string;
}) {
    const form = useFormContext<FieldValues>();
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: config.arrayName,
    });

    const addEntry = React.useCallback(() => {
        append(config.emptyItem());
    }, [append, config]);

    return (
        <section className={cn("space-y-4", className)} aria-labelledby={`${config.id}-heading`}>
            <SectionHeader
                title={config.title}
                description={config.description}
                actions={
                    fields.length ? (
                        <Button type="button" variant="outline" size="sm" onClick={addEntry} disabled={disabled}>
                            <Plus aria-hidden />
                            Add {config.itemLabel}
                        </Button>
                    ) : null
                }
            />

            {fields.length ? (
                <ul className="space-y-3">
                    {fields.map((field, index) => (
                        <EntryRow
                            key={field.id}
                            config={config}
                            index={index}
                            disabled={disabled}
                            ownerId={ownerId}
                            onRemove={() => remove(index)}
                        />
                    ))}
                </ul>
            ) : (
                <EmptyState
                    bordered
                    title={`No ${config.title.toLowerCase()} added`}
                    description={config.description}
                    action={
                        <Button type="button" variant="outline" onClick={addEntry} disabled={disabled}>
                            <Plus aria-hidden />
                            Add first {config.itemLabel.toLowerCase()}
                        </Button>
                    }
                />
            )}
        </section>
    );
}

function EntryRow({
    config,
    index,
    disabled,
    ownerId,
    onRemove,
}: {
    config: RepeatableSectionConfig;
    index: number;
    disabled: boolean;
    ownerId?: string;
    onRemove: () => void;
}) {
    const form = useFormContext<FieldValues>();
    const entryPath = `${config.arrayName}.${index}`;
    const hasError = hasErrorAtPath(form.formState.errors, entryPath);

    // A fresh entry is empty, so there is nothing to summarise — open it. An
    // invalid entry opens too, so its FormMessage is never hidden.
    const [open, setOpen] = React.useState(index === 0 && !config.summary(readEntry(form, entryPath)).primary);

    React.useEffect(() => {
        if (hasError) {
            setOpen(true);
        }
    }, [hasError]);

    // Subscribing to the whole entry keeps the collapsed summary live as the
    // user types, without a watch per field.
    const entry = form.watch(entryPath) as Record<string, unknown> | undefined;
    const { primary, secondary } = config.summary(entry ?? {});

    return (
        <li>
            <Collapsible
                open={open}
                onOpenChange={setOpen}
                className={cn(
                    "rounded-lg border bg-card",
                    hasError && "border-destructive-border"
                )}
            >
                <div className="flex items-start gap-2 p-3 sm:items-center">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:items-center"
                        >
                            <ChevronDown
                                aria-hidden
                                className={cn(
                                    "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform sm:mt-0",
                                    open && "rotate-180"
                                )}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {config.itemLabel} {index + 1}
                                    </span>
                                    {hasError ? (
                                        <Badge
                                            variant="outline"
                                            className="h-auto gap-1 border-destructive-border bg-destructive-muted py-0.5 text-destructive-muted-foreground"
                                        >
                                            <TriangleAlert aria-hidden />
                                            Needs attention
                                        </Badge>
                                    ) : null}
                                </span>
                                <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
                                    {primary || <span className="text-muted-foreground">Not filled in yet</span>}
                                </span>
                                {secondary ? (
                                    <span className="block truncate text-xs text-muted-foreground">{secondary}</span>
                                ) : null}
                            </span>
                        </button>
                    </CollapsibleTrigger>

                    <ConfirmButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={disabled}
                        onConfirm={onRemove}
                        title={`Remove this ${config.itemLabel.toLowerCase()}?`}
                        description={`${config.itemLabel} ${index + 1} will be removed from this submission. This cannot be undone once the draft is saved.`}
                        confirmLabel="Remove"
                        aria-label={`Remove ${config.itemLabel} ${index + 1}`}
                    >
                        <Trash2 className="size-4" aria-hidden />
                    </ConfirmButton>
                </div>

                <CollapsibleContent>
                    <FieldGrid className="border-t p-4">
                        <DescriptorFields
                            fields={config.fields}
                            prefix={`${config.arrayName}.${index}.`}
                            disabled={disabled}
                            ownerId={ownerId}
                        />
                    </FieldGrid>
                </CollapsibleContent>
            </Collapsible>
        </li>
    );
}

function readEntry(form: ReturnType<typeof useFormContext>, path: string): Record<string, unknown> {
    return (form.getValues(path) as Record<string, unknown> | undefined) ?? {};
}
