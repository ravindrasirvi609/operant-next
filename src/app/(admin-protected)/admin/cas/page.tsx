import { CasRuleManager } from "@/components/admin/cas-rule-manager";
import { CasReviewBoard } from "@/components/cas/cas-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCasPromotionRules } from "@/lib/cas/admin";
import { getCasReviewQueue } from "@/lib/cas/service";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { requireAdmin } from "@/lib/auth/user";

export default async function AdminCasReviewPage() {
    const admin = await requireAdmin();
    const [queue, rules] = await Promise.all([
        getCasReviewQueue({
            id: admin.id,
            name: admin.name,
            role: admin.role,
            department: admin.department,
        }),
        getCasPromotionRules(),
    ]);

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
        <div className="space-y-6">
            <CasRuleManager initialRules={JSON.parse(JSON.stringify(rules))} />

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
        </div>
    );
}
