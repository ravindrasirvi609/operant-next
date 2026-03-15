import { UserManagementTable } from "@/components/admin/admin-forms";
import { FacultyProvisioningPanel } from "@/components/admin/faculty-provisioning-panel";
import { StudentProvisioningPanel } from "@/components/admin/student-provisioning-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveMasterDataOptions } from "@/lib/admin/master-data";
import { getAdminUsers } from "@/lib/admin/users";

export default async function AdminUsersPage() {
    const [users, options] = await Promise.all([
        getAdminUsers(),
        getActiveMasterDataOptions(["university", "college", "department"]),
    ]);

    const safeUsers = JSON.parse(JSON.stringify(users)) as never;

    return (
        <div className="space-y-6">
            <StudentProvisioningPanel
                universityOptions={options.university ?? []}
                collegeOptions={options.college ?? []}
                departmentOptions={options.department ?? []}
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
