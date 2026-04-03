import { ResearchInnovationManager } from "@/components/research-innovation/research-innovation-manager";
import { ResearchInnovationReviewBoard } from "@/components/research-innovation/research-innovation-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import {
    getResearchInnovationAdminConsole,
    getResearchInnovationReviewWorkspace,
} from "@/lib/research-innovation/service";

export default async function AdminResearchInnovationPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getResearchInnovationAdminConsole(),
        getResearchInnovationReviewWorkspace({
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
                    <CardTitle>Research & Innovation Ecosystem Management</CardTitle>
                    <CardDescription>
                        Configure governed research portfolios, scope-safe contributor assignments, and innovation ecosystem evidence collection from one administrative workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResearchInnovationManager
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
                        Inspect linked publications, patents, projects, student research, innovation activities, workflow history, and evidence before recording review decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResearchInnovationReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
