"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CasApp } from "@/components/cas/cas-types";

export function APIScoreCalculator({
    score,
    eligibility,
    breakup,
}: {
    score: { teachingLearning: number; researchPublication: number; academicContribution: number; totalScore: number };
    eligibility: { isEligible: boolean; message?: string; minimumExperienceYears?: number; minimumApiScore?: number };
    breakup?: CasApp["apiBreakup"];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>API Score Calculator</CardTitle>
                <CardDescription>Authoritative CAS scoring comes from the saved server-side PBAS and achievement mapping.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Teaching Learning" value={score.teachingLearning} />
                <StatTile label="Research Publications" value={score.researchPublication} />
                <StatTile label="Academic Contribution" value={score.academicContribution} />
                <StatTile label="Total API Score" value={score.totalScore} />
                <div className={`md:col-span-2 xl:col-span-4 rounded-lg border p-4 ${eligibility.isEligible ? "border-success-border bg-success-muted text-success-muted-foreground" : "border-warning-border bg-warning-muted text-warning-muted-foreground"}`}>
                    <p className="text-sm font-semibold">{eligibility.isEligible ? "Eligible" : "Not Eligible"}</p>
                    <p className="mt-1 text-sm">{eligibility.message ?? "Eligibility is being recalculated from the saved CAS record."}</p>
                </div>
                {breakup?.length ? (
                    <div className="md:col-span-2 xl:col-span-4 rounded-lg border border-border bg-muted/50">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Obtained</TableHead>
                                    <TableHead>Minimum</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {breakup.map((entry) => (
                                    <TableRow key={entry._id ?? entry.categoryCode}>
                                        <TableCell className="font-medium text-foreground">{entry.categoryCode}</TableCell>
                                        <TableCell>{entry.scoreObtained}</TableCell>
                                        <TableCell>{entry.minimumRequired}</TableCell>
                                        <TableCell>
                                            <Badge variant={entry.eligible ? "default" : "secondary"}>
                                                {entry.eligible ? "Met" : "Pending"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
