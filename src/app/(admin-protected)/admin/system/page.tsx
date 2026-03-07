import { SystemUpdatesManager } from "@/components/admin/admin-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystemUpdates } from "@/lib/admin/system";

export default async function AdminSystemPage() {
    const items = await getSystemUpdates();
    const safeItems = JSON.parse(JSON.stringify(items)) as never;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>System updates and notices</CardTitle>
                    <CardDescription>
                        Publish university-wide notices, operational updates, and dashboard messages from the admin console.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SystemUpdatesManager initialItems={safeItems} />
                </CardContent>
            </Card>
        </div>
    );
}
