import { PbasReviewBoard } from "@/components/pbas/pbas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { getPbasReviewQueue } from "@/lib/pbas/service";

export default async function DirectorPbasReviewPage() {
    const director = await requireDirector();
    const queue = await getPbasReviewQueue({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
    });

    const facultyMap = new Map(
        (await getFacultyByIds(queue.map((item) => item.facultyId.toString()))).map((faculty) => [
            faculty._id.toString(),
            [faculty.firstName, faculty.lastName].filter(Boolean).join(" "),
        ])
    );

    const items = queue.map((item) => ({
        ...JSON.parse(JSON.stringify(item)),
        facultyName: facultyMap.get(item.facultyId.toString()),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>PBAS Review Queue</CardTitle>
                <CardDescription>
                    Department head and committee-side review queue for submitted PBAS annual appraisals.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <PbasReviewBoard applications={items} mode="review" />
            </CardContent>
        </Card>
    );
}
