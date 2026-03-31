"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StudentWorkspace = {
    user: {
        name: string;
        email: string;
        photoURL?: string;
        phone?: string;
        accountStatus: string;
        lastLoginAt?: string;
    };
    student: {
        enrollmentNo: string;
        firstName?: string;
        lastName?: string;
        admissionYear: number;
        status: string;
        gender?: string;
        dob?: string;
        mobile?: string;
        address?: string;
    };
    institution?: {
        name?: string;
    };
    department?: {
        name?: string;
    };
    program?: {
        name?: string;
        durationYears?: number;
        degreeType?: string;
    };
};

export function StudentRecordOverview({ workspace }: { workspace: StudentWorkspace }) {
    const { user, student, institution, department, program } = workspace;

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">{user.name}</CardTitle>
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
                    <CardDescription>
                        This institutional student record is provisioned and managed centrally for accreditation workflows.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoItem label="Enrollment No." value={student.enrollmentNo} />
                    <InfoItem label="Institution Email" value={user.email} />
                    <InfoItem label="Mobile" value={student.mobile ?? user.phone ?? "-"} />
                    <InfoItem
                        label="Last Login"
                        value={
                            user.lastLoginAt
                                ? new Intl.DateTimeFormat("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  }).format(new Date(user.lastLoginAt))
                                : "First-time access"
                        }
                    />
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Academic Mapping</CardTitle>
                        <CardDescription>
                            System-assigned academic placement used across AQAR, NAAC, and NIRF reporting.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <InfoItem label="University" value={institution?.name ?? "-"} />
                        <InfoItem label="Department" value={department?.name ?? "-"} />
                        <InfoItem label="Program" value={program?.name ?? "-"} />
                        <InfoItem label="Degree Type" value={program?.degreeType ?? "-"} />
                        <InfoItem label="Program Duration" value={program?.durationYears ? `${program.durationYears} years` : "-"} />
                        <InfoItem label="Admission Year" value={String(student.admissionYear)} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Personal Details</CardTitle>
                        <CardDescription>
                            Student-managed profile details that support the institutional record.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <InfoItem label="First Name" value={student.firstName ?? "-"} />
                        <InfoItem label="Last Name" value={student.lastName ?? "-"} />
                        <InfoItem label="Gender" value={student.gender ?? "-"} />
                        <InfoItem label="Date of Birth" value={formatDate(student.dob)} />
                        <div className="sm:col-span-2">
                            <InfoItem label="Address" value={student.address ?? "-"} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Student Lifecycle</CardTitle>
                        <CardDescription>
                            Your activities, academic performance, research, documents, internships, and placement outcomes will be tracked by institutional workflows.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm leading-7 text-zinc-600">
                        <p>
                            Self-registration and self-profile approval are not used in this accreditation system. Your identity is provisioned by the institution, and your account is activated once through First Time Student Login Setup.
                        </p>
                        <p>
                            Academic records, events, skills, sports, social engagement, internships, placements, and evidence documents will be linked to this institutional student record over time.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(date);
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
