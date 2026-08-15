import { AcademicRecordRequestsBoard } from "@/components/student/academic-record-requests-board";
import { requireAdmin } from "@/lib/auth/user";

export default async function AdminAcademicRecordRequestsPage() {
    await requireAdmin();

    return (
        <main className="min-h-screen bg-muted/50">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Academic record correction requests
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                        Review and approve or reject student-submitted corrections to semester SGPA, CGPA,
                        percentage, rank, or result status.
                    </p>
                </div>
                <AcademicRecordRequestsBoard />
            </div>
        </main>
    );
}
