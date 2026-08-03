import { ScrollText } from "lucide-react";

import { PbasReviewBoard } from "@/components/pbas/pbas-review-board";
import { PageHeader } from "@/components/ui/page-header";
import { requireDirector } from "@/lib/auth/user";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { getPbasScopedApplications } from "@/lib/pbas/service";

export default async function DirectorPbasReviewPage() {
    const director = await requireDirector();
    const actor = {
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
    };
    const scopedApplications = await getPbasScopedApplications(actor);

    const facultyMap = new Map(
        (
            await getFacultyByIds(
                scopedApplications.map((item) => item.facultyId.toString())
            )
        ).map((faculty) => [
            faculty._id.toString(),
            [faculty.firstName, faculty.lastName].filter(Boolean).join(" "),
        ])
    );

    const items = scopedApplications.map((item) => ({
        ...JSON.parse(JSON.stringify(item)),
        facultyName: facultyMap.get(item.facultyId.toString()),
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                title="PBAS Review"
                description="Browse PBAS records inside your assigned scope. Review and approval controls appear only when the current workflow stage is assigned to you."
                icon={ScrollText}
                tone="info"
            />
            <PbasReviewBoard applications={items} mode="scoped" />
        </div>
    );
}
