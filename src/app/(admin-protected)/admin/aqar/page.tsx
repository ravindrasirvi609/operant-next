import dbConnect from "@/lib/dbConnect";
import User from "@/models/core/user";
import { requireAdmin } from "@/lib/auth/user";
import { getAqarReviewQueue } from "@/lib/aqar/service";
import { listAqarCycles } from "@/lib/aqar-cycle/service";
import { AqarReviewBoard } from "@/components/aqar/aqar-review-board";
import { AqarCycleDashboard } from "@/components/aqar/aqar-cycle-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAqarReviewPage() {
    const admin = await requireAdmin();
    const [queue, cycles] = await Promise.all([
        getAqarReviewQueue({
            id: admin.id,
            name: admin.name,
            role: admin.role,
            department: admin.department,
        }),
        listAqarCycles({
            id: admin.id,
            name: admin.name,
            role: admin.role,
        }),
    ]);

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
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Institutional AQAR Compilation</CardTitle>
                    <CardDescription>
                        Generate institution-wide AQAR cycles from PBAS, CAS, faculty, student, and organizational source modules.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AqarCycleDashboard initialCycles={JSON.parse(JSON.stringify(cycles))} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Faculty AQAR Final Approval</CardTitle>
                    <CardDescription>
                        Final admin approval board for faculty AQAR submissions before they are compiled into the institutional AQAR cycle.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AqarReviewBoard applications={items} mode="approve" />
                </CardContent>
            </Card>
        </div>
    );
}
