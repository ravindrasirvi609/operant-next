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
import Internship from "@/models/student/internship";
import Placement from "@/models/student/placement";
import Student from "@/models/student/student";
import StudentAcademicRecord from "@/models/student/student-academic-record";
import StudentAqarEntry from "@/models/student/student-aqar-entry";
import StudentAward from "@/models/student/student-award";
import StudentCulturalParticipation from "@/models/student/student-cultural-participation";
import StudentEventParticipation from "@/models/student/student-event-participation";
import StudentPublication from "@/models/student/student-publication";
import StudentResearchProject from "@/models/student/student-research-project";
import StudentSkill from "@/models/student/student-skill";
import StudentSocialParticipation from "@/models/student/student-social-participation";
import StudentSport from "@/models/student/student-sport";
import Semester from "@/models/reference/semester";

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

function parseAcademicYearRange(academicYear: string) {
    const match = academicYear.trim().match(/(\d{4})\D+(\d{2,4})/);

    if (!match) {
        throw new AuthError(`Invalid academic year "${academicYear}".`, 400);
    }

    const startYear = Number(match[1]);
    const rawEndYear = Number(match[2]);
    const endYear =
        rawEndYear < 100
            ? Number(`${String(startYear).slice(0, 2)}${String(rawEndYear).padStart(2, "0")}`)
            : rawEndYear;

    return {
        startYear,
        endYear,
        startDate: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)),
    };
}

function buildInRangeOrCreatedFilter(
    primaryField: string,
    range: { startDate: Date; endDate: Date },
    secondaryField?: string
) {
    const conditions: Record<string, unknown>[] = [
        { [primaryField]: { $gte: range.startDate, $lte: range.endDate } },
    ];

    if (secondaryField) {
        conditions.push({ [secondaryField]: { $gte: range.startDate, $lte: range.endDate } });
    }

    conditions.push({ createdAt: { $gte: range.startDate, $lte: range.endDate } });

    return { $or: conditions };
}

