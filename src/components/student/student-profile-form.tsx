"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { studentProfileSchema } from "@/lib/student/validators";

type StudentProfileValues = z.input<typeof studentProfileSchema>;
type StudentProfileResolvedValues = z.output<typeof studentProfileSchema>;

type ExistingStudentDetails = {
    rollNo?: string;
    course?: string;
    batch?: string;
    admissionYear?: string;
    profileStatus?: string;
    assignedHodName?: string;
    rejectionReason?: string;
    personalInfo?: Record<string, string | undefined>;
    academicInfo?: {
        currentSemester?: string;
        cgpa?: string;
        section?: string;
        mentorName?: string;
        areasOfInterest?: string[];
    };
    careerProfile?: {
        headline?: string;
        summary?: string;
        careerObjective?: string;
        skills?: string[];
        languages?: string[];
        certifications?: string[];
        achievements?: string[];
        projects?: Array<{
            title: string;
            description?: string;
            techStack?: string[];
            link?: string;
        }>;
        internships?: Array<{
            organization: string;
            role?: string;
            duration?: string;
            description?: string;
        }>;
        socialLinks?: {
            linkedin?: string;
            github?: string;
            portfolio?: string;
        };
    };
};

function toCsv(value?: string[]) {
    return value?.join(", ") ?? "";
}

