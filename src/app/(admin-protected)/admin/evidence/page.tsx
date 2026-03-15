import { EvidenceReviewBoard } from "@/components/evidence/evidence-review-board";
import { requireAdmin } from "@/lib/auth/user";

export default async function AdminEvidenceReviewPage() {
    await requireAdmin();

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
                <EvidenceReviewBoard />
            </div>
        </main>
    );
}
