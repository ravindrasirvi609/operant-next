import { AlumniEngagementManager } from "@/components/alumni/alumni-engagement-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";

export default async function AdminAlumniPage() {
    await requireAdmin();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Alumni Engagement Management</CardTitle>
                    <CardDescription>
                        Promote graduated students to alumni logins, maintain the alumni association record, and track
                        NAAC Criterion 5.4 contribution evidence.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AlumniEngagementManager />
                </CardContent>
            </Card>
        </div>
    );
}
