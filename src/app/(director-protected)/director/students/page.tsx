import { LeadershipStudentRoster } from "@/components/director/leadership-student-roster";
import { Badge } from "@/components/ui/badge";
import { requireDirector } from "@/lib/auth/user";
import { getLeadershipStudentRoster } from "@/lib/director/dashboard";

export default async function DirectorStudentsPage() {
    const director = await requireDirector();
    const rows = await getLeadershipStudentRoster({
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
                <Badge>Student operations</Badge>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                    Scoped student roster
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-500">
                    Student visibility is restricted to your authorized departments and institutions.
                    Review complete student profile details from one scoped table.
                </p>
            </section>

            <LeadershipStudentRoster rows={rows} />
        </div>
    );
}
