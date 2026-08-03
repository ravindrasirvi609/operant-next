import { ClipboardCheck, Settings2 } from "lucide-react";

import { SsrReviewBoard } from "@/components/ssr/ssr-review-board";
import { SsrManager } from "@/components/admin/ssr-manager";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/user";
import { getSsrAdminConsole, getSsrReviewWorkspace } from "@/lib/ssr/service";

export default async function AdminSsrPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getSsrAdminConsole(),
        getSsrReviewWorkspace({
            id: admin.id,
            name: admin.name,
            role: admin.role,
            department: admin.department,
            collegeName: admin.collegeName,
            universityName: admin.universityName,
        }),
    ]);
    const safeData = JSON.parse(JSON.stringify(consoleData)) as typeof consoleData;
    const safeReviewWorkspace = JSON.parse(JSON.stringify(reviewWorkspace)) as typeof reviewWorkspace;

    return (
        <div className="space-y-8">
            <PageHeader
                title="SSR administration"
                description="Configure SSR cycles, criteria, metrics, narrative sections, and contributor assignments — then review what comes back."
                icon={Settings2}
            />

            <section className="space-y-4">
                <SectionHeader
                    title="Cycle configuration"
                    description="Cycles, criteria, metrics, sections, assignments, and governed workflows."
                    icon={Settings2}
                />
                <SsrManager
                    cycles={safeData.cycles}
                    criteria={safeData.criteria}
                    metrics={safeData.metrics}
                    sections={safeData.sections}
                    assignments={safeData.assignments}
                    responses={safeData.responses}
                    institutionOptions={safeData.institutionOptions}
                    academicYearOptions={safeData.academicYearOptions}
                    userOptions={safeData.userOptions}
                />
            </section>

            <section className="space-y-4">
                <SectionHeader
                    title="Reviewer workspace"
                    description="Inspect submissions and evidence before recording committee or final-stage decisions."
                    icon={ClipboardCheck}
                />
                <SsrReviewBoard
                    records={safeReviewWorkspace.records as never}
                    summary={safeReviewWorkspace.summary as never}
                    viewerLabel="Admin"
                />
            </section>
        </div>
    );
}
