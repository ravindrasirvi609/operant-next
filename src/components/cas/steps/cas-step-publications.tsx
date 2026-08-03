"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AchievementTable } from "@/components/cas/cas-manual-achievement-section";
import type { CasForm, CasPublicationFieldArray } from "@/components/cas/cas-types";

export function CasStepPublications({
    form,
    canEdit,
    publicationFields,
}: {
    form: CasForm;
    canEdit: boolean;
    publicationFields: CasPublicationFieldArray;
}) {
    return (
        <AchievementTable
            title="Research Publications (Optional Additions)"
            description="Add only missing publications that are not already covered in your PBAS-linked data."
        >
            {publicationFields.fields.map((field, index) => (
                <div className="grid gap-4 rounded-lg border border-border bg-muted/50 p-4 md:grid-cols-2 xl:grid-cols-5" key={field.id}>
                    <Input placeholder="Title" disabled={!canEdit} {...form.register(`manualAchievements.publications.${index}.title`)} />
                    <Input placeholder="Journal" disabled={!canEdit} {...form.register(`manualAchievements.publications.${index}.journal`)} />
                    <Input placeholder="Year" type="number" disabled={!canEdit} {...form.register(`manualAchievements.publications.${index}.year`, { valueAsNumber: true })} />
                    <Input placeholder="ISSN" disabled={!canEdit} {...form.register(`manualAchievements.publications.${index}.issn`)} />
                    <Input placeholder="Indexing" disabled={!canEdit} {...form.register(`manualAchievements.publications.${index}.indexing`)} />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => publicationFields.remove(index)}
                        disabled={!canEdit}
                        aria-label={`Delete publication ${index + 1}`}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="secondary"
                disabled={!canEdit}
                onClick={() => publicationFields.append({ title: "", journal: "", year: new Date().getFullYear(), issn: "", indexing: "" })}
            >
                <Plus aria-hidden />
                Add Extra Publication
            </Button>
        </AchievementTable>
    );
}
