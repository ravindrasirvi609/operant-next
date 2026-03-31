"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { z } from "zod";

import { FieldError, FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { ProfilePhotoUpload } from "@/components/faculty/profile-photo-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { studentProfileSchema } from "@/lib/student/validators";

type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;

type StudentProfileEditorUser = {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
    accountStatus: string;
};

type StudentProfileEditorStudent = {
    enrollmentNo: string;
    firstName: string;
    lastName?: string;
    gender?: "Male" | "Female" | "Other";
    dob?: string;
    mobile?: string;
    address?: string;
    status: string;
    admissionYear: number;
};

export function StudentProfileForm({
    user,
    student,
    institutionName,
    departmentName,
    programName,
}: {
    user: StudentProfileEditorUser;
    student: StudentProfileEditorStudent;
    institutionName?: string;
    departmentName?: string;
    programName?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const form = useForm<StudentProfileFormValues>({
        resolver: zodResolver(studentProfileSchema),
        defaultValues: {
            firstName: student.firstName ?? "",
            lastName: student.lastName ?? "",
            gender: student.gender,
            dob: toDateInputValue(student.dob),
            mobile: student.mobile ?? "",
            address: student.address ?? "",
        },
    });

    function onSubmit(values: StudentProfileFormValues) {
        setMessage(null);

        startTransition(async () => {
            try {
                const response = await fetch("/api/student/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                });

                const data = (await response.json()) as {
                    message?: string;
                    profile?: StudentProfileFormValues;
                };

                if (!response.ok) {
                    throw new Error(data.message ?? "Unable to update student profile.");
                }

                form.reset({
                    firstName: data.profile?.firstName ?? values.firstName,
                    lastName: data.profile?.lastName ?? values.lastName ?? "",
                    gender: data.profile?.gender,
                    dob: data.profile?.dob ?? values.dob ?? "",
                    mobile: data.profile?.mobile ?? values.mobile ?? "",
                    address: data.profile?.address ?? values.address ?? "",
                });
                setMessage({
                    type: "success",
                    text: data.message ?? "Student profile updated successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Unable to update student profile.",
                });
            }
        });
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardContent className="flex flex-col items-center gap-4 p-5">
                    <ProfilePhotoUpload
                        userId={user.id}
                        currentPhotoURL={user.photoURL}
                        endpoint="/api/student/photo"
                    />
                    <div className="space-y-2 text-center">
                        <p className="text-lg font-semibold text-zinc-950">{user.name}</p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <Badge variant="secondary">Student</Badge>
                            <Badge>{student.status}</Badge>
                            <Badge
                                className={
                                    user.accountStatus === "Active"
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                }
                            >
                                {user.accountStatus}
                            </Badge>
                        </div>
                        <p className="text-sm leading-6 text-zinc-500">
                            Upload the profile image here. Academic mapping stays institution-controlled.
                        </p>
                    </div>

                    <div className="grid w-full gap-3 pt-2">
                        <StaticInfo label="Enrollment No." value={student.enrollmentNo} />
                        <StaticInfo label="Institution Email" value={user.email} />
                        <StaticInfo label="Institution" value={institutionName ?? "-"} />
                        <StaticInfo label="Department" value={departmentName ?? "-"} />
                        <StaticInfo label="Program" value={programName ?? "-"} />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                        Students can update their photo, name, gender, date of birth, mobile number, and address from this profile page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {message ? <FormMessage message={message.text} type={message.type} /> : null}

                    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField label="First Name" id="student-first-name" error={form.formState.errors.firstName?.message}>
                                <Input id="student-first-name" {...form.register("firstName")} />
                            </FormField>

                            <FormField label="Last Name" id="student-last-name" error={form.formState.errors.lastName?.message}>
                                <Input id="student-last-name" {...form.register("lastName")} />
                            </FormField>

                            <FormField label="Gender" id="student-gender" error={form.formState.errors.gender?.message}>
                                <Controller
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value ?? "__none__"}
                                            onValueChange={(value) =>
                                                field.onChange(value === "__none__" ? undefined : value)
                                            }
                                        >
                                            <SelectTrigger id="student-gender" className="w-full">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">Prefer not to say</SelectItem>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </FormField>

                            <FormField label="Date of Birth" id="student-dob" error={form.formState.errors.dob?.message}>
                                <Input id="student-dob" type="date" {...form.register("dob")} />
                            </FormField>

                            <FormField label="Mobile Number" id="student-mobile" error={form.formState.errors.mobile?.message}>
                                <Input id="student-mobile" inputMode="tel" {...form.register("mobile")} />
                            </FormField>

                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Admission Year
                                </p>
                                <p className="mt-2 text-lg font-semibold text-zinc-950">
                                    {student.admissionYear}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Managed centrally with your academic mapping.
                                </p>
                            </div>
                        </div>

                        <FormField label="Address" id="student-address" error={form.formState.errors.address?.message}>
                            <Textarea
                                id="student-address"
                                rows={5}
                                placeholder="Enter your current address"
                                {...form.register("address")}
                            />
                        </FormField>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Spinner /> : null}
                                Save Basic Information
                            </Button>
                            <p className="text-sm text-zinc-500">
                                Institution email, department, program, and enrollment mapping remain read-only.
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function FormField({
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

function StaticInfo({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function toDateInputValue(value?: string) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}
