import { DirectorApprovalQueue } from "@/components/director/director-approval-queue";
import { requireDirector } from "@/lib/auth/user";
import { getHodApprovalQueue } from "@/lib/student/service";

export default async function DirectorApprovalsPage() {
    const director = await requireDirector();
    const students = await getHodApprovalQueue(director.id);

    return (
        <DirectorApprovalQueue students={JSON.parse(JSON.stringify(students))} />
    );
}
