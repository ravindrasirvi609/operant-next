import { UserManagementTable } from "@/components/admin/admin-forms";
import { FacultyProvisioningPanel } from "@/components/admin/faculty-provisioning-panel";
import { StudentProvisioningPanel } from "@/components/admin/student-provisioning-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCourses, listPrograms } from "@/lib/admin/academics";
import { getActiveMasterDataOptions } from "@/lib/admin/master-data";
import { getAdminUsers } from "@/lib/admin/users";

function unwrapId(value?: { _id?: string } | string | null) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id ?? "";
}

export default async function AdminUsersPage() {
    const [users, options, programs, courses] = await Promise.all([
        getAdminUsers(),
        getActiveMasterDataOptions(["university", "college", "department"]),
        listPrograms(),
        listCourses(),
    ]);

    const safeUsers = JSON.parse(JSON.stringify(users)) as never;
    const safePrograms = JSON.parse(JSON.stringify(programs)) as Array<{
        _id: string;
        name: string;
        isActive?: boolean;
        durationYears?: number;
        departmentId?: { _id?: string; name?: string } | string;
    }>;
    const safeCourses = JSON.parse(JSON.stringify(courses)) as Array<{
        _id: string;
        name: string;
        isActive?: boolean;
        programId?: { _id?: string; name?: string } | string;
    }>;

    const programOptions = safePrograms
        .filter((item) => item?._id && item?.name)
        .map((item) => ({
            key: item._id,
            label: item.name,
            departmentId: unwrapId(item.departmentId),
            departmentName:
                typeof item.departmentId === "string" ? undefined : item.departmentId?.name,
            durationYears: item.durationYears,
            isActive: item.isActive ?? true,
        }));

    const courseOptions = safeCourses
        .filter((item) => item?._id && item?.name)
        .map((item) => ({
            key: item._id,
            label: item.name,
            programId: unwrapId(item.programId),
            programName:
                typeof item.programId === "string" ? undefined : item.programId?.name,
            isActive: item.isActive ?? true,
        }));

    return (
        <div className="space-y-6">
            <StudentProvisioningPanel
                universityOptions={options.university ?? []}
                collegeOptions={options.college ?? []}
                departmentOptions={options.department ?? []}
                programOptions={programOptions}
                courseOptions={courseOptions}
            />

            <FacultyProvisioningPanel
                universityOptions={options.university ?? []}
                collegeOptions={options.college ?? []}
                departmentOptions={options.department ?? []}
            />

            <Card>
                <CardHeader>
                    <CardTitle>User administration</CardTitle>
                    <CardDescription>
                        Manage activation, verification, role assignment, and institutional placement for every UMIS account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UserManagementTable
                        universityOptions={options.university ?? []}
                        collegeOptions={options.college ?? []}
                        departmentOptions={options.department ?? []}
                        initialUsers={safeUsers}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
