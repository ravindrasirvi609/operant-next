import { NaacCriteriaMappingManager } from "@/components/admin/naac-criteria-mapping-manager";
import { requireAdmin } from "@/lib/auth/user";
import { getAqarReviewQueue } from "@/lib/aqar/service";
import { listAqarCycles } from "@/lib/aqar-cycle/service";
import { getFacultyByIds } from "@/lib/faculty/migration";
import {
    naacCriterionCatalog,
    naacMetricCatalog,
} from "@/lib/naac-criteria-mapping/catalog";
import { listNaacCriteriaMappings } from "@/lib/naac-criteria-mapping/service";
import { AqarReviewBoard } from "@/components/aqar/aqar-review-board";
import { AqarCycleDashboard } from "@/components/aqar/aqar-cycle-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAqarReviewPage() {
    const admin = await requireAdmin();
    const [queue, cycles, mappings] = await Promise.all([
        getAqarReviewQueue({
            id: admin.id,
            name: admin.name,
            role: admin.role,
            department: admin.department,
        }),
        listAqarCycles({
            id: admin.id,
            name: admin.name,
            role: admin.role,
        }),
        listNaacCriteriaMappings(),
    ]);

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
        <div className="space-y-6">
            <NaacCriteriaMappingManager
                initialMappings={JSON.parse(JSON.stringify(mappings))}
                criteriaOptions={JSON.parse(JSON.stringify(naacCriterionCatalog))}
                metricOptions={JSON.parse(JSON.stringify(naacMetricCatalog))}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Institutional AQAR Compilation</CardTitle>
                    <CardDescription>
                        Generate institution-wide AQAR cycles from PBAS, CAS, faculty, student, and organizational source modules using the configured NAAC criteria mappings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AqarCycleDashboard initialCycles={JSON.parse(JSON.stringify(cycles))} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Faculty AQAR Final Approval</CardTitle>
                    <CardDescription>
                        Final admin approval board for faculty AQAR submissions before they are compiled into the institutional AQAR cycle.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AqarReviewBoard applications={items} mode="approve" />
                </CardContent>
            </Card>
        </div>
    );
}
