import { TeachingLearningManager } from "@/components/teaching-learning/teaching-learning-manager";
import { TeachingLearningReviewBoard } from "@/components/teaching-learning/teaching-learning-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import {
    getTeachingLearningAdminConsole,
    getTeachingLearningReviewWorkspace,
} from "@/lib/teaching-learning/service";

export default async function AdminTeachingLearningPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getTeachingLearningAdminConsole(),
        getTeachingLearningReviewWorkspace({
            id: admin.id,
            name: admin.name,
            role: admin.role,
            department: admin.department,
            collegeName: admin.collegeName,
            universityName: admin.universityName,
        }),
    ]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Teaching Learning Process Management</CardTitle>
                    <CardDescription>
                        Configure governed course-delivery plans, assign eligible faculty contributors, and control production teaching-learning records from one administrative workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TeachingLearningManager
                        academicYearOptions={JSON.parse(JSON.stringify(consoleData.academicYearOptions)) as never}
                        assignments={JSON.parse(JSON.stringify(consoleData.assignments)) as never}
                        courseOptions={JSON.parse(JSON.stringify(consoleData.courseOptions)) as never}
                        plans={JSON.parse(JSON.stringify(consoleData.plans)) as never}
                        programOptions={JSON.parse(JSON.stringify(consoleData.programOptions)) as never}
                        semesterOptions={JSON.parse(JSON.stringify(consoleData.semesterOptions)) as never}
                        userOptions={JSON.parse(JSON.stringify(consoleData.userOptions)) as never}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Reviewer workspace</CardTitle>
                    <CardDescription>
                        Inspect submitted teaching-learning files, linked evidence, learner-support logs, and workflow history before recording committee or final-stage decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TeachingLearningReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
