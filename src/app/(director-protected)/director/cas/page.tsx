import { CasReviewBoard } from "@/components/cas/cas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCasReviewQueue } from "@/lib/cas/service";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { requireDirector } from "@/lib/auth/user";

export default async function DirectorCasReviewPage() {
    const director = await requireDirector();
    const queue = await getCasReviewQueue({
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
                <CardTitle>CAS Review Queue</CardTitle>
                <CardDescription>
                    Department head and committee-side review queue for submitted CAS promotion applications.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CasReviewBoard applications={items} mode="review" />
            </CardContent>
        </Card>
    );
}
