"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AchievementTable } from "@/components/cas/cas-manual-achievement-section";
import type { CasBookFieldArray, CasForm, CasProjectFieldArray } from "@/components/cas/cas-types";

export function CasStepBooksProjects({
    form,
    canEdit,
    bookFields,
    projectFields,
}: {
    form: CasForm;
    canEdit: boolean;
    bookFields: CasBookFieldArray;
    projectFields: CasProjectFieldArray;
}) {
    return (
        <div className="space-y-6">
            <AchievementTable title="Books" description="Record published books and chapters relevant to CAS review.">
                {bookFields.fields.map((field, index) => (
                    <div className="grid gap-4 rounded-lg border border-border bg-muted/50 p-4 md:grid-cols-2 xl:grid-cols-4" key={field.id}>
                        <Input placeholder="Title" disabled={!canEdit} {...form.register(`manualAchievements.books.${index}.title`)} />
                        <Input placeholder="Publisher" disabled={!canEdit} {...form.register(`manualAchievements.books.${index}.publisher`)} />
                        <Input placeholder="ISBN" disabled={!canEdit} {...form.register(`manualAchievements.books.${index}.isbn`)} />
                        <Input placeholder="Year" type="number" disabled={!canEdit} {...form.register(`manualAchievements.books.${index}.year`, { valueAsNumber: true })} />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => bookFields.remove(index)}
                            disabled={!canEdit}
                            aria-label={`Delete book ${index + 1}`}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="secondary"
                    disabled={!canEdit}
                    onClick={() => bookFields.append({ title: "", publisher: "", isbn: "", year: new Date().getFullYear() })}
                >
                    <Plus aria-hidden />
                    Add Extra Book
                </Button>
            </AchievementTable>
            <AchievementTable
                title="Research Projects"
                description="Capture only additional funded projects that are not already represented in PBAS-linked records."
            >
                {projectFields.fields.map((field, index) => (
                    <div className="grid gap-4 rounded-lg border border-border bg-muted/50 p-4 md:grid-cols-2 xl:grid-cols-4" key={field.id}>
                        <Input placeholder="Title" disabled={!canEdit} {...form.register(`manualAchievements.researchProjects.${index}.title`)} />
                        <Input placeholder="Funding Agency" disabled={!canEdit} {...form.register(`manualAchievements.researchProjects.${index}.fundingAgency`)} />
                        <Input placeholder="Amount" type="number" disabled={!canEdit} {...form.register(`manualAchievements.researchProjects.${index}.amount`, { valueAsNumber: true })} />
                        <Input placeholder="Year" type="number" disabled={!canEdit} {...form.register(`manualAchievements.researchProjects.${index}.year`, { valueAsNumber: true })} />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => projectFields.remove(index)}
                            disabled={!canEdit}
                            aria-label={`Delete project ${index + 1}`}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="secondary"
                    disabled={!canEdit}
                    onClick={() => projectFields.append({ title: "", fundingAgency: "", amount: 0, year: new Date().getFullYear() })}
                >
                    <Plus aria-hidden />
                    Add Extra Project
                </Button>
            </AchievementTable>
        </div>
    );
}
