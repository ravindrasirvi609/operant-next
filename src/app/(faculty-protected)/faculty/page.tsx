import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyWorkspace } from "@/lib/faculty/service";
import { getFacultyAqarApplications } from "@/lib/aqar/service";
import { getFacultyCasApplications } from "@/lib/cas/service";
import { getFacultyPbasApplications } from "@/lib/pbas/service";

function pendingCount(statuses: string[]) {
    return statuses.filter((status) => ["Draft", "Rejected", "Submitted", "Under Review", "Committee Review"].includes(status)).length;
}

export default async function FacultyHomePage() {
    const faculty = await requireFaculty();
    const [workspace, pbasApplications, casApplications, aqarApplications] =
        await Promise.all([
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
    const metrics = [
        { label: "Teaching loads", value: profile.teachingLoads.length, helper: "Mapped courses" },
        {
            label: "Research outputs",
            value: profile.publications.length + profile.books.length + profile.patents.length,
            helper: "Faculty records",
        },
        { label: "Projects", value: profile.researchProjects.length, helper: "Research pipeline" },
        { label: "PBAS reports", value: pbasApplications.length, helper: "Annual appraisals" },
        { label: "CAS applications", value: casApplications.length, helper: "Promotion workflow" },
        { label: "AQAR drafts", value: aqarApplications.length, helper: "Quality contributions" },
    ];

    const complianceItems = [
        {
            title: "PBAS readiness",
            detail:
                pbasApplications.length > 0
                    ? `${pendingCount(pbasApplications.map((item) => item.status))} active PBAS workflow item(s)`
                    : "No PBAS draft created yet",
            href: "/faculty/pbas",
        },
        {
            title: "CAS readiness",
            detail:
                casApplications.length > 0
                    ? `${pendingCount(casApplications.map((item) => item.status))} active CAS workflow item(s)`
                    : "No CAS application created yet",
            href: "/faculty/cas",
        },
        {
            title: "AQAR readiness",
            detail:
                aqarApplications.length > 0
                    ? `${pendingCount(aqarApplications.map((item) => item.status))} active AQAR workflow item(s)`
                    : "No AQAR draft created yet",
            href: "/faculty/aqar",
        },
        {
            title: "Faculty data completeness",
            detail: `${profile.publications.length + profile.researchProjects.length + profile.eventParticipations.length} academic record(s) available`,
            href: "/faculty/profile",
        },
        {
            title: "SSR contribution desk",
            detail: "Respond to the SSR metrics and narrative sections assigned to your faculty account.",
            href: "/faculty/ssr",
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
        <main className="min-h-screen bg-zinc-50">
            <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
                <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline">Faculty Dashboard</Badge>
                        <Badge variant="secondary">{faculty.department ?? "Department"}</Badge>
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                            {faculty.designation ?? "Faculty"}
                        </Badge>
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold text-zinc-900 sm:text-4xl">
                        Welcome back, {faculty.name}
                    </h1>
                    <p className="mt-3 max-w-3xl text-base text-zinc-600">
                        Your institutional faculty identity, category-wise academic records, and accreditation workflows now operate from one connected workspace.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/faculty/profile">Open Faculty Workspace</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/faculty/pbas">Open PBAS</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/faculty/ssr">Open SSR</Link>
                        </Button>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {metrics.map((item) => (
                        <Card key={item.label}>
                            <CardHeader className="pb-2">
                                <CardDescription>{item.label}</CardDescription>
                                <CardTitle className="text-3xl">{item.value}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-zinc-500">{item.helper}</CardContent>
                        </Card>
                    ))}
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compliance Snapshot</CardTitle>
                            <CardDescription>
                                Current workflow and source-record status across PBAS, CAS, and AQAR.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {complianceItems.map((item) => (
                                <div key={item.title} className="rounded-xl border border-zinc-200 p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-950">{item.title}</p>
                                            <p className="text-xs text-zinc-500">{item.detail}</p>
                                        </div>
                                        <Button asChild variant="outline">
                                            <Link href={item.href}>Open</Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Profile and Data Alerts</CardTitle>
                            <CardDescription>
                                Missing items that can block or weaken downstream accreditation workflows.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alertItems.length ? (
                                alertItems.map((item) => (
                                    <div key={item} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                        {item}
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                    Faculty profile and category-wise academic records are available for current workflows.
                                </div>
                            )}
                            <div className="rounded-xl border border-zinc-200 p-4">
                                <p className="text-sm font-semibold text-zinc-950">Institutional Identity</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    Employee Code: {profile.employeeCode || "Not set"} · Qualification: {profile.highestQualification || "Not set"}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    Teaching records: {profile.teachingLoads.length} · Publications: {profile.publications.length} · Administrative roles: {profile.administrativeRoles.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}
