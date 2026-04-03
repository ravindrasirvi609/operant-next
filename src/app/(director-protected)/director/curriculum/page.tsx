import { CurriculumReviewBoard } from "@/components/curriculum/curriculum-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getCurriculumReviewWorkspace } from "@/lib/curriculum/service";

export default async function DirectorCurriculumPage() {
    const director = await requireDirector();
    const workspace = await getCurriculumReviewWorkspace({
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
                    <CardTitle>Curriculum Review Workspace</CardTitle>
                    <CardDescription>
                        Browse curriculum submissions inside your active governance scope. Review actions appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CurriculumReviewBoard
                        records={JSON.parse(JSON.stringify(workspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(workspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
