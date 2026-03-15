import { AcademicsManager } from "@/components/admin/academics-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { listAcademicYears, listPrograms, listSemesters } from "@/lib/admin/academics";
import dbConnect from "@/lib/dbConnect";
import Institution from "@/models/reference/institution";
import Department from "@/models/reference/department";

export default async function AdminAcademicsPage() {
    await requireAdmin();
    await dbConnect();

    const [academicYears, programs, semesters, institutions, departments] = await Promise.all([
        listAcademicYears(),
        listPrograms(),
        listSemesters(),
        Institution.find({}).sort({ name: 1 }).lean(),
        Department.find({}).sort({ name: 1 }).lean(),
    ]);

    const safeAcademicYears = JSON.parse(JSON.stringify(academicYears));
    const safePrograms = JSON.parse(JSON.stringify(programs));
    const safeSemesters = JSON.parse(JSON.stringify(semesters));
    const safeInstitutions = JSON.parse(JSON.stringify(institutions));
    const safeDepartments = JSON.parse(JSON.stringify(departments));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Academics Setup</CardTitle>
                    <CardDescription>
                        Manage academic years, programs, and semesters to support student records and accreditation reporting.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AcademicsManager
                        initialAcademicYears={safeAcademicYears}
                        initialPrograms={safePrograms}
                        initialSemesters={safeSemesters}
                        institutions={safeInstitutions}
                        departments={safeDepartments}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
