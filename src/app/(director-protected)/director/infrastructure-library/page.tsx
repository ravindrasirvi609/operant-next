import { InfrastructureLibraryReviewBoard } from "@/components/infrastructure-library/infrastructure-library-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getInfrastructureLibraryReviewWorkspace } from "@/lib/infrastructure-library/service";

export default async function DirectorInfrastructureLibraryPage() {
    const director = await requireDirector();
    const workspace = await getInfrastructureLibraryReviewWorkspace({
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
                    <CardTitle>Infrastructure & Library Review Workspace</CardTitle>
                    <CardDescription>
                        Browse scoped infrastructure and library records inside your active governance span. Review controls appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InfrastructureLibraryReviewBoard
                        records={JSON.parse(JSON.stringify(workspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(workspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
