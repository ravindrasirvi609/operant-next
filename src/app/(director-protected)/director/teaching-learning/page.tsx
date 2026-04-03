import { TeachingLearningReviewBoard } from "@/components/teaching-learning/teaching-learning-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getTeachingLearningReviewWorkspace } from "@/lib/teaching-learning/service";

export default async function DirectorTeachingLearningPage() {
    const director = await requireDirector();
    const workspace = await getTeachingLearningReviewWorkspace({
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
                    <CardTitle>Teaching Learning Review Workspace</CardTitle>
                    <CardDescription>
                        Browse scoped teaching-learning records inside your active governance span. Review controls appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TeachingLearningReviewBoard
                        records={JSON.parse(JSON.stringify(workspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(workspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
