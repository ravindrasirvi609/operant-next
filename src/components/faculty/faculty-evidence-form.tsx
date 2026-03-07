"use client";

import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { facultyEvidenceSchema } from "@/lib/faculty-evidence/validators";

type EvidenceValues = z.input<typeof facultyEvidenceSchema>;
type EvidenceResolvedValues = z.output<typeof facultyEvidenceSchema>;

export function FacultyEvidenceForm({
    initialEvidence,
}: {
    initialEvidence: EvidenceResolvedValues;
}) {
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const form = useForm<EvidenceValues, unknown, EvidenceResolvedValues>({
        resolver: zodResolver(facultyEvidenceSchema),
        defaultValues: initialEvidence,
    });

    const publications = useFieldArray({ control: form.control, name: "publications" });
    const books = useFieldArray({ control: form.control, name: "books" });
    const projects = useFieldArray({ control: form.control, name: "projects" });
    const patents = useFieldArray({ control: form.control, name: "patents" });
    const conferences = useFieldArray({ control: form.control, name: "conferences" });
    const workshops = useFieldArray({ control: form.control, name: "workshops" });
    const extensions = useFieldArray({ control: form.control, name: "extensionActivities" });
    const collaborations = useFieldArray({ control: form.control, name: "collaborations" });

    function submit(values: EvidenceResolvedValues) {
        setMessage(null);
        startTransition(async () => {
            const response = await fetch("/api/faculty/evidence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = (await response.json()) as { message?: string };
            if (!response.ok) {
                setMessage({ type: "error", text: data.message ?? "Unable to save shared evidence." });
                return;
            }
            setMessage({ type: "success", text: data.message ?? "Shared evidence saved." });
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Shared Faculty Academic Evidence</CardTitle>
                    <CardDescription>
                        This is the common evidence layer used to prefill CAS, PBAS, and AQAR so publications, projects, conferences, and related records are maintained once.
                    </CardDescription>
                </CardHeader>
            </Card>

            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
                <Section title="Publications" fields={publications.fields.length}>
                    {publications.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Title" {...form.register(`publications.${index}.title`)} />
                            <Input placeholder="Journal" {...form.register(`publications.${index}.journal`)} />
                            <Input type="number" placeholder="Year" {...form.register(`publications.${index}.year`, { valueAsNumber: true })} />
                            <Input placeholder="ISSN" {...form.register(`publications.${index}.issn`)} />
                            <Input placeholder="Indexing" {...form.register(`publications.${index}.indexing`)} />
                            <Button type="button" variant="secondary" onClick={() => publications.remove(index)}>Remove</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => publications.append({ title: "", journal: "", year: new Date().getFullYear(), issn: "", indexing: "" })}>Add Publication</Button>
                </Section>

                <Section title="Books" fields={books.fields.length}>
                    {books.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Title" {...form.register(`books.${index}.title`)} />
                            <Input placeholder="Publisher" {...form.register(`books.${index}.publisher`)} />
                            <Input placeholder="ISBN" {...form.register(`books.${index}.isbn`)} />
                            <Input type="number" placeholder="Year" {...form.register(`books.${index}.year`, { valueAsNumber: true })} />
                            <Button type="button" variant="secondary" onClick={() => books.remove(index)}>Remove</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => books.append({ title: "", publisher: "", isbn: "", year: new Date().getFullYear() })}>Add Book</Button>
                </Section>

                <Section title="Projects" fields={projects.fields.length}>
                    {projects.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Title" {...form.register(`projects.${index}.title`)} />
                            <Input placeholder="Funding Agency" {...form.register(`projects.${index}.fundingAgency`)} />
                            <Input type="number" placeholder="Amount" {...form.register(`projects.${index}.amount`, { valueAsNumber: true })} />
                            <Input type="number" placeholder="Year" {...form.register(`projects.${index}.year`, { valueAsNumber: true })} />
                            <Button type="button" variant="secondary" onClick={() => projects.remove(index)}>Remove</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => projects.append({ title: "", fundingAgency: "", amount: 0, year: new Date().getFullYear() })}>Add Project</Button>
                </Section>

                <Section title="Patents and Conferences" fields={patents.fields.length + conferences.fields.length}>
                    {patents.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Patent Title" {...form.register(`patents.${index}.title`)} />
                            <Input type="number" placeholder="Year" {...form.register(`patents.${index}.year`, { valueAsNumber: true })} />
                            <Input placeholder="Status" {...form.register(`patents.${index}.status`)} />
                            <Button type="button" variant="secondary" onClick={() => patents.remove(index)}>Remove Patent</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => patents.append({ title: "", year: new Date().getFullYear(), status: "" })}>Add Patent</Button>
                    {conferences.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Conference Title" {...form.register(`conferences.${index}.title`)} />
                            <Input placeholder="Organizer" {...form.register(`conferences.${index}.organizer`)} />
                            <Input type="number" placeholder="Year" {...form.register(`conferences.${index}.year`, { valueAsNumber: true })} />
                            <Input placeholder="Type" {...form.register(`conferences.${index}.type`)} />
                            <Button type="button" variant="secondary" onClick={() => conferences.remove(index)}>Remove Conference</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => conferences.append({ title: "", organizer: "", year: new Date().getFullYear(), type: "" })}>Add Conference</Button>
                </Section>

                <Section title="Workshops, Extension, Collaborations" fields={workshops.fields.length + extensions.fields.length + collaborations.fields.length}>
                    {workshops.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Workshop Title" {...form.register(`workshops.${index}.title`)} />
                            <Input placeholder="Role" {...form.register(`workshops.${index}.role`)} />
                            <Input placeholder="Level" {...form.register(`workshops.${index}.level`)} />
                            <Input type="number" placeholder="Year" {...form.register(`workshops.${index}.year`, { valueAsNumber: true })} />
                            <Button type="button" variant="secondary" onClick={() => workshops.remove(index)}>Remove Workshop</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => workshops.append({ title: "", role: "", level: "", year: new Date().getFullYear() })}>Add Workshop</Button>
                    {extensions.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Extension Activity" {...form.register(`extensionActivities.${index}.title`)} />
                            <Input placeholder="Role / Audience" {...form.register(`extensionActivities.${index}.roleOrAudience`)} />
                            <Input type="number" placeholder="Year" {...form.register(`extensionActivities.${index}.year`, { valueAsNumber: true })} />
                            <Button type="button" variant="secondary" onClick={() => extensions.remove(index)}>Remove Extension</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => extensions.append({ title: "", roleOrAudience: "", year: new Date().getFullYear() })}>Add Extension Activity</Button>
                    {collaborations.fields.map((field, index) => (
                        <Row key={field.id}>
                            <Input placeholder="Organization" {...form.register(`collaborations.${index}.organization`)} />
                            <Input placeholder="Purpose" {...form.register(`collaborations.${index}.purpose`)} />
                            <Input type="number" placeholder="Year" {...form.register(`collaborations.${index}.year`, { valueAsNumber: true })} />
                            <Button type="button" variant="secondary" onClick={() => collaborations.remove(index)}>Remove Collaboration</Button>
                        </Row>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => collaborations.append({ organization: "", purpose: "", year: new Date().getFullYear() })}>Add Collaboration</Button>
                </Section>

                <Button type="submit" size="lg" disabled={isPending}>
                    {isPending ? <Spinner /> : null}
                    Save Shared Evidence
                </Button>
            </form>
        </div>
    );
}

function Section({ title, fields, children }: { title: string; fields: number; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{fields} evidence records in this section.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">{children}</CardContent>
        </Card>
    );
}

function Row({ children }: { children: React.ReactNode }) {
    return <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-5">{children}</div>;
}
