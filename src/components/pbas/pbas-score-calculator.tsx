import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import type { PbasApp } from "@/components/pbas/pbas-types";

export function PBASScoreCalculator({ score }: { score: PbasApp["apiScore"] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>API Score Calculator</CardTitle>
                <CardDescription>
                    PBAS API score is calculated from faculty records and captured on save or submit.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Teaching" value={score.teachingActivities} />
                <StatTile label="Research" value={score.researchAcademicContribution} />
                <StatTile label="Institutional" value={score.institutionalResponsibilities} />
                <StatTile label="Total API" value={score.totalScore} />
            </CardContent>
        </Card>
    );
}
