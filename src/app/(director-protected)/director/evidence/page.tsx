import { EvidenceReviewBoard } from "@/components/evidence/evidence-review-board";
import { Badge } from "@/components/ui/badge";
import { requireDirector } from "@/lib/auth/user";

export default async function DirectorEvidenceReviewPage() {
    await requireDirector();

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <Badge>Evidence workspace</Badge>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
                    Student evidence review
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                    Verify or reject student evidence only for the departments and institutions that fall inside your active governance scope.
                </p>
            </section>
            <main className="min-h-screen bg-muted/50">
                <div className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-0 lg:px-0">
                <EvidenceReviewBoard />
                </div>
            </main>
        </div>
    );
}
