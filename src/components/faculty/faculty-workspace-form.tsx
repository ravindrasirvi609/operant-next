"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { ProfilePhotoUpload } from "@/components/faculty/profile-photo-upload";
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
    id: string;
    name: string;
    email: string;
    photoURL?: string;
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
            employeeCode: facultyRecord.employeeCode ?? "",
            joiningDate: facultyRecord.joiningDate ?? "",
            biography: facultyRecord.biography ?? "",
            specialization: facultyRecord.specialization ?? "",
            highestQualification: facultyRecord.highestQualification ?? "",
            employmentType: facultyRecord.employmentType ?? "Permanent",
            experienceYears: facultyRecord.experienceYears ?? 0,
            researchInterests: facultyRecord.researchInterests ?? [],
            professionalMemberships: facultyRecord.professionalMemberships ?? [],
            certifications: facultyRecord.certifications ?? [],
            administrativeResponsibilities: facultyRecord.administrativeResponsibilities ?? [],
            qualifications: facultyRecord.qualifications ?? [],
            researchProfile: facultyRecord.researchProfile ?? {},
            teachingLoads: facultyRecord.teachingLoads ?? [],
            resultSummaries: facultyRecord.resultSummaries ?? [],
            administrativeRoles: facultyRecord.administrativeRoles ?? [],
            facultyDevelopmentProgrammes: facultyRecord.facultyDevelopmentProgrammes ?? [],
            socialExtensionActivities: facultyRecord.socialExtensionActivities ?? [],
        },
    });

    const qualifications = useFieldArray({ control: form.control, name: "qualifications" });
    const teachingLoads = useFieldArray({ control: form.control, name: "teachingLoads" });
    const resultSummaries = useFieldArray({ control: form.control, name: "resultSummaries" });
    const administrativeRoles = useFieldArray({ control: form.control, name: "administrativeRoles" });
    const facultyDevelopmentProgrammes = useFieldArray({
        control: form.control,
        name: "facultyDevelopmentProgrammes",
    });
    const socialExtensionActivities = useFieldArray({
        control: form.control,
        name: "socialExtensionActivities",
    });

    function setCsvField(
        field:
            | "researchInterests"
            | "professionalMemberships"
            | "certifications"
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
                    <CardTitle>Faculty Workspace</CardTitle>
                    <CardDescription>
                        Maintain your canonical faculty identity, teaching records, academic activities, and shared accreditation inputs from one institutional workspace.
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

            <div className="grid gap-6 lg:grid-cols-4">
                <ActionCard
                    title="PBAS Module"
                    description="Verify yearly academic contributions, upload evidence, and submit PBAS."
                    href="/faculty/pbas"
                    label="Open PBAS"
                />
                <ActionCard
                    title="CAS Module"
                    description="Prepare promotion evidence, link PBAS reports, and manage CAS workflow."
                    href="/faculty/cas"
                    label="Open CAS"
                />
                <ActionCard
                    title="AQAR Module"
                    description="Review annual quality contributions and submit AQAR-ready faculty data."
                    href="/faculty/aqar"
                    label="Open AQAR"
                />
                <ActionCard
                    title="Evidence Workspace"
                    description="Maintain publications, projects, patents, conferences, and extension evidence once."
                    href="/faculty/evidence"
                    label="Open Evidence"
                />
            </div>

            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <Card>
                <CardHeader>
                    <CardTitle>Profile Photo</CardTitle>
                    <CardDescription>Upload a professional photo for your faculty profile.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfilePhotoUpload userId={user.id} currentPhotoURL={user.photoURL} />
                </CardContent>
            </Card>

            <form onSubmit={form.handleSubmit(submit)}>
                <Tabs defaultValue="profile">
                    <TabsList className="grid h-auto grid-cols-1 gap-2 p-2 md:grid-cols-4">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="teaching">Teaching</TabsTrigger>
                        <TabsTrigger value="activities">Academic Activities</TabsTrigger>
                        <TabsTrigger value="compliance">Compliance</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-6 space-y-6">
                        <SectionCard title="Identity and Qualification" description="Institution-controlled faculty identity and profile details.">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="Employee code" id="employeeCode" error={form.formState.errors.employeeCode?.message}>
                                    <Input id="employeeCode" {...form.register("employeeCode")} />
                                </Field>
                                <Field label="Joining Date" id="joiningDate" error={form.formState.errors.joiningDate?.message}>
                                    <Input id="joiningDate" type="date" {...form.register("joiningDate")} />
                                </Field>
                                <Field label="Highest qualification" id="highestQualification" error={form.formState.errors.highestQualification?.message}>
                                    <Input id="highestQualification" {...form.register("highestQualification")} />
                                </Field>
                                <Field label="Experience years" id="experienceYears" error={form.formState.errors.experienceYears?.message}>
                                    <Input id="experienceYears" type="number" min={0} {...form.register("experienceYears", { valueAsNumber: true })} />
                                </Field>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="Employment type" id="employmentType" error={form.formState.errors.employmentType?.message}>
                                    <Input id="employmentType" {...form.register("employmentType")} />
                                </Field>
                                <Field label="Specialization" id="specialization" error={form.formState.errors.specialization?.message}>
                                    <Input id="specialization" {...form.register("specialization")} />
                                </Field>
                                <Field label="ORCID" id="orcidId" error={form.formState.errors.researchProfile?.orcidId?.message}>
                                    <Input id="orcidId" {...form.register("researchProfile.orcidId")} />
                                </Field>
                                <Field label="Google Scholar ID" id="googleScholarId" error={form.formState.errors.researchProfile?.googleScholarId?.message}>
                                    <Input id="googleScholarId" {...form.register("researchProfile.googleScholarId")} />
                                </Field>
                            </div>
                            <Field label="Biography" id="biography" error={form.formState.errors.biography?.message}>
                                <Textarea id="biography" {...form.register("biography")} />
                            </Field>
                            <CsvField label="Research Interests" initialValue={toCsv(facultyRecord.researchInterests)} onChange={(value) => setCsvField("researchInterests", value)} />
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <CsvField label="Professional Memberships" initialValue={toCsv(facultyRecord.professionalMemberships)} onChange={(value) => setCsvField("professionalMemberships", value)} />
                                <CsvField label="Certifications" initialValue={toCsv(facultyRecord.certifications)} onChange={(value) => setCsvField("certifications", value)} />
                                <CsvField label="Administrative Responsibilities" initialValue={toCsv(facultyRecord.administrativeResponsibilities)} onChange={(value) => setCsvField("administrativeResponsibilities", value)} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Educational Qualifications" description="Maintain the academic qualification timeline for your institutional faculty record.">
                            <div className="grid gap-4">
                                {qualifications.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Level" {...form.register(`qualifications.${index}.level`)} />
                                        <Input placeholder="Degree" {...form.register(`qualifications.${index}.degree`)} />
                                        <Input placeholder="Subject" {...form.register(`qualifications.${index}.subject`)} />
                                        <Input placeholder="Institution" {...form.register(`qualifications.${index}.institution`)} />
                                        <Input placeholder="Year" {...form.register(`qualifications.${index}.year`)} />
                                        <DeleteButton label={`Delete qualification ${index + 1}`} onClick={() => qualifications.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => qualifications.append({ level: "", degree: "", subject: "", institution: "", year: "" })}>
                                    Add Qualification
                                </Button>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="teaching" className="mt-6 space-y-6">
                        <SectionCard title="Teaching Contributions" description="Course handling, semester allocation, and teaching load mapping for accreditation reporting.">
                            <div className="grid gap-4">
                                {teachingLoads.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Academic year" {...form.register(`teachingLoads.${index}.academicYear`)} />
                                        <Input placeholder="Program" {...form.register(`teachingLoads.${index}.programName`)} />
                                        <Input placeholder="Course name" {...form.register(`teachingLoads.${index}.courseName`)} />
                                        <Input type="number" placeholder="Semester" {...form.register(`teachingLoads.${index}.semester`, { valueAsNumber: true })} />
                                        <Input placeholder="Subject code" {...form.register(`teachingLoads.${index}.subjectCode`)} />
                                        <Input type="number" placeholder="Lecture hours" {...form.register(`teachingLoads.${index}.lectureHours`, { valueAsNumber: true })} />
                                        <Input type="number" placeholder="Tutorial hours" {...form.register(`teachingLoads.${index}.tutorialHours`, { valueAsNumber: true })} />
                                        <Input type="number" placeholder="Practical hours" {...form.register(`teachingLoads.${index}.practicalHours`, { valueAsNumber: true })} />
                                        <DeleteButton label={`Delete teaching load ${index + 1}`} onClick={() => teachingLoads.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => teachingLoads.append({ academicYear: "", programName: "", courseName: "", semester: 1, subjectCode: "", lectureHours: 0, tutorialHours: 0, practicalHours: 0, innovativePedagogy: "" })}>
                                    Add Teaching Contribution
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Result Summary" description="Subject-wise academic outcome summary used in teaching quality analytics.">
                            <div className="grid gap-4">
                                {resultSummaries.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Academic year" {...form.register(`resultSummaries.${index}.academicYear`)} />
                                        <Input placeholder="Subject name" {...form.register(`resultSummaries.${index}.subjectName`)} />
                                        <Input type="number" placeholder="Appeared" {...form.register(`resultSummaries.${index}.appearedStudents`, { valueAsNumber: true })} />
                                        <Input type="number" placeholder="Passed" {...form.register(`resultSummaries.${index}.passedStudents`, { valueAsNumber: true })} />
                                        <Input type="number" placeholder="University rank students" {...form.register(`resultSummaries.${index}.universityRankStudents`, { valueAsNumber: true })} />
                                        <DeleteButton label={`Delete result summary ${index + 1}`} onClick={() => resultSummaries.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => resultSummaries.append({ academicYear: "", subjectName: "", appearedStudents: 0, passedStudents: 0, universityRankStudents: 0 })}>
                                    Add Result Summary
                                </Button>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="activities" className="mt-6 space-y-6">
                        <SectionCard title="Administrative Roles" description="Committee and leadership responsibilities used in PBAS and NAAC support metrics.">
                            <div className="grid gap-4">
                                {administrativeRoles.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Academic year" {...form.register(`administrativeRoles.${index}.academicYear`)} />
                                        <Input placeholder="Role name" {...form.register(`administrativeRoles.${index}.roleName`)} />
                                        <Input placeholder="Committee name" {...form.register(`administrativeRoles.${index}.committeeName`)} />
                                        <Input placeholder="Responsibility" {...form.register(`administrativeRoles.${index}.responsibilityDescription`)} />
                                        <DeleteButton label={`Delete administrative role ${index + 1}`} onClick={() => administrativeRoles.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => administrativeRoles.append({ academicYear: "", roleName: "", committeeName: "", responsibilityDescription: "" })}>
                                    Add Administrative Role
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Faculty Development Programmes" description="Capacity-building programmes, orientation activities, and organised FDP records.">
                            <div className="grid gap-4">
                                {facultyDevelopmentProgrammes.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Programme title" {...form.register(`facultyDevelopmentProgrammes.${index}.title`)} />
                                        <Input placeholder="Sponsored by" {...form.register(`facultyDevelopmentProgrammes.${index}.sponsoredBy`)} />
                                        <Input placeholder="Level" {...form.register(`facultyDevelopmentProgrammes.${index}.level`)} />
                                        <Input type="date" placeholder="Start date" {...form.register(`facultyDevelopmentProgrammes.${index}.startDate`)} />
                                        <Input type="date" placeholder="End date" {...form.register(`facultyDevelopmentProgrammes.${index}.endDate`)} />
                                        <Input type="number" placeholder="Participants" {...form.register(`facultyDevelopmentProgrammes.${index}.participantsCount`, { valueAsNumber: true })} />
                                        <DeleteButton label={`Delete FDP ${index + 1}`} onClick={() => facultyDevelopmentProgrammes.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => facultyDevelopmentProgrammes.append({ title: "", sponsoredBy: "", level: "College", startDate: "", endDate: "", participantsCount: 0 })}>
                                    Add FDP Record
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Social Extension Activities" description="Extension, outreach, and institutional social responsibility contributions.">
                            <div className="grid gap-4">
                                {socialExtensionActivities.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Academic year" {...form.register(`socialExtensionActivities.${index}.academicYear`)} />
                                        <Input placeholder="Programme name" {...form.register(`socialExtensionActivities.${index}.programName`)} />
                                        <Input placeholder="Activity name" {...form.register(`socialExtensionActivities.${index}.activityName`)} />
                                        <Input type="number" placeholder="Hours contributed" {...form.register(`socialExtensionActivities.${index}.hoursContributed`, { valueAsNumber: true })} />
                                        <DeleteButton label={`Delete extension activity ${index + 1}`} onClick={() => socialExtensionActivities.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => socialExtensionActivities.append({ academicYear: "", programName: "", activityName: "", hoursContributed: 0 })}>
                                    Add Extension Activity
                                </Button>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="compliance" className="mt-6 space-y-6">
                        <SectionCard title="Accreditation Workflows" description="Use the dedicated module workspaces to review, verify, and submit formal institutional workflows.">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <ActionLink title="PBAS" description="Annual performance appraisal and score claim verification." href="/faculty/pbas" />
                                <ActionLink title="CAS" description="Promotion readiness, eligibility, and committee review workflow." href="/faculty/cas" />
                                <ActionLink title="AQAR" description="Annual quality contribution submission for institutional reporting." href="/faculty/aqar" />
                                <ActionLink title="Evidence" description="Shared research, event, extension, and activity evidence library." href="/faculty/evidence" />
                            </div>
                        </SectionCard>
                    </TabsContent>
                </Tabs>

                <Button type="submit" size="lg" disabled={isPending} className="mt-6">
                    {isPending ? <Spinner /> : null}
                    Save Faculty Workspace
                </Button>
            </form>
        </div>
    );
}

function ActionCard({
    title,
    description,
    href,
    label,
}: {
    title: string;
    description: string;
    href: string;
    label: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="w-full">
                    <Link href={href}>{label}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function ActionLink({
    title,
    description,
    href,
}: {
    title: string;
    description: string;
    href: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-950">{title}</p>
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
            <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={href}>Open {title}</Link>
            </Button>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-950">{value}</p>
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
            <CardContent className="space-y-4">{children}</CardContent>
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
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
    );
}

function CsvField({
    label,
    initialValue,
    onChange,
}: {
    label: string;
    initialValue: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Input defaultValue={initialValue} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
}

function EditableRow({ children }: { children: React.ReactNode }) {
    return <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-6">{children}</div>;
}

function DeleteButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onClick}
            aria-label={label}
        >
            <Trash2 className="size-4" />
        </Button>
    );
}
