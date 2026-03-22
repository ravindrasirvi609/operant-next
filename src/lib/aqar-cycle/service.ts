import { Types } from "mongoose";

import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
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
import {
    getNaacCriterionMeta,
    getNaacMetricMeta,
} from "@/lib/naac-criteria-mapping/catalog";
import {
    ensureNaacCriteriaMappingsSeeded,
    listNaacCriteriaMappings,
} from "@/lib/naac-criteria-mapping/service";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    auditContext?: AuditRequestContext;
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

function isMetricValuePopulated(value: number | string | undefined) {
    if (typeof value === "number") {
        return value > 0;
    }

    return String(value ?? "").trim().length > 0;
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

    await createAuditLog({
        actor,
        action: "AQAR_CYCLE_CREATE",
        tableName: "aqar_cycles",
        recordId: cycle._id.toString(),
        newData: {
            academicYear: cycle.academicYear,
            reportingPeriod: cycle.reportingPeriod,
            status: cycle.status,
        },
        auditContext: actor.auditContext,
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
    await ensureNaacCriteriaMappingsSeeded();
    const range = parseAcademicYearRange(academicYear);
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
        leadershipUsers,
        mappings,
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
        Placement.countDocuments(buildInRangeOrCreatedFilter("offerDate", range, "joiningDate")),
        Internship.countDocuments(buildInRangeOrCreatedFilter("startDate", range, "endDate")),
        Publication.countDocuments({ year: academicYear }),
        Publication.countDocuments({ year: academicYear, type: { $in: ["Book", "BookChapter"] } }),
        Project.countDocuments(),
        FacultyPublication.countDocuments(),
        FacultyResearchProject.countDocuments(),
        Project.countDocuments({ type: "Collaboration" }),
        MasterData.countDocuments({ category: "office", isActive: true }),
        SystemMisc.countDocuments({ isActive: true }),
        User.countDocuments({ role: { $in: ["Admin", "Director", "PRO", "Placement"] } }),
        listNaacCriteriaMappings(),
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

    const metricRegistry = new Map<
        string,
        {
            tableName: string;
            fieldReference: string;
            value: number | string;
        }
    >([
        ["Program:programsOffered", { tableName: "Program", fieldReference: "programsOffered", value: programCount }],
        ["Organization:departmentsReporting", { tableName: "Organization", fieldReference: "departmentsReporting", value: departmentCount }],
        ["Organization:collegesReporting", { tableName: "Organization", fieldReference: "collegesReporting", value: collegeCount }],
        ["FacultyTeachingLoad:averageCoursesPerFaculty", { tableName: "FacultyTeachingLoad", fieldReference: "averageCoursesPerFaculty", value: averageCoursesTaught }],
        ["User:totalFaculty", { tableName: "User", fieldReference: "totalFaculty", value: facultyCount }],
        ["User:totalStudents", { tableName: "User", fieldReference: "totalStudents", value: studentCount }],
        ["Student:activeStudents", { tableName: "Student", fieldReference: "activeStudents", value: activeStudentCount }],
        ["FacultyPbasForm:approvedPbasReports", { tableName: "FacultyPbasForm", fieldReference: "approvedPbasReports", value: approvedPbasCount }],
        ["Publication:facultyPublications", { tableName: "Publication", fieldReference: "facultyPublications", value: publications }],
        ["Publication:booksAndChapters", { tableName: "Publication", fieldReference: "booksAndChapters", value: books + facultyPublications }],
        ["Project:projectsAndMoUs", { tableName: "Project", fieldReference: "projectsAndMoUs", value: projects + facultyProjects }],
        ["AqarApplication:facultyAqarContributions", { tableName: "AqarApplication", fieldReference: "facultyAqarContributions", value: facultyAqarContributions }],
        ["Organization:universities", { tableName: "Organization", fieldReference: "universities", value: universityCount }],
        ["Organization:colleges", { tableName: "Organization", fieldReference: "colleges", value: collegeCount }],
        ["Organization:departments", { tableName: "Organization", fieldReference: "departments", value: departmentCount }],
        ["MasterData:officesAndSupportUnits", { tableName: "MasterData", fieldReference: "officesAndSupportUnits", value: activeOfficeMasters }],
        ["Placement:placements", { tableName: "Placement", fieldReference: "placements", value: placements }],
        ["Internship:internships", { tableName: "Internship", fieldReference: "internships", value: internships }],
        ["User:adminAndLeadershipUsers", { tableName: "User", fieldReference: "adminAndLeadershipUsers", value: leadershipUsers }],
        ["Faculty:administrativeResponsibilities", { tableName: "Faculty", fieldReference: "administrativeResponsibilities", value: totalAdministrativeResponsibilities }],
        ["SystemMisc:activeSystemUpdates", { tableName: "SystemMisc", fieldReference: "activeSystemUpdates", value: systemUpdates }],
        ["CasApplication:casApplications", { tableName: "CasApplication", fieldReference: "casApplications", value: casCount }],
        ["FacultyQualification:qualifiedFacultyProfiles", { tableName: "FacultyQualification", fieldReference: "qualifiedFacultyProfiles", value: qualifiedFaculty }],
        ["Project:collaborations", { tableName: "Project", fieldReference: "collaborations", value: collaborations }],
        ["AqarApplication:facultyAqarNarratives", { tableName: "AqarApplication", fieldReference: "facultyAqarNarratives", value: facultyAqarContributions }],
        ["StudentProgression:outreachIndicators", { tableName: "StudentProgression", fieldReference: "outreachIndicators", value: placements + internships }],
    ]);

    const groupedCriteria = new Map<string, {
        title: string;
        summary: string;
        metrics: Record<string, number | string>;
        sourceSnapshots: IAqarCycleCriterion["sourceSnapshots"];
        completionWeight: number;
        totalWeight: number;
    }>();

    for (const mapping of mappings) {
        const criterionMeta = getNaacCriterionMeta(mapping.criteriaCode);
        const metricMeta = getNaacMetricMeta(mapping.tableName, mapping.fieldReference);
        const metricValue = metricRegistry.get(`${mapping.tableName}:${mapping.fieldReference}`)?.value ?? 0;
        const weight = Number(mapping.weightage ?? 0) || 1;
        const current = groupedCriteria.get(mapping.criteriaCode) ?? {
            title: mapping.criteriaName,
            summary:
                criterionMeta?.summary ??
                `${mapping.criteriaName} auto-generated from configured NAAC source mappings.`,
            metrics: {},
            sourceSnapshots: [],
            completionWeight: 0,
            totalWeight: 0,
        };

        current.title = mapping.criteriaName;
        current.metrics[mapping.fieldReference] = metricValue;
        current.totalWeight += weight;
        if (isMetricValuePopulated(metricValue)) {
            current.completionWeight += weight;
        }

        const snapshotLabel =
            metricMeta?.sourceLabel ??
            mapping.fieldReference;
        const snapshotSourceType =
            metricMeta?.sourceType ??
            mapping.tableName;

        const existingSnapshot = current.sourceSnapshots.some(
            (snapshot) =>
                snapshot.sourceType === snapshotSourceType &&
                snapshot.label === snapshotLabel
        );

        if (!existingSnapshot) {
            current.sourceSnapshots.push(
                typeof metricValue === "number"
                    ? {
                          sourceType: snapshotSourceType,
                          label: snapshotLabel,
                          count: metricValue,
                      }
                    : {
                          sourceType: snapshotSourceType,
                          label: snapshotLabel,
                          value: String(metricValue),
                      }
            );
        }

        groupedCriteria.set(mapping.criteriaCode, current);
    }

    const criteriaSections: IAqarCycleCriterion[] = Array.from(groupedCriteria.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([criteriaCode, criterion]) => {
            const completionPercent = criterion.totalWeight
                ? Math.round((criterion.completionWeight / criterion.totalWeight) * 100)
                : metricCompletion(criterion.metrics);

            return {
                criterionCode: criteriaCode as IAqarCycleCriterion["criterionCode"],
                title: criterion.title,
                summary: criterion.summary,
                metrics: criterion.metrics,
                completionPercent,
                status: criterionStatus(completionPercent),
                sourceSnapshots: criterion.sourceSnapshots,
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
        criteriaSections,
    };
}

export async function generateAqarCycleSnapshot(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    await dbConnect();
    const cycle = await AqarCycle.findById(id);

    if (!cycle) {
        throw new AuthError("AQAR cycle not found.", 404);
    }

    const oldState = cycle.toObject();

    const aggregated = await buildCriteriaSections(cycle.academicYear);
    const existingCriteria = new Map(
        cycle.criteriaSections.map((criterion) => [criterion.criterionCode, criterion])
    );
    cycle.institutionProfile = aggregated.institutionProfile;
    cycle.summaryMetrics = aggregated.summaryMetrics;
    cycle.criteriaSections = aggregated.criteriaSections.map((criterion) => {
        const existing = existingCriteria.get(criterion.criterionCode);
        if (!existing) {
            return criterion;
        }

        return {
            ...criterion,
            narrative: existing.narrative,
            status: existing.status === "Reviewed" ? "Reviewed" : criterion.status,
        };
    }) as typeof cycle.criteriaSections;
    cycle.preparedById = new Types.ObjectId(actor.id);
    cycle.preparedByName = actor.name;

    pushCycleLog(cycle, actor, "Snapshot Generated", "Institutional AQAR criteria were refreshed from source modules.");
    await cycle.save();
    await syncStudentAqarEntries(cycle._id.toString(), cycle.academicYear);

    await createAuditLog({
        actor,
        action: "AQAR_CYCLE_GENERATE",
        tableName: "aqar_cycles",
        recordId: cycle._id.toString(),
        oldData: oldState,
        newData: cycle.toObject(),
        auditContext: actor.auditContext,
    });

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
    const oldState = cycle.toObject();

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

    await createAuditLog({
        actor,
        action: "AQAR_CYCLE_UPDATE",
        tableName: "aqar_cycles",
        recordId: cycle._id.toString(),
        oldData: oldState,
        newData: cycle.toObject(),
        auditContext: actor.auditContext,
    });

    return cycle;
}

export async function finalizeAqarCycle(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    const cycle = await getAqarCycleById(actor, id);
    const oldState = cycle.toObject();

    cycle.status = "Finalized";
    cycle.finalizedAt = new Date();
    pushCycleLog(cycle, actor, "Cycle Finalized", "Institutional AQAR cycle locked for submission review.");
    await cycle.save();

    await createAuditLog({
        actor,
        action: "AQAR_CYCLE_FINALIZE",
        tableName: "aqar_cycles",
        recordId: cycle._id.toString(),
        oldData: oldState,
        newData: cycle.toObject(),
        auditContext: actor.auditContext,
    });

    return cycle;
}

export async function submitAqarCycle(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    const cycle = await getAqarCycleById(actor, id);

    if (cycle.status !== "Finalized") {
        throw new AuthError("AQAR cycle must be finalized before submission.", 409);
    }

    const oldState = cycle.toObject();

    cycle.status = "Submitted";
    cycle.submittedAt = new Date();
    pushCycleLog(cycle, actor, "Cycle Submitted", "Institutional AQAR cycle marked as submitted.");
    await cycle.save();

    await createAuditLog({
        actor,
        action: "AQAR_CYCLE_SUBMIT",
        tableName: "aqar_cycles",
        recordId: cycle._id.toString(),
        oldData: oldState,
        newData: cycle.toObject(),
        auditContext: actor.auditContext,
    });

    return cycle;
}
