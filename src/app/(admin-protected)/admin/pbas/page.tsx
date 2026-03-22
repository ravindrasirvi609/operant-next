import { PbasReviewBoard } from "@/components/pbas/pbas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { getPbasReviewQueue } from "@/lib/pbas/service";

export default async function AdminPbasReviewPage() {
    const admin = await requireAdmin();
    const queue = await getPbasReviewQueue({
        id: admin.id,
        name: admin.name,
        role: admin.role,
        department: admin.department,
    }, { stageKinds: ["final"] });

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
                <CardTitle>PBAS Final Approval</CardTitle>
                <CardDescription>
                    Final admin approval board for PBAS applications that passed review and committee stages.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <PbasReviewBoard applications={items} mode="approve" />
            </CardContent>
        </Card>
    );
}
