import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/user";
import { getFacultyWorkspace } from "@/lib/faculty/service";
import { buildFacultyReportPdf } from "@/lib/faculty/report-pdf";
import { createApiErrorResponse } from "@/lib/auth/http";
import CasApplication from "@/models/core/cas-application";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import { getPbasSnapshotForApplication } from "@/lib/pbas/service";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const entryId = searchParams.get("entryId");

        if ((type !== "cas" && type !== "pbas") || !entryId) {
            return NextResponse.json({ message: "Valid report type and entryId are required." }, { status: 400 });
        }

        const [workspace, facultyContext] = await Promise.all([
            getFacultyWorkspace(user.id),
            ensureFacultyContext(user.id),
        ]);

        let normalizedEntry;

        if (type === "cas") {
            const entry = await CasApplication.findOne({
                _id: entryId,
                facultyId: facultyContext.faculty._id,
            });

            if (!entry) {
                return NextResponse.json(
                    { message: "Requested faculty report entry was not found." },
                    { status: 404 }
                );
            }

            normalizedEntry = {
                type: "cas" as const,
                data: {
                    promotionFrom: entry.currentDesignation,
                    promotionTo: entry.applyingForDesignation,
                    assessmentPeriodStart: String(entry.eligibilityPeriod?.fromYear ?? ""),
                    assessmentPeriodEnd: String(entry.eligibilityPeriod?.toYear ?? ""),
                    currentStage: entry.currentDesignation,
                    teachingExperienceYears: entry.experienceYears,
                    publicationCount: entry.achievements?.publications?.length ?? 0,
                    bookCount: entry.achievements?.books?.length ?? 0,
                    conferenceCount: entry.achievements?.conferences ?? 0,
                    workshopCount: 0,
                    projectCount: entry.achievements?.researchProjects?.length ?? 0,
                    phdSupervisionCount: entry.achievements?.phdGuided ?? 0,
                    adminResponsibilitySummary: entry.eligibility?.message ?? "",
                    researchSummary: `${entry.achievements?.publications?.length ?? 0} publications, ${entry.achievements?.researchProjects?.length ?? 0} projects`,
                    apiScoreClaimed: entry.apiScore?.totalScore ?? 0,
                },
            };
        } else {
            const entry = await FacultyPbasForm.findOne({
                _id: entryId,
                facultyId: facultyContext.faculty._id,
            });

            if (!entry) {
                return NextResponse.json(
                    { message: "Requested faculty report entry was not found." },
                    { status: 404 }
                );
            }

            const snapshot = await getPbasSnapshotForApplication(entry);

            normalizedEntry = {
                type: "pbas" as const,
                data: {
                    academicYear: entry.academicYear,
                    teachingHours:
                        Number(snapshot.category1.classesTaken ?? 0) +
                        Number(snapshot.category1.coursePreparationHours ?? 0),
                    coursesHandled: snapshot.category1.coursesTaught ?? [],
                    mentoringCount: snapshot.category1.mentoringCount ?? 0,
                    labSupervisionCount: snapshot.category1.labSupervisionCount ?? 0,
                    researchPaperCount: snapshot.category2.researchPapers?.length ?? 0,
                    journalCount: snapshot.category2.researchPapers?.length ?? 0,
                    bookCount: snapshot.category2.books?.length ?? 0,
                    patentCount: snapshot.category2.patents?.length ?? 0,
                    conferenceCount: snapshot.category2.conferences?.length ?? 0,
                    committeeWork:
                        snapshot.category3.committees?.map((item) => item.committeeName).join(", ") ??
                        "",
                    examDuties:
                        snapshot.category3.examDuties?.map((item) => item.duty).join(", ") ?? "",
                    studentGuidance:
                        snapshot.category3.studentGuidance?.map((item) => item.activity).join(", ") ??
                        "",
                    teachingScore: entry.apiScore?.teachingActivities ?? 0,
                    researchScore: entry.apiScore?.researchAcademicContribution ?? 0,
                    institutionalScore: entry.apiScore?.institutionalResponsibilities ?? 0,
                    totalApiScore: entry.apiScore?.totalScore ?? 0,
                    remarks:
                        entry.reviewCommittee?.[entry.reviewCommittee.length - 1]?.remarks ?? "",
                },
            };
        }

        const pdf = buildFacultyReportPdf(workspace, normalizedEntry);

        return new Response(pdf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${workspace.user.name.replace(/\s+/g, "-").toLowerCase()}-${type}-report.pdf"`,
            },
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
