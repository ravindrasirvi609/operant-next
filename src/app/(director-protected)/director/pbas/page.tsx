import { PbasReviewBoard } from "@/components/pbas/pbas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getPbasReviewQueue } from "@/lib/pbas/service";
import User from "@/models/core/user";
import dbConnect from "@/lib/dbConnect";

export default async function DirectorPbasReviewPage() {
    const director = await requireDirector();
    const queue = await getPbasReviewQueue({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
    });

    await dbConnect();
    const facultyMap = new Map(
        (
            await User.find({ _id: { $in: queue.map((item) => item.facultyId) } }).select("name")
        ).map((user) => [user._id.toString(), user.name])
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
