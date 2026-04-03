import { StudentSupportGovernanceReviewBoard } from "@/components/student-support-governance/student-support-governance-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getStudentSupportGovernanceReviewWorkspace } from "@/lib/student-support-governance/service";

export default async function DirectorStudentSupportGovernancePage() {
    const director = await requireDirector();
    const workspace = await getStudentSupportGovernanceReviewWorkspace({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Student Support & Governance Review Workspace</CardTitle>
                    <CardDescription>
                        Browse scoped student-support records inside your active governance span. Review controls appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <StudentSupportGovernanceReviewBoard
                        records={JSON.parse(JSON.stringify(workspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(workspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
