import { ReferenceMasterManager } from "@/components/admin/reference-master-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listReferenceMasters } from "@/lib/admin/reference-masters";

export default async function AdminReferenceMastersPage() {
    const data = await listReferenceMasters();
    const safeData = JSON.parse(JSON.stringify(data));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Governed Reference Masters</CardTitle>
                    <CardDescription>
                        Manage awards, skills, sports, cultural activities, social programmes, and events as admin-governed production masters.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ReferenceMasterManager initialData={safeData} />
                </CardContent>
            </Card>
        </div>
    );
}
