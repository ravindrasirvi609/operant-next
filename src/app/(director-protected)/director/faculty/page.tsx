import { LeadershipFacultyRoster } from "@/components/director/leadership-faculty-roster";
import { Badge } from "@/components/ui/badge";
import { requireDirector } from "@/lib/auth/user";
import { getLeadershipDashboardData } from "@/lib/director/dashboard";

export default async function DirectorFacultyPage() {
    const director = await requireDirector();
    const dashboard = await getLeadershipDashboardData({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    });

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <Badge>Faculty operations</Badge>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                    Scoped faculty roster
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-500">
                    Faculty visibility is limited to your authorized departments and institutions. Use this roster to
                    track faculty-wise PBAS, CAS, and AQAR progress without leaving the leadership workspace.
                </p>
            </section>

            <LeadershipFacultyRoster rows={dashboard.facultyRoster} />
        </div>
    );
}
