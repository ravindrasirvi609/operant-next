import { EvidenceReviewBoard } from "@/components/evidence/evidence-review-board";
import { requireDirector } from "@/lib/auth/user";

export default async function DirectorEvidenceReviewPage() {
    await requireDirector();

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
                <EvidenceReviewBoard />
            </div>
        </main>
    );
}
