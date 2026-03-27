import { requireDirector } from "@/lib/auth/user";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { getAqarScopedApplications } from "@/lib/aqar/service";
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
    const scopedApplications = await getAqarScopedApplications(actor);

    const facultyMap = new Map(
        (
            await getFacultyByIds(
                scopedApplications.map((item) => item.facultyId.toString())
            )
        ).map((faculty) => [
            faculty._id.toString(),
            [faculty.firstName, faculty.lastName].filter(Boolean).join(" "),
        ])
    );

    const items = scopedApplications.map((item) => ({
        ...JSON.parse(JSON.stringify(item)),
        facultyName: facultyMap.get(item.facultyId.toString()),
    }));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AQAR workspace</CardTitle>
                    <CardDescription>
                        Browse AQAR records inside your assigned scope. Review and approval controls appear only when the current workflow stage is assigned to you.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AqarReviewBoard applications={items} mode="scoped" />
                </CardContent>
            </Card>
        </div>
    );
}
