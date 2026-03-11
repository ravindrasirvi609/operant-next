import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireFaculty } from "@/lib/auth/user";

const snapshotStats = [
    { label: "Courses", value: "3", helper: "Spring 2026" },
    { label: "Advisees", value: "18", helper: "Active" },
    { label: "Publications", value: "12", helper: "Last 3 yrs" },
    { label: "Reviews", value: "2", helper: "Pending" },
    { label: "Grants", value: "4", helper: "Ongoing" },
    { label: "Events", value: "6", helper: "This term" },
];

const todaySchedule = [
    { time: "09:30", title: "B.Tech AI Ethics", location: "Room B-204" },
    { time: "11:00", title: "Department Council", location: "Meeting Room 3" },
    { time: "14:00", title: "Research Lab Hours", location: "Lab 2" },
];

const weekFocus = [
    { title: "Submit PBAS evidence", detail: "3 items awaiting upload" },
    { title: "CAS documentation", detail: "Update Section II" },
    { title: "Mentor check-ins", detail: "4 advisees scheduled" },
];

const announcements = [
    { title: "NAAC data freeze", detail: "AQAR submissions close on March 28." },
    { title: "Library workshop", detail: "Scopus + Web of Science session on March 15." },
    { title: "R&D seed grants", detail: "Proposals due April 4." },
];

const complianceSteps = [
    { title: "PBAS data entry", detail: "70% complete", status: "In progress" },
    { title: "Evidence upload", detail: "12 files pending", status: "Action needed" },
    { title: "AQAR narrative", detail: "Draft saved", status: "On track" },
];

const researchHighlights = [
    { title: "AI for Social Impact", detail: "Paper accepted at ICSR 2025" },
    { title: "Smart Campus Grant", detail: "INR 12L seed funding approved" },
    { title: "Industry MoU", detail: "3 internship slots finalized" },
];

export default async function FacultyHomePage() {
    const faculty = await requireFaculty();

    return (
        <main>
            <section className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-100 p-8 shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline">Faculty Home</Badge>
                            <Badge variant="secondary">{faculty.department ?? "Department"}</Badge>
                            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">2025-26</Badge>
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold text-zinc-900 sm:text-4xl">
                            Welcome back, {faculty.name}.
                        </h1>
                        <p className="mt-3 text-base text-zinc-600">
                            Your academic workspace is up to date. Track teaching, research, and compliance in one place.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button asChild>
                                <Link href="/faculty/pbas">Open PBAS Dashboard</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/faculty/evidence">Upload Evidence</Link>
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href="/faculty/profile">Edit Profile</Link>
                            </Button>
                        </div>
                        <Separator className="my-6" />
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {snapshotStats.map((stat) => (
                                <Card key={stat.label} className="border-zinc-200/80">
                                    <CardHeader className="pb-2">
                                        <CardDescription>{stat.label}</CardDescription>
                                        <CardTitle className="text-3xl">{stat.value}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-zinc-500">{stat.helper}</CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle>Profile Snapshot</CardTitle>
                            <CardDescription>Last updated 2 days ago</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-zinc-600">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Role</p>
                                <p className="font-medium text-zinc-900">{faculty.role ?? "Faculty"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Department</p>
                                <p className="font-medium text-zinc-900">{faculty.department ?? "Department"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Coordinator</p>
                                <p className="font-medium text-zinc-900">Dr. Ananya Rao</p>
                            </div>
                            <Separator />
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">NAAC Ready</Badge>
                                <Badge variant="secondary">CAS Cycle 3</Badge>
                                <Badge variant="secondary">Research Active</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle>Today at a Glance</CardTitle>
                            <CardDescription>Wednesday workload</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {todaySchedule.map((item) => (
                                <div key={item.title} className="flex items-start gap-3">
                                    <div className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">
                                        {item.time}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                                        <p className="text-xs text-zinc-500">{item.location}</p>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/faculty/profile">View full timetable</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle>Faculty Workspace</CardTitle>
                            <CardDescription>Focus, compliance, and resources</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="focus" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="focus">Focus</TabsTrigger>
                                    <TabsTrigger value="updates">Updates</TabsTrigger>
                                    <TabsTrigger value="resources">Resources</TabsTrigger>
                                </TabsList>
                                <TabsContent value="focus" className="mt-4 space-y-3">
                                    {weekFocus.map((item) => (
                                        <div key={item.title} className="rounded-xl border border-zinc-200 p-4">
                                            <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                                            <p className="text-xs text-zinc-500">{item.detail}</p>
                                        </div>
                                    ))}
                                </TabsContent>
                                <TabsContent value="updates" className="mt-4 space-y-3">
                                    {announcements.map((item) => (
                                        <div key={item.title} className="rounded-xl border border-zinc-200 p-4">
                                            <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                                            <p className="text-xs text-zinc-500">{item.detail}</p>
                                        </div>
                                    ))}
                                </TabsContent>
                                <TabsContent value="resources" className="mt-4 space-y-3">
                                    <div className="rounded-xl border border-zinc-200 p-4">
                                        <p className="text-sm font-medium text-zinc-900">Templates</p>
                                        <p className="text-xs text-zinc-500">PBAS, AQAR, CAS ready-to-fill formats.</p>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 p-4">
                                        <p className="text-sm font-medium text-zinc-900">Evidence Checklist</p>
                                        <p className="text-xs text-zinc-500">Track publications, grants, events.</p>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 p-4">
                                        <p className="text-sm font-medium text-zinc-900">Policy Updates</p>
                                        <p className="text-xs text-zinc-500">Latest NAAC and UGC guidelines.</p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </section>
            <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle>Compliance Timeline</CardTitle>
                            <CardDescription>Track submission readiness</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {complianceSteps.map((step) => (
                                <div key={step.title} className="rounded-xl border border-zinc-200 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-zinc-900">{step.title}</p>
                                        <Badge variant="outline">{step.status}</Badge>
                                    </div>
                                    <p className="text-xs text-zinc-500">{step.detail}</p>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/faculty/aqar">Open compliance hub</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle>Research & Outreach</CardTitle>
                            <CardDescription>Highlights from this term</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {researchHighlights.map((item) => (
                                <div key={item.title} className="rounded-xl border border-zinc-200 p-4">
                                    <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                                    <p className="text-xs text-zinc-500">{item.detail}</p>
                                </div>
                            ))}
                            <div className="flex flex-wrap gap-3">
                                <Button variant="outline" asChild>
                                    <Link href="/faculty/evidence">Log output</Link>
                                </Button>
                                <Button variant="ghost" asChild>
                                    <Link href="/faculty/pbas">View analytics</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    );
}
