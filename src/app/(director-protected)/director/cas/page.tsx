import { CasReviewBoard } from "@/components/cas/cas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCasReviewQueue } from "@/lib/cas/service";
import { requireDirector } from "@/lib/auth/user";
import User from "@/models/core/user";
import dbConnect from "@/lib/dbConnect";

export default async function DirectorCasReviewPage() {
    const director = await requireDirector();
    const queue = await getCasReviewQueue({
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
