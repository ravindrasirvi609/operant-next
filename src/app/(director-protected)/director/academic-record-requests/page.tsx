import { AcademicRecordRequestsBoard } from "@/components/student/academic-record-requests-board";
import { Badge } from "@/components/ui/badge";
import { requireDirector } from "@/lib/auth/user";

export default async function DirectorAcademicRecordRequestsPage() {
    await requireDirector();

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <Badge>Academic records</Badge>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
                    Academic record correction requests
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                    Review corrections students have requested to their semester SGPA, CGPA, percentage, rank, or
                    result status, scoped to your governance departments.
                </p>
            </section>
            <main className="min-h-screen bg-muted/50">
                <div className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-0 lg:px-0">
                    <AcademicRecordRequestsBoard />
                </div>
            </main>
        </div>
    );
}
