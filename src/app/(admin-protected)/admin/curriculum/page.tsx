import { CurriculumManager } from "@/components/curriculum/curriculum-manager";
import { CurriculumReviewBoard } from "@/components/curriculum/curriculum-review-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { getCurriculumAdminConsole, getCurriculumReviewWorkspace } from "@/lib/curriculum/service";

export default async function AdminCurriculumPage() {
    const admin = await requireAdmin();
    const [consoleData, reviewWorkspace] = await Promise.all([
        getCurriculumAdminConsole(),
        getCurriculumReviewWorkspace({
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
                    <CardTitle>Curriculum Management</CardTitle>
                    <CardDescription>
                        Configure calendar publishing, curriculum versions, syllabus structures, outcomes, Board of Studies governance, and faculty authoring assignments from one administrative workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CurriculumManager
                        calendars={JSON.parse(JSON.stringify(consoleData.calendars)) as never}
                        calendarEvents={JSON.parse(JSON.stringify(consoleData.calendarEvents)) as never}
                        plans={JSON.parse(JSON.stringify(consoleData.plans)) as never}
                        curriculumCourses={JSON.parse(JSON.stringify(consoleData.curriculumCourses)) as never}
                        syllabusVersions={JSON.parse(JSON.stringify(consoleData.syllabusVersions)) as never}
                        programOutcomes={JSON.parse(JSON.stringify(consoleData.programOutcomes)) as never}
                        bosMeetings={JSON.parse(JSON.stringify(consoleData.bosMeetings)) as never}
                        bosDecisions={JSON.parse(JSON.stringify(consoleData.bosDecisions)) as never}
                        valueAddedCourses={JSON.parse(JSON.stringify(consoleData.valueAddedCourses)) as never}
                        assignments={JSON.parse(JSON.stringify(consoleData.assignments)) as never}
                        institutionOptions={JSON.parse(JSON.stringify(consoleData.institutionOptions)) as never}
                        academicYearOptions={JSON.parse(JSON.stringify(consoleData.academicYearOptions)) as never}
                        programOptions={JSON.parse(JSON.stringify(consoleData.programOptions)) as never}
                        courseMasterOptions={JSON.parse(JSON.stringify(consoleData.courseMasterOptions)) as never}
                        userOptions={JSON.parse(JSON.stringify(consoleData.userOptions)) as never}
                        departmentOptions={JSON.parse(JSON.stringify(consoleData.departmentOptions)) as never}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Reviewer workspace</CardTitle>
                    <CardDescription>
                        Inspect syllabus drafts, linked evidence, CO mappings, and workflow history before recording Board of Studies, IQAC, or final-stage decisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CurriculumReviewBoard
                        records={JSON.parse(JSON.stringify(reviewWorkspace.records)) as never}
                        summary={JSON.parse(JSON.stringify(reviewWorkspace.summary)) as never}
                        viewerLabel="Admin"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
