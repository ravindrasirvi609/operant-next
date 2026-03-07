"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { facultyRecordSchema } from "@/lib/faculty/validators";

type FacultyWorkspaceValues = z.input<typeof facultyRecordSchema>;
type FacultyWorkspaceResolvedValues = z.output<typeof facultyRecordSchema>;

type FacultyUser = {
    name: string;
    email: string;
    designation?: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
};

type ExistingRecord = FacultyWorkspaceResolvedValues & {
    _id?: string;
};

function toCsv(value?: string[]) {
    return value?.join(", ") ?? "";
}

export function FacultyWorkspaceForm({
    user,
    facultyRecord,
}: {
    user: FacultyUser;
    facultyRecord: ExistingRecord;
}) {
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const form = useForm<FacultyWorkspaceValues, unknown, FacultyWorkspaceResolvedValues>({
        resolver: zodResolver(facultyRecordSchema),
        defaultValues: {
            employeeId: facultyRecord.employeeId ?? "",
            joiningDate: facultyRecord.joiningDate ?? "",
            biography: facultyRecord.biography ?? "",
            specialization: facultyRecord.specialization ?? "",
            researchInterests: facultyRecord.researchInterests ?? [],
            professionalMemberships: facultyRecord.professionalMemberships ?? [],
            certifications: facultyRecord.certifications ?? [],
            awards: facultyRecord.awards ?? [],
            coursesTaught: facultyRecord.coursesTaught ?? [],
            administrativeResponsibilities: facultyRecord.administrativeResponsibilities ?? [],
            degrees: facultyRecord.degrees ?? [],
            aqarEntries: facultyRecord.aqarEntries ?? [],
        },
    });

    const degreeFields = useFieldArray({ control: form.control, name: "degrees" });

    function setCsvField(
        field:
            | "researchInterests"
            | "professionalMemberships"
            | "certifications"
            | "awards"
            | "coursesTaught"
            | "administrativeResponsibilities",
        value: string
    ) {
        form.setValue(
            field,
            value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            { shouldValidate: true }
        );
    }

    function submit(values: FacultyWorkspaceResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch("/api/faculty/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = (await response.json()) as { message?: string };

            if (!response.ok) {
                setMessage({ type: "error", text: data.message ?? "Unable to save faculty workspace." });
                return;
            }

            setMessage({ type: "success", text: data.message ?? "Faculty workspace saved." });
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Faculty Profile</CardTitle>
                    <CardDescription>
                        Maintain your full faculty profile from one workspace. CAS, PBAS, and AQAR workflows are managed in their dedicated modules.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Info label="Faculty" value={user.name} />
                    <Info label="Designation" value={user.designation ?? "-"} />
                    <Info label="Department" value={user.department ?? "-"} />
                    <Info label="College" value={user.collegeName ?? "-"} />
                    <Info label="University" value={user.universityName ?? "-"} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>CAS Module</CardTitle>
                    <CardDescription>
                        Career Advancement Scheme applications, eligibility checks, review workflow, and committee-ready submissions are managed in the dedicated CAS workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/faculty/cas">Open CAS Module</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>PBAS Module</CardTitle>
                    <CardDescription>
                        Annual PBAS appraisals, workflow approvals, API scoring, and PBAS PDF downloads are managed in the dedicated PBAS workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/faculty/pbas">Open PBAS Module</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>AQAR Module</CardTitle>
                    <CardDescription>
                        Annual Quality Assurance Report contributions, workflow approvals, and AQAR PDF downloads are managed in the dedicated AQAR workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/faculty/aqar">Open AQAR Module</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Shared Evidence</CardTitle>
                    <CardDescription>
                        Maintain common academic evidence once here. CAS, PBAS, and AQAR drafts now prefill from this shared faculty evidence layer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/faculty/evidence">Open Shared Evidence</Link>
                    </Button>
                </CardContent>
            </Card>

            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <form onSubmit={form.handleSubmit(submit)}>
                <Tabs defaultValue="profile">
                    <TabsList className="grid h-auto grid-cols-1 gap-2 p-2 md:grid-cols-1">
                        <TabsTrigger value="profile">Faculty Profile</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-6 space-y-6">
                        <SectionCard title="Profile Summary" description="Core academic identity and public/internal faculty profile information.">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="Employee ID" id="employeeId" error={form.formState.errors.employeeId?.message}>
                                    <Input id="employeeId" {...form.register("employeeId")} />
                                </Field>
                                <Field label="Joining Date" id="joiningDate" error={form.formState.errors.joiningDate?.message}>
                                    <Input id="joiningDate" type="date" {...form.register("joiningDate")} />
                                </Field>
                                <Field label="Specialization" id="specialization" error={form.formState.errors.specialization?.message}>
                                    <Input id="specialization" {...form.register("specialization")} />
                                </Field>
                            </div>
                            <Field label="Biography" id="biography" error={form.formState.errors.biography?.message}>
                                <Textarea id="biography" {...form.register("biography")} />
                            </Field>
                            <CsvField label="Research Interests" field="researchInterests" initialValue={toCsv(facultyRecord.researchInterests)} onChange={setCsvField} />
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <CsvField label="Courses Taught" field="coursesTaught" initialValue={toCsv(facultyRecord.coursesTaught)} onChange={setCsvField} />
                                <CsvField label="Professional Memberships" field="professionalMemberships" initialValue={toCsv(facultyRecord.professionalMemberships)} onChange={setCsvField} />
                                <CsvField label="Administrative Responsibilities" field="administrativeResponsibilities" initialValue={toCsv(facultyRecord.administrativeResponsibilities)} onChange={setCsvField} />
                                <CsvField label="Certifications" field="certifications" initialValue={toCsv(facultyRecord.certifications)} onChange={setCsvField} />
                                <CsvField label="Awards" field="awards" initialValue={toCsv(facultyRecord.awards)} onChange={setCsvField} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Educational Qualifications" description="Maintain the full academic qualification timeline for your faculty profile.">
                            <div className="grid gap-4">
                                {degreeFields.fields.map((field, index) => (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={field.id}>
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                            <Input placeholder="Level" {...form.register(`degrees.${index}.level`)} />
                                            <Input placeholder="Degree" {...form.register(`degrees.${index}.degree`)} />
                                            <Input placeholder="Subject" {...form.register(`degrees.${index}.subject`)} />
                                            <Input placeholder="Institution" {...form.register(`degrees.${index}.institution`)} />
                                            <Input placeholder="Year" {...form.register(`degrees.${index}.year`)} />
                                        </div>
                                        <div className="mt-3">
                                            <Button type="button" variant="secondary" onClick={() => degreeFields.remove(index)}>
                                                Remove Degree
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => degreeFields.append({ level: "", degree: "", subject: "", institution: "", year: "" })}>
                                    Add Qualification
                                </Button>
                            </div>
                        </SectionCard>
                    </TabsContent>

                </Tabs>

                <div className="mt-6 flex gap-3">
                    <Button type="submit" size="lg" disabled={isPending}>
                        {isPending ? <Spinner /> : null}
                        Save Faculty Workspace
                    </Button>
                </div>
            </form>
        </div>
    );
}

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">{children}</CardContent>
        </Card>
    );
}

function Field({
    label,
    id,
    error,
    children,
}: {
    label: string;
    id: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            <FieldError message={error} />
        </div>
    );
}

function CsvField({
    label,
    field,
    initialValue,
    onChange,
}: {
    label: string;
    field:
        | "researchInterests"
        | "professionalMemberships"
        | "certifications"
        | "awards"
        | "coursesTaught"
        | "administrativeResponsibilities";
    initialValue: string;
    onChange: (
        field:
            | "researchInterests"
            | "professionalMemberships"
            | "certifications"
            | "awards"
            | "coursesTaught"
            | "administrativeResponsibilities",
        value: string
    ) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={field}>{label}</Label>
            <Input id={field} defaultValue={initialValue} onChange={(event) => onChange(field, event.target.value)} />
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
