import { StudentSupportGovernanceManager } from "@/components/student-support-governance/student-support-governance-manager";
import { StudentSupportGovernanceReviewBoard } from "@/components/student-support-governance/student-support-governance-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import {
    getStudentSupportGovernanceAdminConsole,
    getStudentSupportGovernanceReviewWorkspace,
} from "@/lib/student-support-governance/service";

export default async function AdminStudentSupportGovernancePage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getStudentSupportGovernanceAdminConsole(),
        getStudentSupportGovernanceReviewWorkspace({
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
                    <CardTitle>Student Support & Governance Management</CardTitle>
                    <CardDescription>
                        Configure governed student-support portfolios, scope-safe coordinator assignments, and audit-ready mentoring, grievance, and progression evidence from one administrative workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <StudentSupportGovernanceManager
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
                        Inspect mentoring, grievance, progression, and representation evidence, and workflow history before recording review decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <StudentSupportGovernanceReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
