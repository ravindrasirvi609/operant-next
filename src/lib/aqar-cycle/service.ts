import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import AqarApplication from "@/models/core/aqar-application";
import AqarCycle, { type IAqarCycleCriterion } from "@/models/core/aqar-cycle";
import CasApplication from "@/models/core/cas-application";
import MasterData from "@/models/core/master-data";
import Organization from "@/models/core/organization";
import User from "@/models/core/user";
import Program from "@/models/academic/program";
import StudentActivity from "@/models/academic/student-activity";
import SystemMisc from "@/models/engagement/system-misc";
import Publication from "@/models/research/publication";
import Project from "@/models/research/project";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import Faculty from "@/models/faculty/faculty";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyQualification from "@/models/faculty/faculty-qualification";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";

type SafeActor = {
    id: string;
    name: string;
    role: string;
};

function ensureAdmin(actor: SafeActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can manage institutional AQAR cycles.", 403);
    }
}

function pushCycleLog(
    cycle: InstanceType<typeof AqarCycle>,
    actor: SafeActor,
    action: string,
    remarks?: string
) {
    cycle.statusLogs.push({
        action,
        actorId: new Types.ObjectId(actor.id),
        actorName: actor.name,
        actorRole: actor.role,
        remarks,
        changedAt: new Date(),
    });
}

function metricCompletion(metrics: Record<string, number | string>) {
    const values = Object.values(metrics);
    if (!values.length) return 0;
    const populated = values.filter((value) =>
        typeof value === "number" ? value > 0 : String(value).trim().length > 0
    ).length;
    return Math.round((populated / values.length) * 100);
}

function criterionStatus(completionPercent: number): "Pending" | "Ready" | "Reviewed" {
    if (completionPercent >= 75) return "Ready";
    if (completionPercent > 0) return "Pending";
    return "Pending";
}

export async function createAqarCycle(
    actor: SafeActor,
    rawInput: { academicYear: string; reportingPeriod: { fromDate: string; toDate: string } }
) {
    ensureAdmin(actor);
    await dbConnect();

    const existing = await AqarCycle.findOne({ academicYear: rawInput.academicYear });
    if (existing) {
        throw new AuthError("An AQAR cycle already exists for this academic year.", 409);
    }

    const cycle = await AqarCycle.create({
        academicYear: rawInput.academicYear,
        reportingPeriod: rawInput.reportingPeriod,
        institutionProfile: {
            totalFaculty: 0,
            totalStudents: 0,
            totalDepartments: 0,
            totalPrograms: 0,
        },
        summaryMetrics: {
            approvedPbasReports: 0,
            casApplications: 0,
            facultyAqarContributions: 0,
            placements: 0,
            publications: 0,
            projects: 0,
        },
        criteriaSections: [],
        status: "Draft",
        preparedById: new Types.ObjectId(actor.id),
        preparedByName: actor.name,
        statusLogs: [
            {
                action: "Cycle Created",
                actorId: new Types.ObjectId(actor.id),
                actorName: actor.name,
                actorRole: actor.role,
                remarks: "Institutional AQAR cycle initialized.",
                changedAt: new Date(),
            },
        ],
    });

    return cycle;
}

export async function listAqarCycles(actor: SafeActor) {
    ensureAdmin(actor);
    await dbConnect();
    return AqarCycle.find().sort({ academicYear: -1, updatedAt: -1 });
}

export async function getAqarCycleById(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    await dbConnect();
    const cycle = await AqarCycle.findById(id);

    if (!cycle) {
        throw new AuthError("AQAR cycle not found.", 404);
    }

    return cycle;
}

