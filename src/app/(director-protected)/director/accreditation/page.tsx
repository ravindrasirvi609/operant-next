import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireDirector } from "@/lib/auth/user";
import { getAccreditationLeadershipDashboard } from "@/lib/accreditation/service";

export default async function DirectorAccreditationPage() {
    const director = await requireDirector();
    const dashboard = await getAccreditationLeadershipDashboard({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    });

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <Badge>Leadership accreditation</Badge>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                            Source-module visibility for accreditation operations
                        </h1>
                        <p className="mt-4 text-base leading-8 text-zinc-500">
                            Review SSS, AISHE, NIRF, and compliance records that feed the NAAC warehouse, filtered by your active leadership scope where institutional or departmental mapping exists.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/api/director/reports?type=accreditation-sss">Export SSS CSV</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/api/director/reports?type=accreditation-aishe">Export AISHE CSV</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/api/director/reports?type=accreditation-nirf">Export NIRF CSV</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/api/director/reports?type=accreditation-compliance">Export Compliance CSV</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-5">
                <MetricCard label="SSS cycles" value={dashboard.summary.sssSurveyCount} />
                <MetricCard label="AISHE cycles" value={dashboard.summary.aisheCycleCount} />
                <MetricCard label="NIRF cycles" value={dashboard.summary.nirfCycleCount} />
                <MetricCard label="Active approvals" value={dashboard.summary.activeApprovalCount} />
                <MetricCard label="Open actions" value={dashboard.summary.openComplianceActions} />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>SSS overview</CardTitle>
                        <CardDescription>Survey analytics inside your authorized institutional span.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Survey</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Satisfaction</TableHead>
                                    <TableHead>Response</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dashboard.sssSurveys.map((survey) => (
                                    <TableRow key={String(survey._id)}>
                                        <TableCell>{survey.surveyTitle}</TableCell>
                                        <TableCell>{survey.surveyStatus}</TableCell>
                                        <TableCell>{survey.analytics?.overallSatisfactionIndex ?? 0}%</TableCell>
                                        <TableCell>{survey.analytics?.responseRate ?? 0}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>AISHE overview</CardTitle>
                        <CardDescription>Cycle-level visibility for submitted or prepared AISHE snapshots.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cycle</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Faculty</TableHead>
                                    <TableHead>NAAC grade</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dashboard.aisheCycles.map((cycle) => (
                                    <TableRow key={String(cycle._id)}>
                                        <TableCell>{cycle.surveyYearLabel}</TableCell>
                                        <TableCell>{cycle.submissionStatus}</TableCell>
                                        <TableCell>{cycle.facultyStrength}</TableCell>
                                        <TableCell>{cycle.institutionProfile?.naacGrade ?? "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>NIRF overview</CardTitle>
                        <CardDescription>Ranking cycle performance and composite score visibility.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Year</TableHead>
                                    <TableHead>Framework</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Composite</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dashboard.nirfCycles.map((cycle) => (
                                    <TableRow key={String(cycle._id)}>
                                        <TableCell>{cycle.rankingYear}</TableCell>
                                        <TableCell>{cycle.frameworkType}</TableCell>
                                        <TableCell>{cycle.status}</TableCell>
                                        <TableCell>
                                            {cycle.compositeScore
                                                ? `${cycle.compositeScore.totalScore ?? 0} / rank ${cycle.compositeScore.predictedRank ?? "-"}`
                                                : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Compliance overview</CardTitle>
                        <CardDescription>Approvals, inspections, and action closure activity in scope.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Inspection</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dashboard.compliance.inspections.map((inspection) => (
                                    <TableRow key={String(inspection._id)}>
                                        <TableCell>{inspection.inspectionType}</TableCell>
                                        <TableCell>{inspection.status}</TableCell>
                                        <TableCell>
                                            {inspection.visitDate
                                                ? new Date(inspection.visitDate).toLocaleDateString()
                                                : "-"}
                                        </TableCell>
                                        <TableCell>{inspection.actionCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-lg">{value}</CardTitle>
            </CardHeader>
        </Card>
    );
}
