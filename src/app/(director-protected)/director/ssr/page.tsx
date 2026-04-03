import { SsrReviewBoard } from "@/components/ssr/ssr-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getSsrReviewWorkspace } from "@/lib/ssr/service";

export default async function DirectorSsrReviewPage() {
    const director = await requireDirector();
    const workspace = await getSsrReviewWorkspace({
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
                    <CardTitle>SSR workspace</CardTitle>
                    <CardDescription>
                        Browse SSR submissions inside your active governance scope. Review and approval actions appear only when the current workflow stage is assigned to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SsrReviewBoard
                        records={JSON.parse(JSON.stringify(workspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(workspace.summary)) as never}
                        viewerLabel="Leadership"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
