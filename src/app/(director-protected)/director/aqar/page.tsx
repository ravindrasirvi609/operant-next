import { requireDirector } from "@/lib/auth/user";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { getAqarReviewQueue } from "@/lib/aqar/service";
import { AqarReviewBoard } from "@/components/aqar/aqar-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DirectorAqarReviewPage() {
    const director = await requireDirector();
    const actor = {
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
    };
    const [reviewQueue, finalQueue] = await Promise.all([
        getAqarReviewQueue(actor, { stageKinds: ["review"] }),
        getAqarReviewQueue(actor, { stageKinds: ["final"] }),
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
                    <CardTitle>AQAR Review Queue</CardTitle>
                    <CardDescription>
                        Department head and committee-side review queue for submitted AQAR annual contributions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AqarReviewBoard applications={reviewItems} mode="review" />
                </CardContent>
            </Card>

            {finalItems.length ? (
                <Card>
                    <CardHeader>
                        <CardTitle>AQAR Final Approval</CardTitle>
                        <CardDescription>
                            Principal-level AQAR approvals assigned to your active governance role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AqarReviewBoard applications={finalItems} mode="approve" />
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
