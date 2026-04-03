import { ResearchInnovationReviewBoard } from "@/components/research-innovation/research-innovation-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getResearchInnovationReviewWorkspace } from "@/lib/research-innovation/service";

export default async function DirectorResearchInnovationPage() {
    const director = await requireDirector();
    const workspace = await getResearchInnovationReviewWorkspace({
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
                    <CardTitle>Research & Innovation Review Workspace</CardTitle>
                    <CardDescription>
                        Browse scoped research ecosystem records inside your active governance span. Review controls appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResearchInnovationReviewBoard
                        records={JSON.parse(JSON.stringify(workspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(workspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
