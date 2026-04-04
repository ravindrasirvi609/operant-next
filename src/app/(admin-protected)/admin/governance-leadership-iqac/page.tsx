import { GovernanceLeadershipIqacManager } from "@/components/governance-leadership-iqac/governance-leadership-iqac-manager";
import { GovernanceLeadershipIqacReviewBoard } from "@/components/governance-leadership-iqac/governance-leadership-iqac-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import {
    getGovernanceLeadershipIqacAdminConsole,
    getGovernanceLeadershipIqacReviewWorkspace,
} from "@/lib/governance-leadership-iqac/service";

export default async function AdminGovernanceLeadershipIqacPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getGovernanceLeadershipIqacAdminConsole(),
        getGovernanceLeadershipIqacReviewWorkspace({
            id: admin.id,
            name: admin.name,
            role: admin.role,
            department: admin.department,
            collegeName: admin.collegeName,
            universityName: admin.universityName,
        }),
    ]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Governance Leadership & IQAC Management</CardTitle>
                    <CardDescription>
                        Configure governance leadership and IQAC portfolios, scope-safe owner assignments, and audit-ready meetings, policy, initiative, and compliance evidence from one administrative workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <GovernanceLeadershipIqacManager
                        academicYearOptions={JSON.parse(JSON.stringify(consoleData.academicYearOptions)) as never}
                        assignments={JSON.parse(JSON.stringify(consoleData.assignments)) as never}
                        departmentOptions={JSON.parse(JSON.stringify(consoleData.departmentOptions)) as never}
                        institutionOptions={JSON.parse(JSON.stringify(consoleData.institutionOptions)) as never}
                        plans={JSON.parse(JSON.stringify(consoleData.plans)) as never}
                        userOptions={JSON.parse(JSON.stringify(consoleData.userOptions)) as never}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Reviewer workspace</CardTitle>
                    <CardDescription>
                        Inspect governance, IQAC, initiative, policy, and compliance evidence with workflow history before recording review decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <GovernanceLeadershipIqacReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