async function syncStudentAqarEntries(cycleId: string, academicYear: string) {
    const range = parseAcademicYearRange(academicYear);
    const activeStudents = await Student.find({ status: "Active" }).select("_id").lean();
    const studentIds = activeStudents.map((student) => student._id);

    if (!studentIds.length) {
        await StudentAqarEntry.deleteMany({ aqarCycleId: cycleId });
        return;
    }

    const academicYearDoc = await (await import("@/models/reference/academic-year")).default.findOne({
        yearStart: range.startYear,
        yearEnd: range.endYear,
    }).select("_id");

    const semesterIds = academicYearDoc
        ? (
              await Semester.find({ academicYearId: academicYearDoc._id })
                  .select("_id")
                  .lean()
          ).map((semester) => semester._id)
        : [];

    const eventIds = (
        await (await import("@/models/reference/event")).default.find({
            ...buildInRangeOrCreatedFilter("startDate", range, "endDate"),
        })
            .select("_id")
            .lean()
    ).map((event) => event._id);

    const [
        academicCounts,
        publicationCounts,
        researchCounts,
        awardCounts,
        skillCounts,
        sportCounts,
        culturalCounts,
        eventCounts,
        socialCounts,
        placementCounts,
        internshipCounts,
    ] = await Promise.all([
        semesterIds.length
            ? StudentAcademicRecord.aggregate([
                  { $match: { semesterId: { $in: semesterIds } } },
                  { $group: { _id: "$studentId", count: { $sum: 1 } } },
              ])
            : [],
        StudentPublication.aggregate([
            { $match: buildInRangeOrCreatedFilter("publicationDate", range) },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        StudentResearchProject.aggregate([
            { $match: buildInRangeOrCreatedFilter("startDate", range, "endDate") },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        StudentAward.aggregate([
            { $match: buildInRangeOrCreatedFilter("awardDate", range) },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        StudentSkill.aggregate([
            { $match: buildInRangeOrCreatedFilter("startDate", range, "endDate") },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        StudentSport.aggregate([
            { $match: buildInRangeOrCreatedFilter("eventDate", range) },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        StudentCulturalParticipation.aggregate([
            { $match: buildInRangeOrCreatedFilter("date", range) },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        eventIds.length
            ? StudentEventParticipation.aggregate([
                  { $match: { eventId: { $in: eventIds } } },
                  { $group: { _id: "$studentId", count: { $sum: 1 } } },
              ])
            : [],
        StudentSocialParticipation.aggregate([
            { $match: buildInRangeOrCreatedFilter("date", range) },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        Placement.aggregate([
            { $match: buildInRangeOrCreatedFilter("offerDate", range, "joiningDate") },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
        Internship.aggregate([
            { $match: buildInRangeOrCreatedFilter("startDate", range, "endDate") },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
        ]),
    ]);

    const toCountMap = (rows: Array<{ _id: Types.ObjectId; count: number }>) =>
        new Map(rows.map((row) => [String(row._id), row.count]));

    const academicMap = toCountMap(academicCounts);
    const publicationMap = toCountMap(publicationCounts);
    const researchMap = toCountMap(researchCounts);
    const awardMap = toCountMap(awardCounts);
    const skillMap = toCountMap(skillCounts);
    const sportMap = toCountMap(sportCounts);
    const culturalMap = toCountMap(culturalCounts);
    const eventMap = toCountMap(eventCounts);
    const socialMap = toCountMap(socialCounts);
    const placementMap = toCountMap(placementCounts);
    const internshipMap = toCountMap(internshipCounts);

    const operations = studentIds.map((studentId) => {
        const key = String(studentId);
        const academicScore = academicMap.get(key) ?? 0;
        const activitiesScore =
            (awardMap.get(key) ?? 0) +
            (skillMap.get(key) ?? 0) +
            (culturalMap.get(key) ?? 0) +
            (eventMap.get(key) ?? 0) +
            (placementMap.get(key) ?? 0) +
            (internshipMap.get(key) ?? 0);
        const researchScore = (publicationMap.get(key) ?? 0) + (researchMap.get(key) ?? 0);
        const sportsScore = sportMap.get(key) ?? 0;
        const socialScore = socialMap.get(key) ?? 0;
        const overallScore =
            academicScore + activitiesScore + researchScore + sportsScore + socialScore;

        return {
            updateOne: {
                filter: {
                    aqarCycleId: new Types.ObjectId(cycleId),
                    studentId,
                },
                update: {
                    $set: {
                        academicScore,
                        activitiesScore,
                        researchScore,
                        sportsScore,
                        socialScore,
                        overallScore,
                    },
                },
                upsert: true,
            },
        };
    });

    if (operations.length) {
        await StudentAqarEntry.bulkWrite(operations);
    }

    await StudentAqarEntry.deleteMany({
        aqarCycleId: new Types.ObjectId(cycleId),
        studentId: { $nin: studentIds },
    });
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
        activeStudentCount,
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
        Student.countDocuments({ status: "Active" }),
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
        Placement.countDocuments(buildInRangeOrCreatedFilter("offerDate", parseAcademicYearRange(academicYear), "joiningDate")),
        Internship.countDocuments(buildInRangeOrCreatedFilter("startDate", parseAcademicYearRange(academicYear), "endDate")),
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
                activeStudents: activeStudentCount,
                approvedPbasReports: approvedPbasCount,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "User", label: "Active faculty", count: facultyCount },
                { sourceType: "Student", label: "Active student records", count: activeStudentCount },
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
            summary: "Student progression indicators aggregated from the active student placement and internship records.",
            metrics: {
                placements,
                internships,
                activeStudents: activeStudentCount,
            },
            completionPercent: 0,
            status: "Pending",
            sourceSnapshots: [
                { sourceType: "Placement", label: "Placement records", count: placements },
                { sourceType: "Internship", label: "Internship records", count: internships },
                { sourceType: "Student", label: "Active student records", count: activeStudentCount },
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
    await syncStudentAqarEntries(cycle._id.toString(), cycle.academicYear);

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
