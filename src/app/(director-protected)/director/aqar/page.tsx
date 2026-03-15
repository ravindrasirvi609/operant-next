import { requireDirector } from "@/lib/auth/user";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { getAqarReviewQueue } from "@/lib/aqar/service";
import { AqarReviewBoard } from "@/components/aqar/aqar-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DirectorAqarReviewPage() {
    const director = await requireDirector();
    const queue = await getAqarReviewQueue({
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
                <CardTitle>AQAR Review Queue</CardTitle>
                <CardDescription>
                    Department head and committee-side review queue for submitted AQAR annual contributions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AqarReviewBoard applications={items} mode="review" />
            </CardContent>
        </Card>
    );
}
