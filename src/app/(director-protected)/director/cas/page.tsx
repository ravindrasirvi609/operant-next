import { CasReviewBoard } from "@/components/cas/cas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCasScopedApplications } from "@/lib/cas/service";
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
    const scopedApplications = await getCasScopedApplications(actor);

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
                    <CardTitle>CAS workspace</CardTitle>
                    <CardDescription>
                        Browse CAS records inside your assigned scope. Review and approval controls appear only when the current workflow stage is assigned to you.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CasReviewBoard applications={items} mode="scoped" />
                </CardContent>
            </Card>
        </div>
    );
}
