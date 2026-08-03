import { ScrollText } from "lucide-react";

import { PbasDashboard } from "@/components/pbas/pbas-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyPbasApplications, getPbasSummaryForFaculty } from "@/lib/pbas/service";

export default async function FacultyPbasPage() {
    const faculty = await requireFaculty();
    const [applications, summary] = await Promise.all([
        getFacultyPbasApplications({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
        getPbasSummaryForFaculty({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
    ]);

    return (
        <main className="min-h-screen bg-muted/50">
            <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
                <PageHeader
                    title="PBAS Applications"
                    description="Manage yearly PBAS submissions, API scores, and approval status."
                    icon={ScrollText}
                />
                <PbasDashboard
                    facultyName={faculty.name}
                    facultyId={faculty.id}
                    summary={JSON.parse(JSON.stringify(summary))}
                    initialApplications={JSON.parse(JSON.stringify(applications))}
                />
            </div>
        </main>
    );
}