async function buildCriteriaSections(academicYear: string): Promise<{
    institutionProfile: InstanceType<typeof AqarCycle>["institutionProfile"];
    summaryMetrics: InstanceType<typeof AqarCycle>["summaryMetrics"];
    criteriaSections: IAqarCycleCriterion[];
}> {
    const [
        facultyCount,
        studentCount,
        approvedStudentCount,
        departmentCount,
        collegeCount,
        universityCount,
        programCount,
        facultyRecords,
        qualifiedFacultyIds,
        facultyTeachingLoads,
        facultyAdminRoles,
        approvedPbasCount,
        casCount,
        facultyAqarContributions,
        placements,
        higherEducation,
        internships,
        publications,
        books,
        projects,
        facultyPublications,
        facultyProjects,
        collaborations,
        activeOfficeMasters,
        systemUpdates,
    ] = await Promise.all([
        User.countDocuments({ role: "Faculty", isActive: true }),
        User.countDocuments({ role: "Student", isActive: true }),
        User.countDocuments({ role: "Student", "studentDetails.profileStatus": "Approved" }),
        Organization.countDocuments({ type: "Department", isActive: true }),
        Organization.countDocuments({ type: "College", isActive: true }),
        Organization.countDocuments({ type: "University", isActive: true }),
        Program.countDocuments(),
        Faculty.find().select("administrativeResponsibilities"),
        FacultyQualification.distinct("facultyId"),
        FacultyTeachingLoad.find().select("facultyId courseName"),
        FacultyAdminRole.find().select("facultyId"),
        FacultyPbasForm.countDocuments({
            academicYear,
            status: { $in: ["Approved", "Committee Review", "Under Review", "Submitted"] },
        }),
        CasApplication.countDocuments({ applicationYear: academicYear }),
        AqarApplication.countDocuments({ academicYear }),
        StudentActivity.countDocuments({ year: academicYear, type: "Placement" }),
        StudentActivity.countDocuments({ year: academicYear, type: "HigherEducation" }),
        StudentActivity.countDocuments({ year: academicYear, type: "Internship" }),
        Publication.countDocuments({ year: academicYear }),
        Publication.countDocuments({ year: academicYear, type: { $in: ["Book", "BookChapter"] } }),
        Project.countDocuments(),
        FacultyPublication.countDocuments(),
        FacultyResearchProject.countDocuments(),
        Project.countDocuments({ type: "Collaboration" }),
        MasterData.countDocuments({ category: "office", isActive: true }),
        SystemMisc.countDocuments({ isActive: true }),
    ]);

    const averageCoursesTaught =
        facultyTeachingLoads.length > 0 && facultyRecords.length > 0
            ? Number(
                  (
                      facultyTeachingLoads.length /
                      facultyRecords.length
                  ).toFixed(1)
              )
            : 0;

    const qualifiedFaculty = qualifiedFacultyIds.length;

    const totalAdministrativeResponsibilities = facultyRecords.reduce(
        (sum, record) => sum + (record.administrativeResponsibilities?.length ?? 0),
        facultyAdminRoles.length
    );

    const criteriaSections: IAqarCycleCriterion[] = [
        {
            criterionCode: "C1",
            title: "Curricular Aspects",
            summary: "Programs, departments, and curricular breadth captured from institutional academic structures.",
            metrics: {
                programsOffered: programCount,
                departmentsReporting: departmentCount,
                collegesReporting: collegeCount,
                averageCoursesPerFaculty: averageCoursesTaught,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "Program", label: "Academic programs", count: programCount },
                { sourceType: "Organization", label: "Departments", count: departmentCount },
                { sourceType: "Organization", label: "Colleges", count: collegeCount },
            ],
        },
        {
            criterionCode: "C2",
            title: "Teaching, Learning and Evaluation",
            summary: "Faculty teaching capacity, student base, and approved annual academic reporting indicators.",
            metrics: {
                totalFaculty: facultyCount,
                totalStudents: studentCount,
                approvedStudents: approvedStudentCount,
                approvedPbasReports: approvedPbasCount,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "User", label: "Active faculty", count: facultyCount },
                { sourceType: "User", label: "Approved students", count: approvedStudentCount },
                { sourceType: "PBAS", label: "PBAS reports linked", count: approvedPbasCount },
            ],
        },
        {
            criterionCode: "C3",
            title: "Research, Innovations and Extension",
            summary: "Institutional research output and extension activity aggregated from PBAS, AQAR, publication, and project modules.",
            metrics: {
                facultyPublications: publications,
                booksAndChapters: books + facultyPublications,
                projectsAndMoUs: projects + facultyProjects,
                facultyAqarContributions,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "Publication", label: "Research publications", count: publications },
                { sourceType: "Project", label: "Projects and MoUs", count: projects },
                { sourceType: "AQARContribution", label: "Faculty AQAR entries", count: facultyAqarContributions },
            ],
        },
        {
            criterionCode: "C4",
            title: "Infrastructure and Learning Resources",
            summary: "Organizational learning-resource readiness and institutional support structures available for accreditation reporting.",
            metrics: {
                universities: universityCount,
                colleges: collegeCount,
                departments: departmentCount,
                officesAndSupportUnits: activeOfficeMasters,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "Organization", label: "Universities", count: universityCount },
                { sourceType: "Organization", label: "Colleges", count: collegeCount },
                { sourceType: "MasterData", label: "Administrative offices", count: activeOfficeMasters },
            ],
        },
        {
            criterionCode: "C5",
            title: "Student Support and Progression",
            summary: "Student progression indicators aggregated from student activities and approved student records.",
            metrics: {
                placements,
                higherEducation,
                internships,
                approvedStudents: approvedStudentCount,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "StudentActivity", label: "Placement records", count: placements },
                { sourceType: "StudentActivity", label: "Higher education records", count: higherEducation },
                { sourceType: "StudentActivity", label: "Internship records", count: internships },
            ],
        },
        {
            criterionCode: "C6",
            title: "Governance, Leadership and Management",
            summary: "Leadership and quality-governance readiness synthesized from users, responsibilities, and operational notices.",
            metrics: {
                adminAndLeadershipUsers: await User.countDocuments({ role: { $in: ["Admin", "Director", "PRO", "Placement"] } }),
                administrativeResponsibilities: totalAdministrativeResponsibilities,
                activeSystemUpdates: systemUpdates,
                casApplications: casCount,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "User", label: "Leadership roles", count: await User.countDocuments({ role: { $in: ["Admin", "Director", "PRO", "Placement"] } }) },
                { sourceType: "FacultyProfile", label: "Administrative responsibilities", count: totalAdministrativeResponsibilities },
                { sourceType: "SystemMisc", label: "Operational notices", count: systemUpdates },
            ],
        },
        {
            criterionCode: "C7",
            title: "Institutional Values and Best Practices",
            summary: "Institutional values, best practices, and outreach indicators built from AQAR quality narratives and collaboration footprints.",
            metrics: {
                qualifiedFacultyProfiles: qualifiedFaculty,
                collaborations,
                facultyAqarNarratives: facultyAqarContributions,
                outreachIndicators: placements + internships,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "FacultyProfile", label: "Faculty with qualification records", count: qualifiedFaculty },
                { sourceType: "Project", label: "Collaborations", count: collaborations },
                { sourceType: "AQARContribution", label: "AQAR narratives", count: facultyAqarContributions },
            ],
        },
    ];

    const finalizedCriteria = criteriaSections.map((criterion) => {
        const completionPercent = metricCompletion(criterion.metrics);
        return {
            ...criterion,
            completionPercent,
            status: criterionStatus(completionPercent),
        };
    });

    return {
        institutionProfile: {
            universityName: undefined,
            collegeName: undefined,
            totalFaculty: facultyCount,
            totalStudents: studentCount,
            totalDepartments: departmentCount,
            totalPrograms: programCount,
        },
        summaryMetrics: {
            approvedPbasReports: approvedPbasCount,
            casApplications: casCount,
            facultyAqarContributions,
            placements,
            publications,
            projects,
        },
        criteriaSections: finalizedCriteria,
    };
}

