import { ReportTemplateManager } from "@/components/admin/report-template-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listReportTemplates } from "@/lib/report-templates/service";

export default async function AdminReportTemplatesPage() {
    const templates = await listReportTemplates();
    const safeTemplates = JSON.parse(JSON.stringify(templates)) as never;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Report Templates</CardTitle>
                    <CardDescription>
                        Control PDF wording, section ordering, and output structure for PBAS, AQAR, and faculty summary reports from the admin console.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ReportTemplateManager initialTemplates={safeTemplates} />
                </CardContent>
            </Card>
        </div>
    );
}
