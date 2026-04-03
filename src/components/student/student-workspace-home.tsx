import type { ComponentType } from "react";
import Link from "next/link";
import {
    Activity,
    ArrowRight,
    BadgeCheck,
    BookOpen,
    BriefcaseBusiness,
    Clock3,
    GraduationCap,
    Medal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type StudentWorkspace = {
    user: {
        name: string;
        email: string;
        accountStatus: string;
        lastLoginAt?: string;
    };
    student: {
        enrollmentNo: string;
        admissionYear: number;
        status: string;
    };
    institution?: {
        name?: string;
    };
    department?: {
        name?: string;
    };
    program?: {
        name?: string;
        degreeType?: string;
        durationYears?: number;
    };
};

type StudentRecordCounts = {
    academics: number;
    publications: number;
    research: number;
    awards: number;
    skills: number;
    sports: number;
    cultural: number;
    events: number;
    social: number;
    placements: number;
    internships: number;
    total: number;
};

function formatLastLogin(value?: string) {
    if (!value) {
        return "First-time access";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "First-time access";
    }

    return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function StudentWorkspaceHome({
    workspace,
    recordCounts,
}: {
    workspace: StudentWorkspace;
    recordCounts: StudentRecordCounts;
}) {
    const achievements =
        recordCounts.publications +
        recordCounts.research +
        recordCounts.awards +
        recordCounts.skills;
    const engagements =
        recordCounts.sports +
        recordCounts.cultural +
        recordCounts.events +
        recordCounts.social;
    const careerOutcomes = recordCounts.placements + recordCounts.internships;

    const summaryCards = [
        {
            label: "Academic records",
            value: recordCounts.academics,
            description: "Semester-wise progression entries",
            icon: GraduationCap,
        },
        {
            label: "Achievements",
            value: achievements,
            description: "Publications, research, awards, and skills",
            icon: Medal,
        },
        {
            label: "Engagement",
            value: engagements,
            description: "Sports, events, cultural, and social activity",
            icon: Activity,
        },
        {
            label: "Career outcomes",
            value: careerOutcomes,
            description: "Internships and placement updates",
            icon: BriefcaseBusiness,
        },
    ] as const;

    const quickRoutes = [
        {
            title: "Continue academic updates",
            description: "Open semester performance, SGPA, CGPA, and result records.",
            href: "/student/records?tab=academics",
        },
        {
            title: "Track achievements",
            description: "Maintain publications, research, awards, and skill certifications.",
            href: "/student/records?tab=publications",
        },
        {
            title: "Manage outcomes",
            description: "Review internships, placements, and supporting evidence.",
            href: "/student/records?tab=placements",
        },
        {
            title: "Respond to SSR asks",
            description: "Complete the SSR sections and metrics assigned to your student account.",
            href: "/student/ssr",
        },
        {
            title: "Review profile mapping",
            description: "Check program, department, and institutional identity details.",
            href: "/student/profile",
        },
    ] as const;

    const coverageRows = [
        { label: "Publications", value: recordCounts.publications },
        { label: "Research", value: recordCounts.research },
        { label: "Awards", value: recordCounts.awards },
        { label: "Skills", value: recordCounts.skills },
        { label: "Sports", value: recordCounts.sports },
        { label: "Cultural", value: recordCounts.cultural },
        { label: "Events", value: recordCounts.events },
        { label: "Social", value: recordCounts.social },
        { label: "Placements", value: recordCounts.placements },
        { label: "Internships", value: recordCounts.internships },
    ] as const;

    return (
        <div className="space-y-6">
            <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_420px]">
                <Card className="relative overflow-hidden border-white/80 bg-white/85 shadow-sm backdrop-blur">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-14 top-8 h-40 w-40 rounded-full bg-sky-100/70 blur-3xl" />
                        <div className="absolute right-4 top-0 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />
                    </div>
                    <CardHeader className="relative space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">Student Dashboard</Badge>
                            <Badge>{workspace.student.status}</Badge>
                            <Badge variant="secondary">{recordCounts.total} tracked records</Badge>
                            <Badge
                                className={
                                    workspace.user.accountStatus === "Active"
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                }
                            >
                                {workspace.user.accountStatus}
                            </Badge>
                        </div>
                        <div className="space-y-3">
                            <CardTitle className="text-3xl tracking-tight text-zinc-950 sm:text-4xl">
                                {workspace.user.name}
                            </CardTitle>
                            <CardDescription className="max-w-3xl text-base leading-7 text-zinc-600">
                                Your accreditation workspace is now organized into routed student pages, so you can move between identity details and records entry comfortably on both desktop and mobile.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild>
                                <Link href="/student/records">
                                    Open records workspace
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/student/profile">Review profile mapping</Link>
                            </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {summaryCards.map((card) => {
                                const Icon = card.icon;

                                return (
                                    <div
                                        key={card.label}
                                        className="rounded-[1.5rem] border border-zinc-200 bg-white/90 p-4 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                                {card.label}
                                            </p>
                                            <Icon className="size-4 text-zinc-500" />
                                        </div>
                                        <p className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
                                            {card.value}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                                            {card.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white/80 bg-white/85 shadow-sm backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-xl">Academic identity</CardTitle>
                        <CardDescription>
                            Centrally provisioned details used throughout the student workflow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <InfoRow label="Enrollment No." value={workspace.student.enrollmentNo} />
                        <InfoRow label="Institution Email" value={workspace.user.email} />
                        <InfoRow label="Institution" value={workspace.institution?.name ?? "-"} />
                        <InfoRow label="Department" value={workspace.department?.name ?? "-"} />
                        <InfoRow label="Program" value={workspace.program?.name ?? "-"} />
                        <InfoRow label="Degree Type" value={workspace.program?.degreeType ?? "-"} />
                        <InfoRow label="Admission Year" value={String(workspace.student.admissionYear)} />
                        <InfoRow label="Last Login" value={formatLastLogin(workspace.user.lastLoginAt)} />
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card className="border-white/80 bg-white/85 shadow-sm backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-xl">Quick routes</CardTitle>
                        <CardDescription>
                            Jump straight into the part of the student workflow you want to update next.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 lg:grid-cols-2">
                        {quickRoutes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 transition hover:border-zinc-300 hover:bg-white"
                            >
                                <p className="font-semibold text-zinc-950">{route.title}</p>
                                <p className="mt-2 text-sm leading-6 text-zinc-600">{route.description}</p>
                                <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-950">
                                    Open
                                    <ArrowRight className="size-4" />
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-white/80 bg-white/85 shadow-sm backdrop-blur">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100">
                                <BadgeCheck className="size-5 text-zinc-700" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Record coverage</CardTitle>
                                <CardDescription>
                                    A fast snapshot of what is already captured in the student system.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {coverageRows.map((row) => (
                                <div
                                    key={row.label}
                                    className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                        {row.label}
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                                        {row.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
                                    <Clock3 className="size-4 text-zinc-700" />
                                </div>
                                <div>
                                    <p className="font-semibold text-zinc-950">What this workspace is for</p>
                                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                                        The student portal tracks progression, achievements, engagement, and career outcomes in one place so your institutional data stays ready for review and reporting.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                <HighlightCard
                    title="Academic performance"
                    value={recordCounts.academics}
                    description="Semester entries currently stored"
                    icon={BookOpen}
                />
                <HighlightCard
                    title="Achievement portfolio"
                    value={achievements}
                    description="Research, awards, publications, and skills"
                    icon={Medal}
                />
                <HighlightCard
                    title="Placement readiness"
                    value={careerOutcomes}
                    description="Placement and internship outcomes tracked"
                    icon={BriefcaseBusiness}
                />
            </section>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function HighlightCard({
    title,
    value,
    description,
    icon: Icon,
}: {
    title: string;
    value: number;
    description: string;
    icon: ComponentType<{ className?: string }>;
}) {
    return (
        <Card className="border-white/80 bg-white/85 shadow-sm backdrop-blur">
            <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-zinc-100">
                    <Icon className="size-5 text-zinc-700" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-zinc-950">{title}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
                    <p className="mt-1 text-sm text-zinc-500">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
