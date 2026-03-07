import { FacultyEvidenceForm } from "@/components/faculty/faculty-evidence-form";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyEvidence } from "@/lib/faculty-evidence/service";

export default async function FacultyEvidencePage() {
    const faculty = await requireFaculty();
    const evidence = await getFacultyEvidence(faculty.id);

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <FacultyEvidenceForm initialEvidence={JSON.parse(JSON.stringify(evidence))} />
            </div>
        </main>
    );
}
