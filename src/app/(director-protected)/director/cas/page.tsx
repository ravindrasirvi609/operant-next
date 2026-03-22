import { CasReviewBoard } from "@/components/cas/cas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCasReviewQueue } from "@/lib/cas/service";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { requireDirector } from "@/lib/auth/user";

export default async function DirectorCasReviewPage() {
    const director = await requireDirector();
    const actor = {
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
    };
    const [reviewQueue, finalQueue] = await Promise.all([
        getCasReviewQueue(actor, { stageKinds: ["review"] }),
        getCasReviewQueue(actor, { stageKinds: ["final"] }),
    ]);

    const facultyMap = new Map(
        (
            await getFacultyByIds(
                [...reviewQueue, ...finalQueue].map((item) => item.facultyId.toString())
            )
        ).map((faculty) => [
            faculty._id.toString(),
            [faculty.firstName, faculty.lastName].filter(Boolean).join(" "),
        ])
    );

    const reviewItems = reviewQueue.map((item) => ({
        ...JSON.parse(JSON.stringify(item)),
        facultyName: facultyMap.get(item.facultyId.toString()),
    }));
    const finalItems = finalQueue.map((item) => ({
        ...JSON.parse(JSON.stringify(item)),
        facultyName: facultyMap.get(item.facultyId.toString()),
    }));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>CAS Review Queue</CardTitle>
                    <CardDescription>
                        Department head and committee-side review queue for submitted CAS promotion applications.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CasReviewBoard applications={reviewItems} mode="review" />
                </CardContent>
            </Card>

            {finalItems.length ? (
                <Card>
                    <CardHeader>
                        <CardTitle>CAS Final Approval</CardTitle>
                        <CardDescription>
                            Principal-level CAS approvals assigned to your active governance role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CasReviewBoard applications={finalItems} mode="approve" />
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
