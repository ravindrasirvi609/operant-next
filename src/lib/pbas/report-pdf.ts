import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";
import Department from "@/models/reference/department";
import Institution from "@/models/reference/institution";
import { getPbasSnapshotForApplication } from "@/lib/pbas/service";
import { buildTemplatedPdf } from "@/lib/report-templates/pdf";
import { renderReportTemplate } from "@/lib/report-templates/service";

export async function buildPbasReportPdf(application: InstanceType<typeof FacultyPbasForm>) {
    const snapshot = await getPbasSnapshotForApplication(application);
    const faculty = await Faculty.findById(application.facultyId).select(
        "firstName lastName email designation departmentId institutionId userId"
    );
    const user = faculty?.userId ? await User.findById(faculty.userId).select("name email") : null;
    const department = faculty?.departmentId
        ? await Department.findById(faculty.departmentId).select("name")
        : null;
    const institution = faculty?.institutionId
        ? await Institution.findById(faculty.institutionId).select("name")
        : null;

    const facultyName =
        faculty ? `${faculty.firstName} ${faculty.lastName ?? ""}`.trim() : user?.name ?? "Faculty Member";
    const facultyEmail = faculty?.email ?? user?.email;
    const template = await renderReportTemplate("PBAS_APPRAISAL", {
        facultyName,
        facultyDesignation: application.currentDesignation || faculty?.designation || "Faculty",
        facultyMeta: [facultyEmail, department?.name, institution?.name].filter(Boolean).join(" | "),
        academicYear: application.academicYear,
        appraisalFromDate: application.appraisalPeriod.fromDate,
        appraisalToDate: application.appraisalPeriod.toDate,
        workflowStatus: application.status,
        classesTaken: snapshot.category1.classesTaken,
        coursePreparationHours: snapshot.category1.coursePreparationHours,
        coursesTaught: snapshot.category1.coursesTaught.join(", ") || "-",
        mentoringCount: snapshot.category1.mentoringCount,
        labSupervisionCount: snapshot.category1.labSupervisionCount,
        feedbackSummary: snapshot.category1.feedbackSummary || "-",
        researchPaperCount: snapshot.category2.researchPapers.length,
        bookCount: snapshot.category2.books.length,
        patentCount: snapshot.category2.patents.length,
        conferenceCount: snapshot.category2.conferences.length,
        projectCount: snapshot.category2.projects.length,
        paperHighlights:
            snapshot.category2.researchPapers.map((item) => `${item.title} (${item.year})`).join("; ") || "-",
        committeeSummary: snapshot.category3.committees.map((item) => item.committeeName).join(", ") || "-",
        administrativeDutySummary:
            snapshot.category3.administrativeDuties.map((item) => item.title).join(", ") || "-",
        examDutySummary: snapshot.category3.examDuties.map((item) => item.duty).join(", ") || "-",
        studentGuidanceSummary:
            snapshot.category3.studentGuidance.map((item) => `${item.activity} (${item.count})`).join(", ") || "-",
        extensionSummary:
            snapshot.category3.extensionActivities.map((item) => item.title).join(", ") || "-",
        teachingScore: application.apiScore.teachingActivities,
        researchScore: application.apiScore.researchAcademicContribution,
        institutionalScore: application.apiScore.institutionalResponsibilities,
        totalScore: application.apiScore.totalScore,
    });

    return buildTemplatedPdf(template);
}
