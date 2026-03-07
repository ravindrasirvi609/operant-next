import { HierarchyManager } from "@/components/admin/hierarchy-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getHierarchyData } from "@/lib/admin/hierarchy";

export default async function AdminHierarchyPage() {
    const data = await getHierarchyData();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Organization hierarchy</CardTitle>
                <CardDescription>
                    Structure the university, college, department, and office hierarchy and assign the correct leadership head for each unit.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <HierarchyManager
                    assignableUsers={JSON.parse(JSON.stringify(data.assignableUsers)) as never}
                    initialOrganizations={JSON.parse(JSON.stringify(data.organizations)) as never}
                    organizationTypes={data.organizationTypes}
                />
            </CardContent>
        </Card>
    );
}
