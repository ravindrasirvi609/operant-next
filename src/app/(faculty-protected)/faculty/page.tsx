import Link from "next/link";
import {
    ArrowRight,
    Award,
    BarChart3,
    BookOpen,
    Calculator,
    CircleCheck,
    FileSearch,
    FlaskConical,
    GraduationCap,
    IdCard,
    LayoutDashboard,
    ScrollText,
    TriangleAlert,
    UserRound,
    type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyWorkspace } from "@/lib/faculty/service";
import { getFacultyAqarApplications } from "@/lib/aqar/service";
import { getFacultyCasApplications } from "@/lib/cas/service";
import { getFacultyPbasApplications } from "@/lib/pbas/service";
import type { Tone } from "@/lib/ui/tone";

function pendingCount(statuses: string[]) {
    return statuses.filter((status) =>
        ["Draft", "Rejected", "Submitted", "Under Review", "Committee Review"].includes(status)
    ).length;
}

export default async function FacultyHomePage() {
    const faculty = await requireFaculty();
    const [workspace, pbasApplications, casApplications, aqarApplications] = await Promise.all([
        getFacultyWorkspace(faculty.id),
        getFacultyPbasApplications({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
        getFacultyCasApplications({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
        getFacultyAqarApplications({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
    ]);

    const profile = workspace.facultyRecord;

    const metrics: Array<{
        label: string;
        value: number;
        helper: string;
        icon: LucideIcon;
        tone: Tone;
    }> = [
        {
            label: "Teaching loads",
            value: profile.teachingLoads.length,
            helper: "Mapped courses",
            icon: GraduationCap,
            tone: "accent",
        },
        {
            label: "Research outputs",
            value: profile.publications.length + profile.books.length + profile.patents.length,
            helper: "Publications, books, and patents",
            icon: FlaskConical,
            tone: "accent",
        },
        {
            label: "Projects",
            value: profile.researchProjects.length,
            helper: "Research pipeline",
            icon: BookOpen,
            tone: "accent",
        },
        {
            label: "PBAS reports",
            value: pbasApplications.length,
            helper: "Annual appraisals",
            icon: ScrollText,
            tone: "info",
        },
        {
            label: "CAS applications",
            value: casApplications.length,
            helper: "Promotion workflow",
            icon: Calculator,
            tone: "info",
        },
        {
            label: "AQAR drafts",
            value: aqarApplications.length,
            helper: "Quality contributions",
            icon: BarChart3,
            tone: "info",
        },
    ];

    const complianceItems: Array<{ title: string; detail: string; href: string; icon: LucideIcon }> = [
        {
            title: "PBAS readiness",
            detail:
                pbasApplications.length > 0
                    ? `${pendingCount(pbasApplications.map((item) => item.status))} active PBAS workflow item(s)`
                    : "No PBAS draft created yet",
            href: "/faculty/pbas",
            icon: ScrollText,
        },
        {
            title: "CAS readiness",
            detail:
                casApplications.length > 0
                    ? `${pendingCount(casApplications.map((item) => item.status))} active CAS workflow item(s)`
                    : "No CAS application created yet",
            href: "/faculty/cas",
            icon: Calculator,
        },
        {
            title: "AQAR readiness",
            detail:
                aqarApplications.length > 0
                    ? `${pendingCount(aqarApplications.map((item) => item.status))} active AQAR workflow item(s)`
                    : "No AQAR draft created yet",
            href: "/faculty/aqar",
            icon: BarChart3,
        },
        {
            title: "Faculty data completeness",
            detail: `${
                profile.publications.length +
                profile.researchProjects.length +
                profile.eventParticipations.length
            } academic record(s) available`,
            href: "/faculty/profile",
            icon: UserRound,
        },
        {
            title: "SSR contribution desk",
            detail: "Respond to the SSR metrics and narrative sections assigned to your faculty account.",
            href: "/faculty/ssr",
            icon: FileSearch,
        },
        {
            title: "Teaching learning file",
            detail:
                "Maintain governed course-delivery plans, lesson execution, assessment, and learner-support evidence.",
            href: "/faculty/teaching-learning",
            icon: GraduationCap,
        },
        {
            title: "Research and innovation desk",
            detail:
                "Respond to governed research portfolio assignments with linked publications, projects, patents, and innovation evidence.",
            href: "/faculty/research-innovation",
            icon: FlaskConical,
        },
    ];

    const alertItems = [
        !profile.employeeCode ? "Employee code is missing from the faculty profile." : null,
        !profile.highestQualification ? "Highest qualification is not filled yet." : null,
        !profile.teachingLoads.length ? "Teaching contribution entries are still empty." : null,
        !profile.publications.length && !profile.researchProjects.length
            ? "Research and publication records are still empty."
            : null,
    ].filter(Boolean) as string[];

    return (
        <div className="space-y-6">
            <PageHeader
                icon={LayoutDashboard}
                eyebrow="Faculty Dashboard"
                title={`Welcome back, ${faculty.name}`}
                description="Your institutional faculty identity, category-wise academic records, and accreditation workflows in one connected workspace."
                meta={
                    <>
                        <Badge variant="secondary">{faculty.department ?? "Department"}</Badge>
                        <Badge variant="outline" className="gap-1">
                            <Award aria-hidden />
                            {faculty.designation ?? "Faculty"}
                        </Badge>
                    </>
                }
                actions={
                    <>
                        <Button asChild>
                            <Link href="/faculty/profile" prefetch={false}>
                                <UserRound aria-hidden />
                                Faculty Workspace
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/faculty/pbas" prefetch={false}>
                                <ScrollText aria-hidden />
                                PBAS
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/faculty/ssr" prefetch={false}>
                                <FileSearch aria-hidden />
                                SSR
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/faculty/teaching-learning" prefetch={false}>
                                <GraduationCap aria-hidden />
                                Teaching
                            </Link>
                        </Button>
                    </>
                }
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map((item) => (
                    <StatCard
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        value={item.value}
                        helper={item.helper}
                        tone={item.tone}
                    />
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CircleCheck className="size-4 text-muted-foreground" aria-hidden />
                            Compliance Snapshot
                        </CardTitle>
                        <CardDescription>
                            Current workflow and source-record status across PBAS, CAS, and AQAR.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                        {complianceItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    prefetch={false}
                                    className="group flex items-start gap-3 rounded-lg border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-accent"
                                >
                                    <Icon
                                        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                                        aria-hidden
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground">
                                            {item.title}
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                            {item.detail}
                                        </span>
                                    </span>
                                    <ArrowRight
                                        className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                        aria-hidden
                                    />
                                </Link>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TriangleAlert className="size-4 text-muted-foreground" aria-hidden />
                            Profile and Data Alerts
                        </CardTitle>
                        <CardDescription>
                            Missing items that can block or weaken downstream accreditation workflows.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {alertItems.length ? (
                            alertItems.map((item) => (
                                <InlineAlert key={item} tone="warning">
                                    {item}
                                </InlineAlert>
                            ))
                        ) : (
                            <InlineAlert tone="success">
                                Faculty profile and category-wise academic records are available for current
                                workflows.
                            </InlineAlert>
                        )}
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <IdCard className="size-4 text-muted-foreground" aria-hidden />
                                Institutional Identity
                            </p>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Employee Code: {profile.employeeCode || "Not set"} · Qualification:{" "}
                                {profile.highestQualification || "Not set"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground tabular-nums">
                                Teaching records: {profile.teachingLoads.length} · Publications:{" "}
                                {profile.publications.length} · Administrative roles:{" "}
                                {profile.administrativeRoles.length}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
