import { InstitutionalValuesBestPracticesManager } from "@/components/institutional-values-best-practices/institutional-values-best-practices-manager";
import { InstitutionalValuesBestPracticesReviewBoard } from "@/components/institutional-values-best-practices/institutional-values-best-practices-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import {
    getInstitutionalValuesBestPracticesAdminConsole,
    getInstitutionalValuesBestPracticesReviewWorkspace,
} from "@/lib/institutional-values-best-practices/service";

export default async function AdminInstitutionalValuesBestPracticesPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getInstitutionalValuesBestPracticesAdminConsole(),
        getInstitutionalValuesBestPracticesReviewWorkspace({
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
                    <CardTitle>Institutional Values & Best Practices Management</CardTitle>
                    <CardDescription>
                        Configure Criteria 7 portfolios, scope-safe owner assignments, and evidence-backed environmental, inclusion, ethics, outreach, best-practice, and distinctiveness records from one administrative workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InstitutionalValuesBestPracticesManager
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
                        Inspect narratives, structured records, linked evidence, and workflow history before recording review decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InstitutionalValuesBestPracticesReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
