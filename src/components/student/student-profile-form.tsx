"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { ProfilePhotoUpload } from "@/components/faculty/profile-photo-upload";
import { Badge } from "@/components/ui/badge";
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

type StudentMeta = {
    enrollmentNo: string;
    studentStatus: string;
    accountStatus: string;
    institutionName?: string;
    departmentName?: string;
    programName?: string;
    degreeType?: string;
    durationYears?: number;
    admissionYear?: number;
    mobile?: string;
    lastLoginAt?: string | Date;
};

function formatLogin(value?: string | Date) {
    if (!value) {
        return "First-time access";
    }

    return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function StudentProfileForm({
    studentId,
    studentName,
    studentEmail,
    studentMeta,
    studentDetails,
    currentPhotoURL,
}: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentMeta: StudentMeta;
    studentDetails?: ExistingStudentDetails;
    currentPhotoURL?: string;
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
        },
    });

    const completion = useMemo(() => {
        const values = form.getValues();
        const checks = [
            values.dateOfBirth,
            values.gender,
            values.address,
            values.city,
            values.state,
            values.postalCode,
            values.emergencyContactName,
            values.emergencyContactPhone,
            values.parentName,
            values.parentPhone,
        ];

        const done = checks.filter(Boolean).length;
        return Math.round((done / checks.length) * 100);
    }, [form]);

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
                text: data.message ?? "Profile saved successfully.",
            });

            if (data.redirectPath) {
                router.push(data.redirectPath);
            }

            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <Card className="relative overflow-hidden border-zinc-200 bg-white">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-12 top-8 h-36 w-36 rounded-full bg-sky-100/70 blur-3xl" />
                    <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />
                </div>
                <CardHeader className="relative space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">Student Profile Workspace</CardTitle>
                        <Badge>{studentMeta.studentStatus}</Badge>
                        <Badge
                            className={
                                studentMeta.accountStatus === "Active"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            }
                        >
                            {studentMeta.accountStatus}
                        </Badge>
                        <Badge variant="secondary">{studentDetails?.profileStatus ?? "Draft"}</Badge>
                    </div>
                    <CardDescription className="text-base">
                        A single professional profile surface for institutional identity, personal details,
                        academics, and career portfolio. All sections below map directly to your student
                        profile schema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetaItem label="Student" value={studentName} />
                    <MetaItem label="Institution Email" value={studentEmail} />
                    <MetaItem label="Enrollment No." value={studentMeta.enrollmentNo} />
                    <MetaItem label="Last Login" value={formatLogin(studentMeta.lastLoginAt)} />
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                    <Card className="border-zinc-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-lg">Profile Photo</CardTitle>
                            <CardDescription>Use a clear and professional headshot.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ProfilePhotoUpload
                                userId={studentId}
                                currentPhotoURL={currentPhotoURL}
                                endpoint="/api/student/photo"
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-lg">Institution Mapping</CardTitle>
                            <CardDescription>Read-only academic identity from the institution.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <ReadOnlyLine label="Roll Number" value={studentDetails?.rollNo ?? studentMeta.enrollmentNo} />
                            <ReadOnlyLine label="Course" value={studentDetails?.course ?? studentMeta.programName ?? "-"} />
                            <ReadOnlyLine label="Batch" value={studentDetails?.batch ?? "-"} />
                            <ReadOnlyLine
                                label="Admission Year"
                                value={
                                    studentDetails?.admissionYear ??
                                    (studentMeta.admissionYear ? String(studentMeta.admissionYear) : "-")
                                }
                            />
                            <ReadOnlyLine label="Institution" value={studentMeta.institutionName ?? "-"} />
                            <ReadOnlyLine label="Department" value={studentMeta.departmentName ?? "-"} />
                            <ReadOnlyLine label="Program" value={studentMeta.programName ?? "-"} />
                            <ReadOnlyLine label="Degree Type" value={studentMeta.degreeType ?? "-"} />
                            <ReadOnlyLine
                                label="Program Duration"
                                value={studentMeta.durationYears ? `${studentMeta.durationYears} years` : "-"}
                            />
                            <ReadOnlyLine label="Mobile" value={studentMeta.mobile ?? "-"} />
                            <ReadOnlyLine label="Verifier" value={studentDetails?.assignedHodName ?? "Not assigned"} />
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-lg">Completion</CardTitle>
                            <CardDescription>Track required profile readiness.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="h-2 rounded-full bg-zinc-100">
                                <div
                                    className="h-2 rounded-full bg-zinc-900 transition-all"
                                    style={{ width: `${completion}%` }}
                                />
                            </div>
                            <p className="text-sm text-zinc-600">
                                {completion}% of required profile fields completed.
                            </p>
                            <Button asChild className="w-full" variant="secondary">
                                <a href="/api/student/resume">Download Resume PDF</a>
                            </Button>
                        </CardContent>
                    </Card>
                </aside>

                <section className="space-y-4">
                    {studentDetails?.rejectionReason ? (
                        <FormMessage
                            message={`Reviewer feedback: ${studentDetails.rejectionReason}`}
                            type="error"
                        />
                    ) : null}
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <Card className="border-zinc-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-xl">Edit Profile Details</CardTitle>
                            <CardDescription>
                                Update only your personal and emergency-contact information here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                                    Academic, career, and portfolio records are managed separately in <a className="font-semibold underline" href="/student/records">Records Workspace</a>.
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <Field
                                        label="Date of Birth"
                                        id="dateOfBirth"
                                        error={form.formState.errors.dateOfBirth?.message}
                                    >
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
                                    <Field
                                        label="Blood Group"
                                        id="bloodGroup"
                                        error={form.formState.errors.bloodGroup?.message}
                                    >
                                        <Input id="bloodGroup" {...form.register("bloodGroup")} />
                                    </Field>
                                </div>
                                <Field label="Address" id="address" error={form.formState.errors.address?.message}>
                                    <Textarea id="address" {...form.register("address")} />
                                </Field>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Field label="City" id="city" error={form.formState.errors.city?.message}>
                                        <Input id="city" {...form.register("city")} />
                                    </Field>
                                    <Field label="State" id="state" error={form.formState.errors.state?.message}>
                                        <Input id="state" {...form.register("state")} />
                                    </Field>
                                    <Field
                                        label="Postal Code"
                                        id="postalCode"
                                        error={form.formState.errors.postalCode?.message}
                                    >
                                        <Input id="postalCode" {...form.register("postalCode")} />
                                    </Field>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field
                                        label="Emergency Contact Name"
                                        id="emergencyContactName"
                                        error={form.formState.errors.emergencyContactName?.message}
                                    >
                                        <Input id="emergencyContactName" {...form.register("emergencyContactName")} />
                                    </Field>
                                    <Field
                                        label="Emergency Contact Phone"
                                        id="emergencyContactPhone"
                                        error={form.formState.errors.emergencyContactPhone?.message}
                                    >
                                        <Input id="emergencyContactPhone" {...form.register("emergencyContactPhone")} />
                                    </Field>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field
                                        label="Parent Name"
                                        id="parentName"
                                        error={form.formState.errors.parentName?.message}
                                    >
                                        <Input id="parentName" {...form.register("parentName")} />
                                    </Field>
                                    <Field
                                        label="Parent Phone"
                                        id="parentPhone"
                                        error={form.formState.errors.parentPhone?.message}
                                    >
                                        <Input id="parentPhone" {...form.register("parentPhone")} />
                                    </Field>
                                </div>

                                <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-4">
                                    <Button disabled={isPending} size="lg" type="submit">
                                        {isPending ? <Spinner /> : null}
                                        Save Student Profile
                                    </Button>
                                    <Button asChild size="lg" variant="secondary">
                                        <a href="/api/student/resume">Download Resume PDF</a>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
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

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function ReadOnlyLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            <p className="text-sm font-semibold text-zinc-900">{value}</p>
        </div>
    );
}