export function StudentProfileForm({
    studentName,
    studentEmail,
    studentDetails,
}: {
    studentName: string;
    studentEmail: string;
    studentDetails?: ExistingStudentDetails;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );

    const form = useForm<StudentProfileValues, unknown, StudentProfileResolvedValues>({
        resolver: zodResolver(studentProfileSchema),
        defaultValues: {
            dateOfBirth: studentDetails?.personalInfo?.dateOfBirth ?? "",
            gender: studentDetails?.personalInfo?.gender ?? "",
            bloodGroup: studentDetails?.personalInfo?.bloodGroup ?? "",
            address: studentDetails?.personalInfo?.address ?? "",
            city: studentDetails?.personalInfo?.city ?? "",
            state: studentDetails?.personalInfo?.state ?? "",
            postalCode: studentDetails?.personalInfo?.postalCode ?? "",
            emergencyContactName: studentDetails?.personalInfo?.emergencyContactName ?? "",
            emergencyContactPhone: studentDetails?.personalInfo?.emergencyContactPhone ?? "",
            parentName: studentDetails?.personalInfo?.parentName ?? "",
            parentPhone: studentDetails?.personalInfo?.parentPhone ?? "",
            currentSemester: studentDetails?.academicInfo?.currentSemester ?? "",
            cgpa: studentDetails?.academicInfo?.cgpa ?? "",
            section: studentDetails?.academicInfo?.section ?? "",
            mentorName: studentDetails?.academicInfo?.mentorName ?? "",
            areasOfInterest: studentDetails?.academicInfo?.areasOfInterest ?? [],
            headline: studentDetails?.careerProfile?.headline ?? "",
            summary: studentDetails?.careerProfile?.summary ?? "",
            careerObjective: studentDetails?.careerProfile?.careerObjective ?? "",
            skills: studentDetails?.careerProfile?.skills ?? [],
            languages: studentDetails?.careerProfile?.languages ?? [],
            certifications: studentDetails?.careerProfile?.certifications ?? [],
            achievements: studentDetails?.careerProfile?.achievements ?? [],
            projects: studentDetails?.careerProfile?.projects ?? [],
            internships: studentDetails?.careerProfile?.internships ?? [],
            linkedin: studentDetails?.careerProfile?.socialLinks?.linkedin ?? "",
            github: studentDetails?.careerProfile?.socialLinks?.github ?? "",
            portfolio: studentDetails?.careerProfile?.socialLinks?.portfolio ?? "",
        },
    });

    const projectFields = useFieldArray({
        control: form.control,
        name: "projects",
    });

    const internshipFields = useFieldArray({
        control: form.control,
        name: "internships",
    });

    function setCsvField(
        field:
            | "areasOfInterest"
            | "skills"
            | "languages"
            | "certifications"
            | "achievements",
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

    function onSubmit(values: StudentProfileResolvedValues) {
        setMessage(null);

        startTransition(async () => {
            const response = await fetch("/api/student/profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const data = (await response.json()) as { message?: string; redirectPath?: string };

            if (!response.ok) {
                setMessage({
                    type: "error",
                    text: data.message ?? "Unable to submit profile.",
                });
                return;
            }

            setMessage({
                type: "success",
                text: data.message ?? "Profile submitted for HOD approval.",
            });

            if (data.redirectPath) {
                router.push(data.redirectPath);
            }

            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Student profile and approval</CardTitle>
                    <CardDescription>
                        Complete your profile in full. HOD approval is required only for the first submission or after a rejection. Once approved, future edits save directly.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatusItem label="Student" value={studentName} />
                    <StatusItem label="Email" value={studentEmail} />
                    <StatusItem label="Profile Status" value={studentDetails?.profileStatus ?? "Draft"} />
                    <StatusItem label="Assigned HOD" value={studentDetails?.assignedHodName ?? "Not mapped"} />
                </CardContent>
            </Card>

            {studentDetails?.rejectionReason ? (
                <FormMessage message={`HOD feedback: ${studentDetails.rejectionReason}`} type="error" />
            ) : null}
            {message ? <FormMessage message={message.text} type={message.type} /> : null}

            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <SectionCard
                    title="Academic identity"
                    description="Core academic details used by the HOD while validating your profile."
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <ReadOnlyItem label="Roll Number" value={studentDetails?.rollNo ?? "-"} />
                        <ReadOnlyItem label="Course" value={studentDetails?.course ?? "-"} />
                        <ReadOnlyItem label="Batch" value={studentDetails?.batch ?? "-"} />
                        <ReadOnlyItem label="Admission Year" value={studentDetails?.admissionYear ?? "-"} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Field label="Current Semester" id="currentSemester" error={form.formState.errors.currentSemester?.message}>
                            <Input id="currentSemester" {...form.register("currentSemester")} />
                        </Field>
                        <Field label="CGPA" id="cgpa" error={form.formState.errors.cgpa?.message}>
                            <Input id="cgpa" {...form.register("cgpa")} />
                        </Field>
                        <Field label="Section" id="section" error={form.formState.errors.section?.message}>
                            <Input id="section" {...form.register("section")} />
                        </Field>
                        <Field label="Mentor Name" id="mentorName" error={form.formState.errors.mentorName?.message}>
                            <Input id="mentorName" {...form.register("mentorName")} />
                        </Field>
                    </div>
                </SectionCard>

                <SectionCard title="Personal information" description="Mandatory identity and emergency-contact details.">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Date of Birth" id="dateOfBirth" error={form.formState.errors.dateOfBirth?.message}>
                            <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
                        </Field>
                        <Field label="Gender" id="gender" error={form.formState.errors.gender?.message}>
                            <Controller
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <SelectTrigger id="gender" className="w-full">
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </Field>
                        <Field label="Blood Group" id="bloodGroup" error={form.formState.errors.bloodGroup?.message}>
                            <Input id="bloodGroup" {...form.register("bloodGroup")} />
                        </Field>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Address" id="address" error={form.formState.errors.address?.message}>
                            <Textarea id="address" {...form.register("address")} />
                        </Field>
                        <div className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <Field label="City" id="city" error={form.formState.errors.city?.message}>
                                    <Input id="city" {...form.register("city")} />
                                </Field>
                                <Field label="State" id="state" error={form.formState.errors.state?.message}>
                                    <Input id="state" {...form.register("state")} />
                                </Field>
                                <Field label="Postal Code" id="postalCode" error={form.formState.errors.postalCode?.message}>
                                    <Input id="postalCode" {...form.register("postalCode")} />
                                </Field>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Emergency Contact Name" id="emergencyContactName" error={form.formState.errors.emergencyContactName?.message}>
                                    <Input id="emergencyContactName" {...form.register("emergencyContactName")} />
                                </Field>
                                <Field label="Emergency Contact Phone" id="emergencyContactPhone" error={form.formState.errors.emergencyContactPhone?.message}>
                                    <Input id="emergencyContactPhone" {...form.register("emergencyContactPhone")} />
                                </Field>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Parent Name" id="parentName" error={form.formState.errors.parentName?.message}>
                                    <Input id="parentName" {...form.register("parentName")} />
                                </Field>
                                <Field label="Parent Phone" id="parentPhone" error={form.formState.errors.parentPhone?.message}>
                                    <Input id="parentPhone" {...form.register("parentPhone")} />
                                </Field>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Career profile" description="This content is used for HOD approval and resume generation.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Professional Headline" id="headline" error={form.formState.errors.headline?.message}>
                            <Input id="headline" {...form.register("headline")} />
                        </Field>
                        <Field label="Areas of Interest" id="areasOfInterest" error={form.formState.errors.areasOfInterest?.message?.toString()}>
                            <Input
                                id="areasOfInterest"
                                defaultValue={toCsv(studentDetails?.academicInfo?.areasOfInterest)}
                                onChange={(event) => setCsvField("areasOfInterest", event.target.value)}
                            />
                        </Field>
                    </div>
                    <Field label="Summary" id="summary" error={form.formState.errors.summary?.message}>
                        <Textarea id="summary" {...form.register("summary")} />
                    </Field>
                    <Field label="Career Objective" id="careerObjective" error={form.formState.errors.careerObjective?.message}>
                        <Textarea id="careerObjective" {...form.register("careerObjective")} />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <CsvField label="Skills" field="skills" initialValue={toCsv(studentDetails?.careerProfile?.skills)} onChange={setCsvField} />
                        <CsvField label="Languages" field="languages" initialValue={toCsv(studentDetails?.careerProfile?.languages)} onChange={setCsvField} />
                        <CsvField label="Certifications" field="certifications" initialValue={toCsv(studentDetails?.careerProfile?.certifications)} onChange={setCsvField} />
                        <CsvField label="Achievements" field="achievements" initialValue={toCsv(studentDetails?.careerProfile?.achievements)} onChange={setCsvField} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="LinkedIn" id="linkedin" error={form.formState.errors.linkedin?.message}>
                            <Input id="linkedin" {...form.register("linkedin")} />
                        </Field>
                        <Field label="GitHub" id="github" error={form.formState.errors.github?.message}>
                            <Input id="github" {...form.register("github")} />
                        </Field>
                        <Field label="Portfolio" id="portfolio" error={form.formState.errors.portfolio?.message}>
                            <Input id="portfolio" {...form.register("portfolio")} />
                        </Field>
                    </div>
                </SectionCard>

                <SectionCard title="Projects" description="Add academic, capstone, freelance, or personal projects.">
                    <div className="grid gap-4">
                        {projectFields.fields.map((field, index) => (
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={field.id}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Project Title" id={`project-title-${index}`} error={form.formState.errors.projects?.[index]?.title?.message}>
                                        <Input id={`project-title-${index}`} {...form.register(`projects.${index}.title`)} />
                                    </Field>
                                    <Field label="Project Link" id={`project-link-${index}`} error={form.formState.errors.projects?.[index]?.link?.message}>
                                        <Input id={`project-link-${index}`} {...form.register(`projects.${index}.link`)} />
                                    </Field>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Description" id={`project-description-${index}`} error={form.formState.errors.projects?.[index]?.description?.message}>
                                        <Textarea id={`project-description-${index}`} {...form.register(`projects.${index}.description`)} />
                                    </Field>
                                    <Field label="Tech Stack (comma separated)" id={`project-tech-${index}`} error={form.formState.errors.projects?.[index]?.techStack?.message?.toString()}>
                                        <Input
                                            id={`project-tech-${index}`}
                                            defaultValue={field.techStack?.join(", ") ?? ""}
                                            onChange={(event) =>
                                                form.setValue(
                                                    `projects.${index}.techStack`,
                                                    event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => projectFields.remove(index)}
                                    aria-label={`Delete project ${index + 1}`}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => projectFields.append({ title: "", description: "", techStack: [], link: "" })}>
                            Add Project
                        </Button>
                    </div>
                </SectionCard>

                <SectionCard title="Internships" description="Add internships, trainings, industrial attachments, or apprenticeships.">
                    <div className="grid gap-4">
                        {internshipFields.fields.map((field, index) => (
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={field.id}>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Field label="Organization" id={`internship-org-${index}`} error={form.formState.errors.internships?.[index]?.organization?.message}>
                                        <Input id={`internship-org-${index}`} {...form.register(`internships.${index}.organization`)} />
                                    </Field>
                                    <Field label="Role" id={`internship-role-${index}`} error={form.formState.errors.internships?.[index]?.role?.message}>
                                        <Input id={`internship-role-${index}`} {...form.register(`internships.${index}.role`)} />
                                    </Field>
                                    <Field label="Duration" id={`internship-duration-${index}`} error={form.formState.errors.internships?.[index]?.duration?.message}>
                                        <Input id={`internship-duration-${index}`} {...form.register(`internships.${index}.duration`)} />
                                    </Field>
                                </div>
                                <Field label="Description" id={`internship-description-${index}`} error={form.formState.errors.internships?.[index]?.description?.message}>
                                    <Textarea id={`internship-description-${index}`} {...form.register(`internships.${index}.description`)} />
                                </Field>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => internshipFields.remove(index)}
                                    aria-label={`Delete internship ${index + 1}`}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => internshipFields.append({ organization: "", role: "", duration: "", description: "" })}>
                            Add Internship
                        </Button>
                    </div>
                </SectionCard>

                <div className="flex flex-wrap gap-3">
                    <Button disabled={isPending} size="lg" type="submit">
                        {isPending ? <Spinner /> : null}
                        Submit To HOD For Approval
                    </Button>
                    <Button asChild size="lg" variant="secondary">
                        <a href="/api/student/resume">Download Resume PDF</a>
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

function StatusItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function ReadOnlyItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <div className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600">
                {value}
            </div>
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
    field: "skills" | "languages" | "certifications" | "achievements";
    initialValue: string;
    onChange: (
        field: "areasOfInterest" | "skills" | "languages" | "certifications" | "achievements",
        value: string
    ) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={field}>{label}</Label>
            <Input
                defaultValue={initialValue}
                id={field}
                onChange={(event) => onChange(field, event.target.value)}
            />
        </div>
    );
}
