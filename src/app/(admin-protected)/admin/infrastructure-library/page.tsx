import { InfrastructureLibraryManager } from "@/components/infrastructure-library/infrastructure-library-manager";
import { InfrastructureLibraryReviewBoard } from "@/components/infrastructure-library/infrastructure-library-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import {
    getInfrastructureLibraryAdminConsole,
    getInfrastructureLibraryReviewWorkspace,
} from "@/lib/infrastructure-library/service";

export default async function AdminInfrastructureLibraryPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getInfrastructureLibraryAdminConsole(),
        getInfrastructureLibraryReviewWorkspace({
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
                    <CardTitle>Infrastructure & Library Management</CardTitle>
                    <CardDescription>
                        Configure governed infrastructure and library portfolios, scope-safe coordinator assignments, and audit-ready evidence collection from one administrative workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InfrastructureLibraryManager
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
                        Inspect facilities, library holdings, digital usage, maintenance evidence, and workflow history before recording review decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InfrastructureLibraryReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
