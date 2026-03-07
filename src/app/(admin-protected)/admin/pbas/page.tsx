import { PbasReviewBoard } from "@/components/pbas/pbas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { getPbasReviewQueue } from "@/lib/pbas/service";
import User from "@/models/core/user";
import dbConnect from "@/lib/dbConnect";

export default async function AdminPbasReviewPage() {
    const admin = await requireAdmin();
    const queue = await getPbasReviewQueue({
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
