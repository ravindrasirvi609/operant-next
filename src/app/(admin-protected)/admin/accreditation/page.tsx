import { AccreditationOperationsManager } from "@/components/accreditation/accreditation-operations-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { getAccreditationAdminConsole } from "@/lib/accreditation/service";

export default async function AdminAccreditationPage() {
    await requireAdmin();
    const consoleData = await getAccreditationAdminConsole();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Accreditation Operations</CardTitle>
                    <CardDescription>
                        Manage Student Satisfaction Survey, AISHE, NIRF, and regulatory compliance as source modules for the NAAC metric warehouse.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AccreditationOperationsManager
                        institutionOptions={JSON.parse(JSON.stringify(consoleData.institutionOptions)) as never}
                        academicYearOptions={JSON.parse(JSON.stringify(consoleData.academicYearOptions)) as never}
                        departmentOptions={JSON.parse(JSON.stringify(consoleData.departmentOptions)) as never}
                        programOptions={JSON.parse(JSON.stringify(consoleData.programOptions)) as never}
                        userOptions={JSON.parse(JSON.stringify(consoleData.userOptions)) as never}
                        studentOptions={JSON.parse(JSON.stringify(consoleData.studentOptions)) as never}
                        documentOptions={JSON.parse(JSON.stringify(consoleData.documentOptions)) as never}
                        sssSurveys={JSON.parse(JSON.stringify(consoleData.sssSurveys)) as never}
                        aisheCycles={JSON.parse(JSON.stringify(consoleData.aisheCycles)) as never}
                        nirfCycles={JSON.parse(JSON.stringify(consoleData.nirfCycles)) as never}
                        regulatoryBodies={JSON.parse(JSON.stringify(consoleData.regulatoryBodies)) as never}
                        approvals={JSON.parse(JSON.stringify(consoleData.approvals)) as never}
                        reports={JSON.parse(JSON.stringify(consoleData.reports)) as never}
                        inspections={JSON.parse(JSON.stringify(consoleData.inspections)) as never}
                        actionItems={JSON.parse(JSON.stringify(consoleData.actionItems)) as never}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
