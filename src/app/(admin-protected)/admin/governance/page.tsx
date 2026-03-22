import { GovernanceManager } from "@/components/admin/governance-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGovernanceData } from "@/lib/governance/service";

export default async function AdminGovernancePage() {
    const data = await getGovernanceData();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Governance and committees</CardTitle>
                <CardDescription>
                    Assign HODs, principals, and governance coordinators, then create committees and wire members into institutional review workflows.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <GovernanceManager
                    assignments={JSON.parse(JSON.stringify(data.assignments)) as never}
                    committees={JSON.parse(JSON.stringify(data.committees)) as never}
                    memberships={JSON.parse(JSON.stringify(data.memberships)) as never}
                    organizations={JSON.parse(JSON.stringify(data.organizations)) as never}
                    users={JSON.parse(JSON.stringify(data.assignableUsers)) as never}
                />
            </CardContent>
        </Card>
    );
}
