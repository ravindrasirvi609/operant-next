import { ScrollText } from "lucide-react";

import { PbasDashboard } from "@/components/pbas/pbas-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyPbasApplications, getPbasSummaryForFaculty } from "@/lib/pbas/service";

/**
 * The wrapping `<main className="min-h-screen bg-muted/50">` and its
 * `px-4 py-8 sm:px-6 lg:px-8 xl:px-10` inner div are gone. `RoleShell` already
 * renders `<main className="min-w-0 flex-1 px-4 py-6 lg:px-6">`
 * (components/shell/role-shell.tsx), so this page was producing a second `main`
 * landmark nested inside the first — invalid HTML, and it broke landmark
 * navigation for screen readers — while also doubling the horizontal padding and
 * painting a `bg-muted/50` panel over the shell's own background.
 */
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
        <div className="space-y-6">
            <PageHeader
                title="PBAS appraisals"
                description="Your annual Performance Based Appraisal System reports, API scores, and approval status."
                icon={ScrollText}
            />
            <PbasDashboard
                facultyName={faculty.name}
                facultyId={faculty.id}
                summary={JSON.parse(JSON.stringify(summary))}
                initialApplications={JSON.parse(JSON.stringify(applications))}
            />
        </div>
    );
}
