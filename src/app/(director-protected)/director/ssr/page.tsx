import { ClipboardCheck } from "lucide-react";

import { SsrReviewBoard } from "@/components/ssr/ssr-review-board";
import { PageHeader } from "@/components/ui/page-header";
import { requireDirector } from "@/lib/auth/user";
import { getSsrReviewWorkspace } from "@/lib/ssr/service";

/**
 * The `<Card><CardHeader><CardTitle>` wrapper around the board is gone. Using a
 * Card as a page title meant the real `<h1>` for the page did not exist, and it
 * wrapped a component that renders its own cards — cards inside a card, with two
 * borders and two paddings between the page edge and the content.
 */
export default async function DirectorSsrReviewPage() {
    const director = await requireDirector();
    const workspace = await getSsrReviewWorkspace({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="SSR review"
                description="SSR submissions inside your governance scope. Review and approval controls appear only for stages assigned to your account."
                icon={ClipboardCheck}
            />
            <SsrReviewBoard
                records={JSON.parse(JSON.stringify(workspace.records)) as never}
                summary={JSON.parse(JSON.stringify(workspace.summary)) as never}
                viewerLabel="Leadership"
            />
        </div>
    );
}
