import { GovernanceLeadershipIqacContributorWorkspace } from "@/components/governance-leadership-iqac/governance-leadership-iqac-contributor-workspace";
import { GovernanceLeadershipIqacReviewBoard } from "@/components/governance-leadership-iqac/governance-leadership-iqac-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import {
    getGovernanceLeadershipIqacContributorWorkspace,
    getGovernanceLeadershipIqacReviewWorkspace,
} from "@/lib/governance-leadership-iqac/service";

export default async function DirectorGovernanceLeadershipIqacPage() {
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
        getGovernanceLeadershipIqacContributorWorkspace(actor),
        getGovernanceLeadershipIqacReviewWorkspace(actor),
    ]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Assigned contributor workspace</CardTitle>
                    <CardDescription>
                        Complete governed IQAC and leadership portfolios that are directly assigned to your account, then submit them into workflow.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <GovernanceLeadershipIqacContributorWorkspace
                        actorLabel="Leadership"
                        assignments={JSON.parse(JSON.stringify(contributorWorkspace.assignments)) as never}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Governance Leadership & IQAC Review Workspace</CardTitle>
                    <CardDescription>
                        Browse scoped governance leadership and IQAC records inside your active governance span. Review controls appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <GovernanceLeadershipIqacReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
