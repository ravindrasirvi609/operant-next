import { SsrReviewBoard } from "@/components/ssr/ssr-review-board";
import { SsrManager } from "@/components/admin/ssr-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { getSsrAdminConsole, getSsrReviewWorkspace } from "@/lib/ssr/service";

export default async function AdminSsrPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getSsrAdminConsole(),
        getSsrReviewWorkspace({
            id: admin.id,
            name: admin.name,
            role: admin.role,
            department: admin.department,
            collegeName: admin.collegeName,
            universityName: admin.universityName,
        }),
    ]);
    const safeData = JSON.parse(JSON.stringify(consoleData)) as typeof consoleData;
    const safeReviewWorkspace = JSON.parse(JSON.stringify(reviewWorkspace)) as typeof reviewWorkspace;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>SSR Management</CardTitle>
                    <CardDescription>
                        Configure SSR cycles, criteria, metrics, narrative sections, contributor assignments, and governed workflows from one administration workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SsrManager
                        cycles={safeData.cycles}
                        criteria={safeData.criteria}
                        metrics={safeData.metrics}
                        sections={safeData.sections}
                        assignments={safeData.assignments}
                        responses={safeData.responses}
                        institutionOptions={safeData.institutionOptions}
                        academicYearOptions={safeData.academicYearOptions}
                        userOptions={safeData.userOptions}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Reviewer workspace</CardTitle>
                    <CardDescription>
                        Inspect actual SSR submissions, linked evidence, and workflow history before recording committee or final-stage decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SsrReviewBoard
                        records={safeReviewWorkspace.records as never}
                        summary={safeReviewWorkspace.summary as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
