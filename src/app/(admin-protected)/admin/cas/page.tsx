import { CasReviewBoard } from "@/components/cas/cas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCasReviewQueue } from "@/lib/cas/service";
import { requireAdmin } from "@/lib/auth/user";
import User from "@/models/core/user";
import dbConnect from "@/lib/dbConnect";

export default async function AdminCasReviewPage() {
    const admin = await requireAdmin();
    const queue = await getCasReviewQueue({
        id: admin.id,
        name: admin.name,
        role: admin.role,
        department: admin.department,
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
                <CardTitle>CAS Final Approval</CardTitle>
                <CardDescription>
                    Final admin approval board for CAS applications that passed review and committee stages.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CasReviewBoard applications={items} mode="approve" />
            </CardContent>
        </Card>
    );
}
