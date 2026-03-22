import { PbasReviewBoard } from "@/components/pbas/pbas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { getPbasReviewQueue } from "@/lib/pbas/service";

export default async function DirectorPbasReviewPage() {
    const director = await requireDirector();
    const actor = {
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
    };
    const [reviewQueue, finalQueue] = await Promise.all([
        getPbasReviewQueue(actor, { stageKinds: ["review"] }),
        getPbasReviewQueue(actor, { stageKinds: ["final"] }),
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
                    <CardTitle>PBAS Review Queue</CardTitle>
                    <CardDescription>
                        Department head and committee-side review queue for submitted PBAS annual appraisals.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PbasReviewBoard applications={reviewItems} mode="review" />
                </CardContent>
            </Card>

            {finalItems.length ? (
                <Card>
                    <CardHeader>
                        <CardTitle>PBAS Final Approval</CardTitle>
                        <CardDescription>
                            Principal-level PBAS approvals assigned to your active governance role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PbasReviewBoard applications={finalItems} mode="approve" />
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
