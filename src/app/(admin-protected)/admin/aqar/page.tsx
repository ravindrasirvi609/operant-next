import { Building2, FileBarChart, Network } from "lucide-react";

import { NaacCriteriaMappingManager } from "@/components/admin/naac-criteria-mapping-manager";
import { requireAdmin } from "@/lib/auth/user";
import { getAqarReviewQueue } from "@/lib/aqar/service";
import { listAqarCycles } from "@/lib/aqar-cycle/service";
import { formatAcademicYearLabel } from "@/lib/academic-year";
import { listAcademicYears } from "@/lib/admin/academics";
import { getFacultyByIds } from "@/lib/faculty/migration";
import { naacCriterionCatalog, naacMetricCatalog } from "@/lib/naac-criteria-mapping/catalog";
import { listNaacCriteriaMappings } from "@/lib/naac-criteria-mapping/service";
import { AqarReviewBoard } from "@/components/aqar/aqar-review-board";
import { AqarCycleDashboard } from "@/components/aqar/aqar-cycle-dashboard";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";

export default async function AdminAqarReviewPage() {
    const admin = await requireAdmin();
    const [queue, cycles, mappings, academicYears] = await Promise.all([
        getAqarReviewQueue(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
            },
            { stageKinds: ["final"] }
        ),
        listAqarCycles({ id: admin.id, name: admin.name, role: admin.role }),
        listNaacCriteriaMappings(),
        listAcademicYears(),
    ]);

    const activeAcademicYear = academicYears.find((year) => year.isActive);
    const defaultAcademicYearLabel = formatAcademicYearLabel(
        activeAcademicYear?.yearStart ?? academicYears[0]?.yearStart,
        activeAcademicYear?.yearEnd ?? academicYears[0]?.yearEnd
    );
    const academicYearOptions = academicYears
        .map((year) => ({
            id: String(year._id),
            label: formatAcademicYearLabel(year.yearStart, year.yearEnd),
            isActive: Boolean(year.isActive),
        }))
        .filter((year) => Boolean(year.label));

    const facultyMap = new Map(
        (await getFacultyByIds(queue.map((item) => item.facultyId.toString()))).map((faculty) => [
            faculty._id.toString(),
            [faculty.firstName, faculty.lastName].filter(Boolean).join(" "),
        ])
    );

    const items = queue.map((item) => ({
        ...JSON.parse(JSON.stringify(item)),
        facultyName: facultyMap.get(item.facultyId.toString()),
    }));

    return (
        <div className="space-y-8">
            <PageHeader
                title="AQAR administration"
                description="NAAC criteria mappings, institution-wide AQAR compilation, and final approval of faculty submissions."
                icon={FileBarChart}
            />

            <section className="space-y-4">
                <SectionHeader
                    title="NAAC criteria mappings"
                    description="How source-module data maps onto NAAC criteria and metrics."
                    icon={Network}
                />
                <NaacCriteriaMappingManager
                    initialMappings={JSON.parse(JSON.stringify(mappings))}
                    criteriaOptions={JSON.parse(JSON.stringify(naacCriterionCatalog))}
                    metricOptions={JSON.parse(JSON.stringify(naacMetricCatalog))}
                />
            </section>

            <section className="space-y-4">
                <SectionHeader
                    title="Institutional AQAR compilation"
                    description="Generate institution-wide cycles from PBAS, CAS, faculty, student, and organizational sources."
                    icon={Building2}
                />
                <AqarCycleDashboard
                    initialCycles={JSON.parse(JSON.stringify(cycles))}
                    academicYearOptions={JSON.parse(JSON.stringify(academicYearOptions))}
                    defaultAcademicYearLabel={defaultAcademicYearLabel}
                />
            </section>

            <section className="space-y-4">
                <SectionHeader
                    title="Faculty AQAR final approval"
                    description="Final admin decision before submissions are compiled into the institutional cycle."
                    icon={FileBarChart}
                />
                <AqarReviewBoard applications={items} mode="approve" />
            </section>
        </div>
    );
}