export async function generateAqarCycleSnapshot(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    await dbConnect();
    const cycle = await AqarCycle.findById(id);

    if (!cycle) {
        throw new AuthError("AQAR cycle not found.", 404);
    }

    const aggregated = await buildCriteriaSections(cycle.academicYear);
    cycle.institutionProfile = aggregated.institutionProfile;
    cycle.summaryMetrics = aggregated.summaryMetrics;
    cycle.criteriaSections = aggregated.criteriaSections;
    cycle.preparedById = new Types.ObjectId(actor.id);
    cycle.preparedByName = actor.name;

    pushCycleLog(cycle, actor, "Snapshot Generated", "Institutional AQAR criteria were refreshed from source modules.");
    await cycle.save();

    return cycle;
}

export async function updateAqarCycle(
    actor: SafeActor,
    id: string,
    rawInput: {
        status?: "Draft" | "Department Review" | "IQAC Review" | "Finalized" | "Submitted";
        criteriaSections?: Array<{
            criterionCode: string;
            narrative?: string;
            summary?: string;
            status?: "Pending" | "Ready" | "Reviewed";
        }>;
    }
) {
    ensureAdmin(actor);
    const cycle = await getAqarCycleById(actor, id);

    if (rawInput.criteriaSections?.length) {
        const updates = new Map(
            rawInput.criteriaSections.map((item) => [item.criterionCode, item])
        );
        cycle.criteriaSections = cycle.criteriaSections.map((criterion) => {
            const update = updates.get(criterion.criterionCode);
            if (!update) return criterion;

            return {
                criterionCode: criterion.criterionCode,
                title: criterion.title,
                summary: update.summary ?? criterion.summary,
                narrative: update.narrative ?? criterion.narrative,
                metrics: criterion.metrics,
                completionPercent: criterion.completionPercent,
                status: update.status ?? criterion.status,
                sourceSnapshots: criterion.sourceSnapshots,
            };
        }) as typeof cycle.criteriaSections;
    }

    if (rawInput.status) {
        cycle.status = rawInput.status;
        pushCycleLog(cycle, actor, `Status Changed: ${rawInput.status}`, "AQAR cycle workflow status updated.");
    } else {
        pushCycleLog(cycle, actor, "Cycle Updated", "AQAR narratives or criterion statuses updated.");
    }

    await cycle.save();
    return cycle;
}

export async function finalizeAqarCycle(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    const cycle = await getAqarCycleById(actor, id);

    cycle.status = "Finalized";
    cycle.finalizedAt = new Date();
    pushCycleLog(cycle, actor, "Cycle Finalized", "Institutional AQAR cycle locked for submission review.");
    await cycle.save();

    return cycle;
}

export async function submitAqarCycle(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    const cycle = await getAqarCycleById(actor, id);

    if (cycle.status !== "Finalized") {
        throw new AuthError("AQAR cycle must be finalized before submission.", 409);
    }

    cycle.status = "Submitted";
    cycle.submittedAt = new Date();
    pushCycleLog(cycle, actor, "Cycle Submitted", "Institutional AQAR cycle marked as submitted.");
    await cycle.save();

    return cycle;
}
