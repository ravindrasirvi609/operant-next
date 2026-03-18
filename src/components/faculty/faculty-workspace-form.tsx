"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { ProfilePhotoUpload } from "@/components/faculty/profile-photo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    bookTypes,
    eventLevels,
    eventRoles,
    eventTypes,
    facultyEmploymentTypes,
    facultyProgrammeLevels,
    institutionalImpactLevels,
    patentStatuses,
    publicationAuthorPositions,
    publicationTypes,
    researchProjectStatuses,
    researchProjectTypes,
} from "@/lib/faculty/options";
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
            teachingSummaries: facultyRecord.teachingSummaries ?? [],
            teachingLoads: facultyRecord.teachingLoads ?? [],
            resultSummaries: facultyRecord.resultSummaries ?? [],
            publications: facultyRecord.publications ?? [],
            books: facultyRecord.books ?? [],
            patents: facultyRecord.patents ?? [],
            researchProjects: facultyRecord.researchProjects ?? [],
            eventParticipations: facultyRecord.eventParticipations ?? [],
            administrativeRoles: facultyRecord.administrativeRoles ?? [],
            institutionalContributions: facultyRecord.institutionalContributions ?? [],
            facultyDevelopmentProgrammes: facultyRecord.facultyDevelopmentProgrammes ?? [],
            socialExtensionActivities: facultyRecord.socialExtensionActivities ?? [],
        },
    });

    const qualifications = useFieldArray({ control: form.control, name: "qualifications" });
    const teachingSummaries = useFieldArray({ control: form.control, name: "teachingSummaries" });
    const teachingLoads = useFieldArray({ control: form.control, name: "teachingLoads" });
    const resultSummaries = useFieldArray({ control: form.control, name: "resultSummaries" });
    const publications = useFieldArray({ control: form.control, name: "publications" });
    const books = useFieldArray({ control: form.control, name: "books" });
    const patents = useFieldArray({ control: form.control, name: "patents" });
    const researchProjects = useFieldArray({ control: form.control, name: "researchProjects" });
    const eventParticipations = useFieldArray({ control: form.control, name: "eventParticipations" });
    const administrativeRoles = useFieldArray({ control: form.control, name: "administrativeRoles" });
    const institutionalContributions = useFieldArray({
        control: form.control,
        name: "institutionalContributions",
    });
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
                        Maintain your canonical faculty identity and the real category-wise faculty records that drive PBAS, CAS, and AQAR workflows.
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
                    title="Faculty Records"
                    description="Use this workspace as the source of truth for category-wise faculty data."
                    href="/faculty/profile"
                    label="Review Records"
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
                                    <Controller
                                        control={form.control}
                                        name="employmentType"
                                        render={({ field }) => (
                                            <EnumSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={facultyEmploymentTypes}
                                                placeholder="Select employment type"
                                            />
                                        )}
                                    />
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
                        <SectionCard title="PBAS Category I Teaching Summary" description="Year-wise teaching summary records used as the primary PBAS teaching source.">
                            <div className="grid gap-4">
                                {teachingSummaries.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Academic year" {...form.register(`teachingSummaries.${index}.academicYear`)} />
                                        <Input type="number" placeholder="Classes taken" {...form.register(`teachingSummaries.${index}.classesTaken`, { valueAsNumber: true })} />
                                        <Input
                                            type="number"
                                            placeholder="Course prep hours"
                                            {...form.register(`teachingSummaries.${index}.coursePreparationHours`, { valueAsNumber: true })}
                                        />
                                        <Input type="number" placeholder="Mentoring count" {...form.register(`teachingSummaries.${index}.mentoringCount`, { valueAsNumber: true })} />
                                        <Input
                                            type="number"
                                            placeholder="Lab supervision count"
                                            {...form.register(`teachingSummaries.${index}.labSupervisionCount`, { valueAsNumber: true })}
                                        />
                                        <DeleteButton label={`Delete teaching summary ${index + 1}`} onClick={() => teachingSummaries.remove(index)} />
                                        <Textarea
                                            className="md:col-span-2 xl:col-span-3"
                                            placeholder="Courses taught (comma separated)"
                                            value={(form.watch(`teachingSummaries.${index}.coursesTaught`) ?? []).join(", ")}
                                            onChange={(event) =>
                                                form.setValue(
                                                    `teachingSummaries.${index}.coursesTaught`,
                                                    event.target.value
                                                        .split(",")
                                                        .map((item) => item.trim())
                                                        .filter(Boolean),
                                                    { shouldValidate: true }
                                                )
                                            }
                                        />
                                        <Textarea
                                            className="md:col-span-2 xl:col-span-3"
                                            placeholder="Feedback summary"
                                            {...form.register(`teachingSummaries.${index}.feedbackSummary`)}
                                        />
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        teachingSummaries.append({
                                            academicYear: "",
                                            classesTaken: 0,
                                            coursePreparationHours: 0,
                                            coursesTaught: [],
                                            mentoringCount: 0,
                                            labSupervisionCount: 0,
                                            feedbackSummary: "",
                                        })
                                    }
                                >
                                    Add Teaching Summary
                                </Button>
                            </div>
                        </SectionCard>

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
                        <SectionCard title="PBAS Category II Publications" description="Journal publications and indexed outputs captured directly in the faculty publication schema.">
                            <div className="grid gap-4">
                                {publications.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Title" {...form.register(`publications.${index}.title`)} />
                                        <Input placeholder="Journal name" {...form.register(`publications.${index}.journalName`)} />
                                        <Input placeholder="Publisher" {...form.register(`publications.${index}.publisher`)} />
                                        <Controller
                                            control={form.control}
                                            name={`publications.${index}.publicationType`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={publicationTypes}
                                                    placeholder="Publication type"
                                                />
                                            )}
                                        />
                                        <Input placeholder="Indexed in" {...form.register(`publications.${index}.indexedIn`)} />
                                        <DeleteButton label={`Delete publication ${index + 1}`} onClick={() => publications.remove(index)} />
                                        <Input placeholder="ISBN / ISSN" {...form.register(`publications.${index}.isbnIssn`)} />
                                        <Input placeholder="DOI" {...form.register(`publications.${index}.doi`)} />
                                        <Input type="date" placeholder="Publication date" {...form.register(`publications.${index}.publicationDate`)} />
                                        <Input type="number" placeholder="Impact factor" {...form.register(`publications.${index}.impactFactor`, { valueAsNumber: true })} />
                                        <Controller
                                            control={form.control}
                                            name={`publications.${index}.authorPosition`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={publicationAuthorPositions}
                                                    placeholder="Author position"
                                                />
                                            )}
                                        />
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        publications.append({
                                            title: "",
                                            journalName: "",
                                            publisher: "",
                                            publicationType: "UGC",
                                            impactFactor: 0,
                                            isbnIssn: "",
                                            doi: "",
                                            publicationDate: "",
                                            indexedIn: "",
                                            authorPosition: "First",
                                        })
                                    }
                                >
                                    Add Publication
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Books and Book Chapters" description="Faculty book records used directly for PBAS and AQAR reporting.">
                            <div className="grid gap-4">
                                {books.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Title" {...form.register(`books.${index}.title`)} />
                                        <Input placeholder="Publisher" {...form.register(`books.${index}.publisher`)} />
                                        <Input placeholder="ISBN" {...form.register(`books.${index}.isbn`)} />
                                        <Input type="date" placeholder="Publication date" {...form.register(`books.${index}.publicationDate`)} />
                                        <Controller
                                            control={form.control}
                                            name={`books.${index}.bookType`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={bookTypes}
                                                    placeholder="Book type"
                                                />
                                            )}
                                        />
                                        <DeleteButton label={`Delete book ${index + 1}`} onClick={() => books.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        books.append({
                                            title: "",
                                            publisher: "",
                                            isbn: "",
                                            publicationDate: "",
                                            bookType: "Textbook",
                                        })
                                    }
                                >
                                    Add Book
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Patents and Research Projects" description="Innovation and funded project records used for PBAS Category II and CAS scoring.">
                            <div className="grid gap-4">
                                {patents.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Patent title" {...form.register(`patents.${index}.title`)} />
                                        <Input placeholder="Patent number" {...form.register(`patents.${index}.patentNumber`)} />
                                        <Controller
                                            control={form.control}
                                            name={`patents.${index}.status`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={patentStatuses}
                                                    placeholder="Patent status"
                                                />
                                            )}
                                        />
                                        <Input type="date" placeholder="Filing date" {...form.register(`patents.${index}.filingDate`)} />
                                        <Input type="date" placeholder="Grant date" {...form.register(`patents.${index}.grantDate`)} />
                                        <DeleteButton label={`Delete patent ${index + 1}`} onClick={() => patents.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        patents.append({
                                            title: "",
                                            patentNumber: "",
                                            status: "Filed",
                                            filingDate: "",
                                            grantDate: "",
                                        })
                                    }
                                >
                                    Add Patent
                                </Button>

                                {researchProjects.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Project title" {...form.register(`researchProjects.${index}.title`)} />
                                        <Input placeholder="Funding agency" {...form.register(`researchProjects.${index}.fundingAgency`)} />
                                        <Controller
                                            control={form.control}
                                            name={`researchProjects.${index}.projectType`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={researchProjectTypes}
                                                    placeholder="Project type"
                                                />
                                            )}
                                        />
                                        <Input type="number" placeholder="Amount sanctioned" {...form.register(`researchProjects.${index}.amountSanctioned`, { valueAsNumber: true })} />
                                        <Controller
                                            control={form.control}
                                            name={`researchProjects.${index}.status`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={researchProjectStatuses}
                                                    placeholder="Project status"
                                                />
                                            )}
                                        />
                                        <DeleteButton label={`Delete research project ${index + 1}`} onClick={() => researchProjects.remove(index)} />
                                        <Input type="date" placeholder="Start date" {...form.register(`researchProjects.${index}.startDate`)} />
                                        <Input type="date" placeholder="End date" {...form.register(`researchProjects.${index}.endDate`)} />
                                        <Controller
                                            control={form.control}
                                            name={`researchProjects.${index}.principalInvestigator`}
                                            render={({ field }) => (
                                                <CheckboxField
                                                    checked={Boolean(field.value)}
                                                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                                    label="Principal investigator"
                                                />
                                            )}
                                        />
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        researchProjects.append({
                                            title: "",
                                            fundingAgency: "",
                                            projectType: "Minor",
                                            amountSanctioned: 0,
                                            startDate: "",
                                            endDate: "",
                                            status: "Ongoing",
                                            principalInvestigator: false,
                                        })
                                    }
                                >
                                    Add Research Project
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Conference and Event Participation" description="Conference participation records are captured on the real event participation and event schemas.">
                            <div className="grid gap-4">
                                {eventParticipations.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Event title" {...form.register(`eventParticipations.${index}.title`)} />
                                        <Input placeholder="Organizer" {...form.register(`eventParticipations.${index}.organizer`)} />
                                        <Controller
                                            control={form.control}
                                            name={`eventParticipations.${index}.eventType`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={eventTypes}
                                                    placeholder="Event type"
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name={`eventParticipations.${index}.level`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={eventLevels}
                                                    placeholder="Event level"
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name={`eventParticipations.${index}.role`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={eventRoles}
                                                    placeholder="Participation role"
                                                />
                                            )}
                                        />
                                        <DeleteButton label={`Delete event participation ${index + 1}`} onClick={() => eventParticipations.remove(index)} />
                                        <Input type="date" placeholder="Start date" {...form.register(`eventParticipations.${index}.startDate`)} />
                                        <Input type="date" placeholder="End date" {...form.register(`eventParticipations.${index}.endDate`)} />
                                        <Input placeholder="Location" {...form.register(`eventParticipations.${index}.location`)} />
                                        <Input placeholder="Paper title" {...form.register(`eventParticipations.${index}.paperTitle`)} />
                                        <Controller
                                            control={form.control}
                                            name={`eventParticipations.${index}.paperPresented`}
                                            render={({ field }) => (
                                                <CheckboxField
                                                    checked={Boolean(field.value)}
                                                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                                    label="Paper presented"
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name={`eventParticipations.${index}.organized`}
                                            render={({ field }) => (
                                                <CheckboxField
                                                    checked={Boolean(field.value)}
                                                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                                    label="Organized event"
                                                />
                                            )}
                                        />
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        eventParticipations.append({
                                            title: "",
                                            organizer: "",
                                            eventType: "Conference",
                                            level: "College",
                                            startDate: "",
                                            endDate: "",
                                            location: "",
                                            role: "Participant",
                                            paperPresented: false,
                                            paperTitle: "",
                                            organized: false,
                                        })
                                    }
                                >
                                    Add Event Participation
                                </Button>
                            </div>
                        </SectionCard>

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

                        <SectionCard title="Institutional Contributions" description="Institution-level activities, guidance roles, and weighted contributions used in PBAS Category III.">
                            <div className="grid gap-4">
                                {institutionalContributions.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Academic year" {...form.register(`institutionalContributions.${index}.academicYear`)} />
                                        <Input placeholder="Activity title" {...form.register(`institutionalContributions.${index}.activityTitle`)} />
                                        <Input placeholder="Role" {...form.register(`institutionalContributions.${index}.role`)} />
                                        <Controller
                                            control={form.control}
                                            name={`institutionalContributions.${index}.impactLevel`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={institutionalImpactLevels}
                                                    placeholder="Impact level"
                                                />
                                            )}
                                        />
                                        <Input type="number" placeholder="Score weightage" {...form.register(`institutionalContributions.${index}.scoreWeightage`, { valueAsNumber: true })} />
                                        <DeleteButton label={`Delete institutional contribution ${index + 1}`} onClick={() => institutionalContributions.remove(index)} />
                                    </EditableRow>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        institutionalContributions.append({
                                            academicYear: "",
                                            activityTitle: "",
                                            role: "",
                                            impactLevel: "dept",
                                            scoreWeightage: 0,
                                        })
                                    }
                                >
                                    Add Institutional Contribution
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Faculty Development Programmes" description="Capacity-building programmes, orientation activities, and organised FDP records.">
                            <div className="grid gap-4">
                                {facultyDevelopmentProgrammes.fields.map((field, index) => (
                                    <EditableRow key={field.id}>
                                        <Input placeholder="Programme title" {...form.register(`facultyDevelopmentProgrammes.${index}.title`)} />
                                        <Input placeholder="Sponsored by" {...form.register(`facultyDevelopmentProgrammes.${index}.sponsoredBy`)} />
                                        <Controller
                                            control={form.control}
                                            name={`facultyDevelopmentProgrammes.${index}.level`}
                                            render={({ field }) => (
                                                <EnumSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={facultyProgrammeLevels}
                                                    placeholder="Programme level"
                                                />
                                            )}
                                        />
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
                        <SectionCard title="Accreditation Workflows" description="The faculty records on this page are the source of truth for PBAS, CAS, and AQAR. Use these workflow modules to review, verify, and submit yearly reports.">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <ActionLink title="PBAS" description="Annual performance appraisal and score claim verification." href="/faculty/pbas" />
                                <ActionLink title="CAS" description="Promotion readiness, eligibility, and committee review workflow." href="/faculty/cas" />
                                <ActionLink title="AQAR" description="Annual quality contribution submission for institutional reporting." href="/faculty/aqar" />
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

function EnumSelect({
    value,
    onChange,
    options,
    placeholder,
}: {
    value?: string;
    onChange: (value: string) => void;
    options: readonly string[];
    placeholder: string;
}) {
    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CheckboxField({
    checked,
    onCheckedChange,
    label,
}: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
            <span>{label}</span>
        </label>
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
