import { InstitutionalValuesBestPracticesContributorWorkspace } from "@/components/institutional-values-best-practices/institutional-values-best-practices-contributor-workspace";
import { InstitutionalValuesBestPracticesReviewBoard } from "@/components/institutional-values-best-practices/institutional-values-best-practices-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import {
    getInstitutionalValuesBestPracticesContributorWorkspace,
    getInstitutionalValuesBestPracticesReviewWorkspace,
} from "@/lib/institutional-values-best-practices/service";

export default async function DirectorInstitutionalValuesBestPracticesPage() {
    const director = await requireDirector();
    const actor = {
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    };
    const [contributorWorkspace, reviewWorkspace] = await Promise.all([
        getInstitutionalValuesBestPracticesContributorWorkspace(actor),
        getInstitutionalValuesBestPracticesReviewWorkspace(actor),
    ]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Assigned contributor workspace</CardTitle>
                    <CardDescription>
                        Complete the institutional values, best-practices, outreach, ethics, and sustainability portfolios that are directly assigned to your account, then submit them into workflow.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InstitutionalValuesBestPracticesContributorWorkspace
                        actorLabel="Leadership"
                        assignments={JSON.parse(JSON.stringify(contributorWorkspace.assignments)) as never}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Institutional Values & Best Practices Review Workspace</CardTitle>
                    <CardDescription>
                        Browse scoped Criteria 7 records inside your active governance span. Review controls appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InstitutionalValuesBestPracticesReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
