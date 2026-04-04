import { Types } from "mongoose";

import { formatAcademicYearLabel, parseAcademicYearLabel } from "@/lib/academic-year";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import {
    defaultNaacCriteriaMappings,
    naacManualMetricCatalog,
    naacCriterionCatalog,
    naacMetricCatalog,
} from "@/lib/naac-criteria-mapping/catalog";
import { listNaacCriteriaMappings } from "@/lib/naac-criteria-mapping/service";
import { resolveAuthorizationProfile, type AuthorizationActor } from "@/lib/authorization/service";
import type { INaacMetricValueSourceSnapshot } from "@/models/reporting/naac-metric-value";
import AcademicYear from "@/models/reference/academic-year";
import User from "@/models/core/user";
import Student from "@/models/student/student";
import Organization from "@/models/core/organization";
import Program from "@/models/academic/program";
import Faculty from "@/models/faculty/faculty";
import FacultyQualification from "@/models/faculty/faculty-qualification";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import CasApplication from "@/models/core/cas-application";
import AqarApplication from "@/models/core/aqar-application";
import Placement from "@/models/student/placement";
import Internship from "@/models/student/internship";
import Publication from "@/models/research/publication";
import Project from "@/models/research/project";
import MasterData from "@/models/core/master-data";
import SystemMisc from "@/models/engagement/system-misc";
import LeadershipAssignment from "@/models/core/leadership-assignment";
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import SssSurvey from "@/models/engagement/sss-survey";
import SssResultAnalytics from "@/models/engagement/sss-result-analytics";
import AisheSurveyCycle from "@/models/reporting/aishe-survey-cycle";
import AisheStudentEnrollment from "@/models/reporting/aishe-student-enrollment";
import AisheFacultyStatistic from "@/models/reporting/aishe-faculty-statistic";
import NirfRankingCycle from "@/models/reporting/nirf-ranking-cycle";
import NirfCompositeScore from "@/models/reporting/nirf-composite-score";
import InstitutionalApproval from "@/models/core/institutional-approval";
import ComplianceActionItem from "@/models/core/compliance-action-item";
import NaacMetricDefinition from "@/models/reporting/naac-metric-definition";
import NaacMetricCycle from "@/models/reporting/naac-metric-cycle";
import NaacMetricValue from "@/models/reporting/naac-metric-value";
import NaacMetricSyncRun from "@/models/reporting/naac-metric-sync-run";
import {
    naacMetricCycleCreateSchema,
    naacMetricValueManualUpdateSchema,
    naacMetricValueReviewSchema,
} from "@/lib/naac-metric-warehouse/validators";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    auditContext?: AuditRequestContext;
};

type MetricComputation = {
    numericValue?: number;
    textValue?: string;
    sourceSnapshots: INaacMetricValueSourceSnapshot[];
};

const generatedStatuses = new Set(["Generated", "Reviewed", "Overridden"]);
const seededMetricCatalog = [...naacMetricCatalog, ...naacManualMetricCatalog] as const;

function ensureAdmin(actor: SafeActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

function createMetricKey(tableName: string, fieldReference: string) {
    return `${tableName}:${fieldReference}`;
}

function createMetricCode(criteriaCode: string, fieldReference: string) {
    return `${criteriaCode}_${fieldReference}`
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .toUpperCase();
}

function parseAcademicYearRange(label: string) {
    const parsed = parseAcademicYearLabel(label);

    if (!parsed) {
        throw new AuthError(`Invalid academic year label "${label}".`, 400);
    }

    return {
        startDate: new Date(`${parsed.start}-06-01T00:00:00.000Z`),
        endDate: new Date(`${parsed.end}-05-31T23:59:59.999Z`),
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

function limitRecordIds(values: Array<string | Types.ObjectId>, limit = 50) {
    return values.slice(0, limit).map((value) => String(value));
}

function formatMetricValueText(input: { numericValue?: number; textValue?: string }) {
    if (typeof input.numericValue === "number" && Number.isFinite(input.numericValue)) {
        return String(input.numericValue);
    }

    return input.textValue?.trim() || "";
}

function getEffectiveValue(metric: {
    overrideNumericValue?: number | null;
    overrideTextValue?: string | null;
    numericValue?: number | null;
    textValue?: string | null;
}) {
    if (typeof metric.overrideNumericValue === "number" && Number.isFinite(metric.overrideNumericValue)) {
        return String(metric.overrideNumericValue);
    }

    if (metric.overrideTextValue?.trim()) {
        return metric.overrideTextValue.trim();
    }

    if (typeof metric.numericValue === "number" && Number.isFinite(metric.numericValue)) {
        return String(metric.numericValue);
    }

    return metric.textValue?.trim() || "";
}

async function resolveAcademicYearFromInput(input: { academicYearId?: string; academicYear?: string }) {
    const normalizedId = input.academicYearId?.trim();

    if (normalizedId) {
        if (!Types.ObjectId.isValid(normalizedId)) {
            throw new AuthError("Invalid academic year id.", 400);
        }

        const year = await AcademicYear.findById(normalizedId).select("_id yearStart yearEnd");
        if (!year) {
            throw new AuthError("Academic year not found.", 404);
        }

        return {
            id: year._id,
            label: formatAcademicYearLabel(year.yearStart, year.yearEnd),
        };
    }

    const normalizedLabel = input.academicYear?.trim();
    const parsed = parseAcademicYearLabel(normalizedLabel);

    if (!parsed) {
        throw new AuthError("Academic year is required.", 400);
    }

    const year = await AcademicYear.findOne({
        yearStart: parsed.start,
        yearEnd: parsed.end,
    }).select("_id yearStart yearEnd");

    if (!year) {
        throw new AuthError(
            `Academic year "${normalizedLabel}" is not configured. Add it in Admin > Academics first.`,
            400
        );
    }

    return {
        id: year._id,
        label: formatAcademicYearLabel(year.yearStart, year.yearEnd),
    };
}

function createSourceSnapshot(
    sourceType: string,
    label: string,
    collectionName: string,
    recordIds: Array<string | Types.ObjectId>,
    value?: number | string
): INaacMetricValueSourceSnapshot {
    return typeof value === "number"
        ? {
              sourceType,
              label,
              collectionName,
              count: value,
              recordIds: limitRecordIds(recordIds),
          }
        : {
              sourceType,
              label,
              collectionName,
              value: String(value ?? ""),
              recordIds: limitRecordIds(recordIds),
          };
}

async function refreshCycleCounters(cycleId: string | Types.ObjectId) {
    const resolvedId = typeof cycleId === "string" ? new Types.ObjectId(cycleId) : cycleId;
    const values = await NaacMetricValue.find({ cycleId: resolvedId }).select("status");

    const generatedMetricCount = values.filter((item) => generatedStatuses.has(item.status)).length;
    const reviewedMetricCount = values.filter((item) => item.status === "Reviewed").length;
    const overriddenMetricCount = values.filter((item) => item.status === "Overridden").length;

    await NaacMetricCycle.findByIdAndUpdate(resolvedId, {
        $set: {
            generatedMetricCount,
            reviewedMetricCount,
            overriddenMetricCount,
        },
    });
}

async function buildMetricComputations(
    academicYearLabel: string,
    academicYearId?: Types.ObjectId
) {
    const range = parseAcademicYearRange(academicYearLabel);
    const academicYear = parseAcademicYearLabel(academicYearLabel);

    const [
        facultyUsers,
        studentUsers,
        activeStudents,
        departmentOrganizations,
        collegeOrganizations,
        universityOrganizations,
        programs,
        facultyRecords,
        qualifiedFacultyIds,
        teachingLoads,
        facultyAdminRoles,
        approvedPbasForms,
        casApplications,
        aqarApplications,
        placements,
        internships,
        publications,
        facultyPublications,
        projects,
        facultyProjects,
        activeOffices,
        activeSystemUpdates,
        leadershipAssignments,
        committeeMemberships,
        sssSurveys,
        sssAnalytics,
        aisheCycles,
        aisheEnrollments,
        aisheFacultyStatistics,
        nirfCycles,
        nirfCompositeScores,
        institutionalApprovals,
        complianceActionItems,
    ] = await Promise.all([
        User.find({ role: "Faculty", isActive: true }).select("_id").lean(),
        User.find({ role: "Student", isActive: true }).select("_id").lean(),
        Student.find({ status: "Active" }).select("_id").lean(),
        Organization.find({ type: "Department", isActive: true }).select("_id").lean(),
        Organization.find({ type: "College", isActive: true }).select("_id").lean(),
        Organization.find({ type: "University", isActive: true }).select("_id").lean(),
        Program.find({}).select("_id").lean(),
        Faculty.find({}).select("_id administrativeResponsibilities").lean(),
        FacultyQualification.distinct("facultyId"),
        FacultyTeachingLoad.find(
            academicYearId ? { academicYearId } : {}
        ).select("_id facultyId").lean(),
        FacultyAdminRole.find(
            academicYearId ? { academicYearId } : {}
        ).select("_id facultyId").lean(),
        FacultyPbasForm.find(
            academicYearId
                ? {
                      $or: [{ academicYearId }, { academicYear: academicYearLabel }],
                      status: { $in: ["Approved", "Committee Review", "Under Review", "Submitted"] },
                  }
                : {
                      academicYear: academicYearLabel,
                      status: { $in: ["Approved", "Committee Review", "Under Review", "Submitted"] },
                  }
        )
            .select("_id")
            .lean(),
        CasApplication.find(
            academicYearId
                ? {
                      $or: [{ applicationYearId: academicYearId }, { applicationYear: academicYearLabel }],
                  }
                : { applicationYear: academicYearLabel }
        )
            .select("_id")
            .lean(),
        AqarApplication.find(
            academicYearId
                ? { $or: [{ academicYearId }, { academicYear: academicYearLabel }] }
                : { academicYear: academicYearLabel }
        )
            .select("_id")
            .lean(),
        Placement.find(buildInRangeOrCreatedFilter("offerDate", range, "joiningDate")).select("_id").lean(),
        Internship.find(buildInRangeOrCreatedFilter("startDate", range, "endDate")).select("_id").lean(),
        Publication.find({ year: academicYearLabel }).select("_id type").lean(),
        FacultyPublication.find(buildInRangeOrCreatedFilter("publicationDate", range)).select("_id").lean(),
        Project.find(buildInRangeOrCreatedFilter("fromDate", range, "toDate")).select("_id type").lean(),
        FacultyResearchProject.find(buildInRangeOrCreatedFilter("startDate", range, "endDate")).select("_id").lean(),
        MasterData.find({ category: "office", isActive: true }).select("_id").lean(),
        SystemMisc.find({ isActive: true }).select("_id").lean(),
        LeadershipAssignment.find({ isActive: true }).select("_id userId").lean(),
        GovernanceCommitteeMembership.find({
            isActive: true,
            userId: { $exists: true, $ne: null },
        })
            .select("_id userId")
            .lean(),
        SssSurvey.find(academicYearId ? { academicYearId } : {}).select("_id academicYearId endDate").lean(),
        SssResultAnalytics.find({}).select("_id surveyId overallSatisfactionIndex responseRate").lean(),
        AisheSurveyCycle.find(academicYearId ? { academicYearId } : {}).select("_id academicYearId surveyYearLabel").lean(),
        AisheStudentEnrollment.find({}).select("_id surveyCycleId maleStudents femaleStudents transgenderStudents").lean(),
        AisheFacultyStatistic.find({}).select("_id surveyCycleId totalFaculty").lean(),
        academicYear
            ? NirfRankingCycle.find({ rankingYear: { $in: [academicYear.start, academicYear.end] } })
                  .select("_id rankingYear frameworkType")
                  .lean()
            : [],
        NirfCompositeScore.find({}).select("_id rankingCycleId totalScore predictedRank").lean(),
        InstitutionalApproval.find({
            status: "Active",
            $and: [
                {
                    $or: [
                        { approvalStartDate: { $exists: false } },
                        { approvalStartDate: { $lte: range.endDate } },
                    ],
                },
                {
                    $or: [
                        { approvalEndDate: { $exists: false } },
                        { approvalEndDate: { $gte: range.startDate } },
                    ],
                },
            ],
        })
            .select("_id")
            .lean(),
        ComplianceActionItem.find(buildInRangeOrCreatedFilter("targetCompletionDate", range))
            .select("_id completionStatus")
            .lean(),
    ]);

    const facultyIds = facultyUsers.map((item) => item._id);
    const studentIds = studentUsers.map((item) => item._id);
    const activeStudentIds = activeStudents.map((item) => item._id);
    const departmentIds = departmentOrganizations.map((item) => item._id);
    const collegeIds = collegeOrganizations.map((item) => item._id);
    const universityIds = universityOrganizations.map((item) => item._id);
    const programIds = programs.map((item) => item._id);
    const teachingLoadIds = teachingLoads.map((item) => item._id);
    const pbasIds = approvedPbasForms.map((item) => item._id);
    const casIds = casApplications.map((item) => item._id);
    const aqarIds = aqarApplications.map((item) => item._id);
    const placementIds = placements.map((item) => item._id);
    const internshipIds = internships.map((item) => item._id);
    const publicationIds = publications.map((item) => item._id);
    const bookPublicationIds = publications
        .filter((item) => item.type === "Book" || item.type === "BookChapter")
        .map((item) => item._id);
    const facultyPublicationIds = facultyPublications.map((item) => item._id);
    const projectIds = projects.map((item) => item._id);
    const collaborationIds = projects
        .filter((item) => item.type === "Collaboration")
        .map((item) => item._id);
    const facultyProjectIds = facultyProjects.map((item) => item._id);
    const activeOfficeIds = activeOffices.map((item) => item._id);
    const systemUpdateIds = activeSystemUpdates.map((item) => item._id);
    const leadershipUserIds = new Set([
        ...leadershipAssignments.map((item) => String(item.userId)).filter(Boolean),
        ...committeeMemberships.map((item) => String(item.userId)).filter(Boolean),
    ]);
    const leadershipLinkIds = [
        ...leadershipAssignments.map((item) => item._id),
        ...committeeMemberships.map((item) => item._id),
    ];
    const latestSssSurvey = [...sssSurveys].sort((left, right) => {
        const leftTime = new Date(left.endDate ?? 0).getTime();
        const rightTime = new Date(right.endDate ?? 0).getTime();
        return rightTime - leftTime;
    })[0];
    const latestSssAnalytics = latestSssSurvey
        ? sssAnalytics.find((item) => String(item.surveyId) === String(latestSssSurvey._id))
        : undefined;
    const latestAisheCycle = aisheCycles[0];
    const aisheEnrollmentRecords = latestAisheCycle
        ? aisheEnrollments.filter((item) => String(item.surveyCycleId) === String(latestAisheCycle._id))
        : [];
    const aisheFacultyRecords = latestAisheCycle
        ? aisheFacultyStatistics.filter((item) => String(item.surveyCycleId) === String(latestAisheCycle._id))
        : [];
    const latestNirfCycle = [...nirfCycles].sort((left, right) => right.rankingYear - left.rankingYear)[0];
    const latestNirfComposite = latestNirfCycle
        ? nirfCompositeScores.find((item) => String(item.rankingCycleId) === String(latestNirfCycle._id))
        : undefined;
    const complianceCompletedCount = complianceActionItems.filter((item) => item.completionStatus === "Completed").length;
    const complianceClosureRate =
        complianceActionItems.length > 0
            ? Number(((complianceCompletedCount / complianceActionItems.length) * 100).toFixed(2))
            : 0;
    const administrativeResponsibilityCount =
        facultyRecords.reduce(
            (sum, record) => sum + (record.administrativeResponsibilities?.length ?? 0),
            facultyAdminRoles.length
        );

    const metricValues = new Map<string, MetricComputation>();
    const setMetric = (tableName: string, fieldReference: string, payload: MetricComputation) => {
        metricValues.set(createMetricKey(tableName, fieldReference), payload);
    };

    setMetric("Program", "programsOffered", {
        numericValue: programIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Program", "Academic programs", "Program", programIds, programIds.length),
        ],
    });

    setMetric("Organization", "departmentsReporting", {
        numericValue: departmentIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Organization", "Departments", "Organization", departmentIds, departmentIds.length),
        ],
    });

    setMetric("Organization", "collegesReporting", {
        numericValue: collegeIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Organization", "Colleges", "Organization", collegeIds, collegeIds.length),
        ],
    });

    setMetric("FacultyTeachingLoad", "averageCoursesPerFaculty", {
        numericValue:
            teachingLoadIds.length > 0 && facultyRecords.length > 0
                ? Number((teachingLoadIds.length / facultyRecords.length).toFixed(1))
                : 0,
        sourceSnapshots: [
            createSourceSnapshot(
                "FacultyTeachingLoad",
                "Average teaching distribution",
                "FacultyTeachingLoad",
                teachingLoadIds,
                teachingLoadIds.length
            ),
            createSourceSnapshot(
                "FacultyProfile",
                "Faculty population",
                "Faculty",
                facultyRecords.map((item) => item._id),
                facultyRecords.length
            ),
        ],
    });

    setMetric("User", "totalFaculty", {
        numericValue: facultyIds.length,
        sourceSnapshots: [
            createSourceSnapshot("User", "Active faculty", "User", facultyIds, facultyIds.length),
        ],
    });

    setMetric("User", "totalStudents", {
        numericValue: studentIds.length,
        sourceSnapshots: [
            createSourceSnapshot("User", "Student user base", "User", studentIds, studentIds.length),
        ],
    });

    setMetric("Student", "activeStudents", {
        numericValue: activeStudentIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Student", "Active student records", "Student", activeStudentIds, activeStudentIds.length),
        ],
    });

    setMetric("FacultyPbasForm", "approvedPbasReports", {
        numericValue: pbasIds.length,
        sourceSnapshots: [
            createSourceSnapshot("PBAS", "PBAS reports linked", "FacultyPbasForm", pbasIds, pbasIds.length),
        ],
    });

    setMetric("Publication", "facultyPublications", {
        numericValue: publicationIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Publication", "Research publications", "Publication", publicationIds, publicationIds.length),
        ],
    });

    setMetric("Publication", "booksAndChapters", {
        numericValue: bookPublicationIds.length + facultyPublicationIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Publication", "Books and chapters", "Publication", bookPublicationIds, bookPublicationIds.length),
            createSourceSnapshot(
                "FacultyPublication",
                "Faculty publication register",
                "FacultyPublication",
                facultyPublicationIds,
                facultyPublicationIds.length
            ),
        ],
    });

    setMetric("Project", "projectsAndMoUs", {
        numericValue: projectIds.length + facultyProjectIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Project", "Projects and MoUs", "Project", projectIds, projectIds.length),
            createSourceSnapshot(
                "FacultyResearchProject",
                "Faculty research projects",
                "FacultyResearchProject",
                facultyProjectIds,
                facultyProjectIds.length
            ),
        ],
    });

    setMetric("AqarApplication", "facultyAqarContributions", {
        numericValue: aqarIds.length,
        sourceSnapshots: [
            createSourceSnapshot("AQARContribution", "Faculty AQAR entries", "AqarApplication", aqarIds, aqarIds.length),
        ],
    });

    setMetric("Organization", "universities", {
        numericValue: universityIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Organization", "Universities", "Organization", universityIds, universityIds.length),
        ],
    });

    setMetric("Organization", "colleges", {
        numericValue: collegeIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Organization", "Colleges", "Organization", collegeIds, collegeIds.length),
        ],
    });

    setMetric("Organization", "departments", {
        numericValue: departmentIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Organization", "Departments", "Organization", departmentIds, departmentIds.length),
        ],
    });

    setMetric("MasterData", "officesAndSupportUnits", {
        numericValue: activeOfficeIds.length,
        sourceSnapshots: [
            createSourceSnapshot("MasterData", "Administrative offices", "MasterData", activeOfficeIds, activeOfficeIds.length),
        ],
    });

    setMetric("Placement", "placements", {
        numericValue: placementIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Placement", "Placement records", "Placement", placementIds, placementIds.length),
        ],
    });

    setMetric("Internship", "internships", {
        numericValue: internshipIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Internship", "Internship records", "Internship", internshipIds, internshipIds.length),
        ],
    });

    setMetric("User", "adminAndLeadershipUsers", {
        numericValue: leadershipUserIds.size,
        sourceSnapshots: [
            createSourceSnapshot("Leadership", "Leadership roles", "LeadershipAssignment", leadershipLinkIds, leadershipUserIds.size),
        ],
    });

    setMetric("Faculty", "administrativeResponsibilities", {
        numericValue: administrativeResponsibilityCount,
        sourceSnapshots: [
            createSourceSnapshot(
                "FacultyProfile",
                "Faculty administrative responsibilities",
                "Faculty",
                facultyRecords.map((item) => item._id),
                administrativeResponsibilityCount
            ),
            createSourceSnapshot(
                "FacultyAdminRole",
                "Faculty administrative role records",
                "FacultyAdminRole",
                facultyAdminRoles.map((item) => item._id),
                facultyAdminRoles.length
            ),
        ],
    });

    setMetric("SystemMisc", "activeSystemUpdates", {
        numericValue: systemUpdateIds.length,
        sourceSnapshots: [
            createSourceSnapshot("SystemMisc", "Operational notices", "SystemMisc", systemUpdateIds, systemUpdateIds.length),
        ],
    });

    setMetric("CasApplication", "casApplications", {
        numericValue: casIds.length,
        sourceSnapshots: [
            createSourceSnapshot("CAS", "CAS applications", "CasApplication", casIds, casIds.length),
        ],
    });

    setMetric("FacultyQualification", "qualifiedFacultyProfiles", {
        numericValue: qualifiedFacultyIds.length,
        sourceSnapshots: [
            createSourceSnapshot(
                "FacultyProfile",
                "Faculty with qualification records",
                "FacultyQualification",
                qualifiedFacultyIds,
                qualifiedFacultyIds.length
            ),
        ],
    });

    setMetric("Project", "collaborations", {
        numericValue: collaborationIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Project", "Collaborations", "Project", collaborationIds, collaborationIds.length),
        ],
    });

    setMetric("AqarApplication", "facultyAqarNarratives", {
        numericValue: aqarIds.length,
        sourceSnapshots: [
            createSourceSnapshot("AQARContribution", "AQAR narratives", "AqarApplication", aqarIds, aqarIds.length),
        ],
    });

    setMetric("StudentProgression", "outreachIndicators", {
        numericValue: placementIds.length + internshipIds.length,
        sourceSnapshots: [
            createSourceSnapshot("Placement", "Placement records", "Placement", placementIds, placementIds.length),
            createSourceSnapshot("Internship", "Internship records", "Internship", internshipIds, internshipIds.length),
        ],
    });

    setMetric("ManualMetric", "sssOverallSatisfactionIndex", {
        numericValue: Number(latestSssAnalytics?.overallSatisfactionIndex ?? 0),
        sourceSnapshots: latestSssSurvey && latestSssAnalytics
            ? [
                  createSourceSnapshot("SSS", "Latest SSS survey", "SssSurvey", [latestSssSurvey._id], 1),
                  createSourceSnapshot(
                      "SSS",
                      "SSS analytics",
                      "SssResultAnalytics",
                      [latestSssAnalytics._id],
                      Number(latestSssAnalytics.overallSatisfactionIndex ?? 0)
                  ),
              ]
            : [],
    });

    setMetric("ManualMetric", "sssResponseRate", {
        numericValue: Number(latestSssAnalytics?.responseRate ?? 0),
        sourceSnapshots: latestSssSurvey && latestSssAnalytics
            ? [
                  createSourceSnapshot("SSS", "Latest SSS survey", "SssSurvey", [latestSssSurvey._id], 1),
                  createSourceSnapshot(
                      "SSS",
                      "SSS response rate",
                      "SssResultAnalytics",
                      [latestSssAnalytics._id],
                      Number(latestSssAnalytics.responseRate ?? 0)
                  ),
              ]
            : [],
    });

    setMetric("ManualMetric", "aisheStudentEnrollment", {
        numericValue: aisheEnrollmentRecords.reduce(
            (sum, item) =>
                sum +
                Number(item.maleStudents ?? 0) +
                Number(item.femaleStudents ?? 0) +
                Number(item.transgenderStudents ?? 0),
            0
        ),
        sourceSnapshots: latestAisheCycle
            ? [
                  createSourceSnapshot("AISHE", "AISHE cycle", "AisheSurveyCycle", [latestAisheCycle._id], 1),
                  createSourceSnapshot(
                      "AISHE",
                      "Student enrollment rows",
                      "AisheStudentEnrollment",
                      aisheEnrollmentRecords.map((item) => item._id),
                      aisheEnrollmentRecords.length
                  ),
              ]
            : [],
    });

    setMetric("ManualMetric", "aisheFacultyStrength", {
        numericValue: aisheFacultyRecords.reduce((sum, item) => sum + Number(item.totalFaculty ?? 0), 0),
        sourceSnapshots: latestAisheCycle
            ? [
                  createSourceSnapshot("AISHE", "AISHE cycle", "AisheSurveyCycle", [latestAisheCycle._id], 1),
                  createSourceSnapshot(
                      "AISHE",
                      "Faculty statistics rows",
                      "AisheFacultyStatistic",
                      aisheFacultyRecords.map((item) => item._id),
                      aisheFacultyRecords.length
                  ),
              ]
            : [],
    });

    setMetric("ManualMetric", "nirfCompositeScore", {
        numericValue: Number(latestNirfComposite?.totalScore ?? 0),
        sourceSnapshots: latestNirfCycle && latestNirfComposite
            ? [
                  createSourceSnapshot("NIRF", "NIRF cycle", "NirfRankingCycle", [latestNirfCycle._id], latestNirfCycle.rankingYear),
                  createSourceSnapshot(
                      "NIRF",
                      "Composite score",
                      "NirfCompositeScore",
                      [latestNirfComposite._id],
                      Number(latestNirfComposite.totalScore ?? 0)
                  ),
              ]
            : [],
    });

    setMetric("ManualMetric", "nirfRankPosition", {
        numericValue: Number(latestNirfComposite?.predictedRank ?? 0),
        sourceSnapshots: latestNirfCycle && latestNirfComposite
            ? [
                  createSourceSnapshot("NIRF", "NIRF cycle", "NirfRankingCycle", [latestNirfCycle._id], latestNirfCycle.rankingYear),
                  createSourceSnapshot(
                      "NIRF",
                      "Predicted rank",
                      "NirfCompositeScore",
                      [latestNirfComposite._id],
                      Number(latestNirfComposite.predictedRank ?? 0)
                  ),
              ]
            : [],
    });

    setMetric("ManualMetric", "activeRegulatoryApprovals", {
        numericValue: institutionalApprovals.length,
        sourceSnapshots: [
            createSourceSnapshot(
                "COMPLIANCE",
                "Active institutional approvals",
                "InstitutionalApproval",
                institutionalApprovals.map((item) => item._id),
                institutionalApprovals.length
            ),
        ],
    });

    setMetric("ManualMetric", "complianceClosureRate", {
        numericValue: complianceClosureRate,
        sourceSnapshots: [
            createSourceSnapshot(
                "COMPLIANCE",
                "Compliance action items",
                "ComplianceActionItem",
                complianceActionItems.map((item) => item._id),
                complianceActionItems.length
            ),
        ],
    });

    return metricValues;
}

async function getCycleWorkspaceInternal(id: string) {
    const cycle = await NaacMetricCycle.findById(id);
    if (!cycle) {
        throw new AuthError("NAAC metric cycle not found.", 404);
    }

    const [values, latestSync] = await Promise.all([
        NaacMetricValue.find({ cycleId: cycle._id }).sort({ criteriaCode: 1, label: 1, metricCode: 1 }).lean(),
        NaacMetricSyncRun.findOne({ cycleId: cycle._id }).sort({ startedAt: -1 }).lean(),
    ]);

    const summary = {
        totalMetrics: values.length,
        generatedCount: values.filter((item) => generatedStatuses.has(item.status)).length,
        reviewedCount: values.filter((item) => item.status === "Reviewed").length,
        overriddenCount: values.filter((item) => item.status === "Overridden").length,
        criteria: naacCriterionCatalog.map((criterion) => {
            const scoped = values.filter((item) => item.criteriaCode === criterion.criteriaCode);
            return {
                criteriaCode: criterion.criteriaCode,
                criteriaName: criterion.criteriaName,
                totalMetrics: scoped.length,
                reviewedCount: scoped.filter((item) => item.status === "Reviewed").length,
                overriddenCount: scoped.filter((item) => item.status === "Overridden").length,
            };
        }),
    };

    return {
        cycle,
        values,
        summary,
        latestSync,
    };
}

export async function ensureNaacMetricDefinitionsSeeded() {
    await dbConnect();
    await Promise.all(
        seededMetricCatalog.map((item) =>
            NaacMetricDefinition.updateOne(
                {
                    metricKey: createMetricKey(item.tableName, item.fieldReference),
                },
                {
                    $setOnInsert: {
                        metricKey: createMetricKey(item.tableName, item.fieldReference),
                        metricCode: createMetricCode(item.criteriaCode, item.fieldReference),
                        criteriaCode: item.criteriaCode,
                        criteriaName: item.criteriaName,
                        tableName: item.tableName,
                        fieldReference: item.fieldReference,
                        label: item.label,
                        sourceType: item.sourceType,
                        sourceLabel: item.sourceLabel,
                        sourceMode: "sourceMode" in item ? item.sourceMode : "AUTO",
                        moduleKey: "moduleKey" in item ? item.moduleKey : undefined,
                        guidance: "guidance" in item ? item.guidance : undefined,
                        valueType:
                            item.valueType === "count" || item.valueType === "number"
                                ? item.valueType
                                : "text",
                        defaultWeightage: item.defaultWeightage,
                        isActive: true,
                    },
                },
                { upsert: true }
            )
        )
    );
}

export async function getNaacMetricWarehouseAdminConsole(actor: SafeActor) {
    ensureAdmin(actor);
    await dbConnect();
    await ensureNaacMetricDefinitionsSeeded();

    const [definitions, cycles, academicYears] = await Promise.all([
        NaacMetricDefinition.find({}).sort({ criteriaCode: 1, label: 1 }).lean(),
        NaacMetricCycle.find({}).sort({ updatedAt: -1 }).lean(),
        AcademicYear.find({}).sort({ yearStart: -1 }).lean(),
    ]);

    const activeCycle = cycles[0];
    const workspace = activeCycle ? await getCycleWorkspaceInternal(String(activeCycle._id)) : null;

    return {
        definitions,
        cycles,
        academicYearOptions: academicYears.map((year) => ({
            id: String(year._id),
            label: formatAcademicYearLabel(year.yearStart, year.yearEnd),
            isActive: Boolean(year.isActive),
        })),
        workspace,
    };
}

export async function createNaacMetricCycle(actor: SafeActor, rawInput: unknown) {
    ensureAdmin(actor);
    await dbConnect();
    await ensureNaacMetricDefinitionsSeeded();

    const input = naacMetricCycleCreateSchema.parse(rawInput);
    const resolvedAcademicYear = await resolveAcademicYearFromInput(input);

    const existing = await NaacMetricCycle.findOne({
        $or: [
            { academicYearId: resolvedAcademicYear.id },
            { academicYearLabel: resolvedAcademicYear.label },
        ],
    });
    if (existing) {
        throw new AuthError("A warehouse cycle already exists for this academic year.", 409);
    }

    const cycle = await NaacMetricCycle.create({
        academicYearId: resolvedAcademicYear.id,
        academicYearLabel: resolvedAcademicYear.label,
        title: input.title,
        status: "Draft",
        preparedById: new Types.ObjectId(actor.id),
        preparedByName: actor.name,
    });

    await createAuditLog({
        actor,
        action: "NAAC_METRIC_CYCLE_CREATE",
        tableName: "naac_metric_cycles",
        recordId: cycle._id.toString(),
        newData: cycle.toObject(),
        auditContext: actor.auditContext,
    });

    return cycle;
}

export async function listNaacMetricCycles(actor: SafeActor) {
    ensureAdmin(actor);
    await dbConnect();
    return NaacMetricCycle.find({}).sort({ updatedAt: -1 }).lean();
}

export async function getNaacMetricCycleWorkspace(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    await dbConnect();
    return getCycleWorkspaceInternal(id);
}

export async function generateNaacMetricCycleSnapshot(actor: SafeActor, id: string) {
    ensureAdmin(actor);
    await dbConnect();
    await ensureNaacMetricDefinitionsSeeded();

    const cycle = await NaacMetricCycle.findById(id);
    if (!cycle) {
        throw new AuthError("NAAC metric cycle not found.", 404);
    }

    const syncRun = await NaacMetricSyncRun.create({
        cycleId: cycle._id,
        academicYearLabel: cycle.academicYearLabel,
        status: "Running",
        startedAt: new Date(),
        triggeredById: new Types.ObjectId(actor.id),
        triggeredByName: actor.name,
    });

    try {
        const [definitions, mappings, metricValues, existingValues] = await Promise.all([
            NaacMetricDefinition.find({ isActive: true }).sort({ criteriaCode: 1, label: 1 }),
            listNaacCriteriaMappings(),
            buildMetricComputations(cycle.academicYearLabel, cycle.academicYearId),
            NaacMetricValue.find({ cycleId: cycle._id }),
        ]);

        const mappingWeightageByMetricKey = new Map(
            (mappings.length ? mappings : defaultNaacCriteriaMappings).map((mapping) => [
                createMetricKey(mapping.tableName, mapping.fieldReference),
                Number(mapping.weightage ?? 0),
            ])
        );
        const existingByMetricKey = new Map(existingValues.map((item) => [item.metricKey, item]));
        let createdCount = 0;
        let updatedCount = 0;

        for (const definition of definitions) {
            const metricKey = definition.metricKey;
            const isManual = definition.sourceMode === "MANUAL";
            const computed = metricValues.get(metricKey) ?? {
                numericValue: undefined,
                textValue: undefined,
                sourceSnapshots: isManual
                    ? [
                          createSourceSnapshot(
                              definition.sourceType,
                              definition.sourceLabel,
                              definition.moduleKey ?? definition.sourceType,
                              [],
                              definition.guidance ?? "Manual warehouse entry required."
                          ),
                      ]
                    : [],
            };
            const existing = existingByMetricKey.get(metricKey);
            const previousEffectiveValue = existing ? getEffectiveValue(existing) : "";
            const nextEffectiveValue =
                existing && existing.status === "Overridden"
                    ? getEffectiveValue({
                          overrideNumericValue: existing.overrideNumericValue,
                          overrideTextValue: existing.overrideTextValue,
                      })
                    : formatMetricValueText(computed);

            if (existing) {
                existing.metricCode = definition.metricCode;
                existing.criteriaCode = definition.criteriaCode;
                existing.criteriaName = definition.criteriaName;
                existing.label = definition.label;
                existing.sourceType = definition.sourceType;
                existing.sourceLabel = definition.sourceLabel;
                existing.sourceMode = definition.sourceMode;
                existing.moduleKey = definition.moduleKey;
                existing.guidance = definition.guidance;
                existing.tableName = definition.tableName;
                existing.fieldReference = definition.fieldReference;
                existing.valueType = definition.valueType;
                if (!isManual) {
                    existing.numericValue = computed.numericValue;
                    existing.textValue = computed.textValue;
                }
                existing.sourceSnapshots = computed.sourceSnapshots;
                existing.weightage =
                    mappingWeightageByMetricKey.get(metricKey) ?? definition.defaultWeightage;
                existing.lastGeneratedAt = new Date();
                existing.effectiveValueText =
                    existing.status === "Overridden"
                        ? getEffectiveValue(existing)
                        : isManual
                          ? getEffectiveValue(existing)
                          : nextEffectiveValue;
                if (!isManual && existing.status === "Pending") {
                    existing.status = "Generated";
                }
                if (!isManual) {
                    existing.reviewHistory.push({
                        action: "Generated",
                        actorId: new Types.ObjectId(actor.id),
                        actorName: actor.name,
                        actorRole: actor.role,
                        remarks: "Warehouse snapshot refreshed from source modules.",
                        previousValue: previousEffectiveValue,
                        nextValue: existing.effectiveValueText,
                        actedAt: new Date(),
                    });
                }
                await existing.save();
                updatedCount += 1;
                continue;
            }

            await NaacMetricValue.create({
                cycleId: cycle._id,
                academicYearId: cycle.academicYearId,
                academicYearLabel: cycle.academicYearLabel,
                definitionId: definition._id,
                metricKey,
                metricCode: definition.metricCode,
                criteriaCode: definition.criteriaCode,
                criteriaName: definition.criteriaName,
                label: definition.label,
                sourceType: definition.sourceType,
                sourceLabel: definition.sourceLabel,
                sourceMode: definition.sourceMode,
                moduleKey: definition.moduleKey,
                guidance: definition.guidance,
                tableName: definition.tableName,
                fieldReference: definition.fieldReference,
                valueType: definition.valueType,
                weightage: mappingWeightageByMetricKey.get(metricKey) ?? definition.defaultWeightage,
                numericValue: computed.numericValue,
                textValue: computed.textValue,
                effectiveValueText: formatMetricValueText(computed),
                status: isManual ? "Pending" : "Generated",
                sourceSnapshots: computed.sourceSnapshots,
                lastGeneratedAt: new Date(),
                reviewHistory: isManual
                    ? []
                    : [
                          {
                              action: "Generated",
                              actorId: new Types.ObjectId(actor.id),
                              actorName: actor.name,
                              actorRole: actor.role,
                              remarks: "Warehouse snapshot generated from source modules.",
                              nextValue: formatMetricValueText(computed),
                              actedAt: new Date(),
                          },
                      ],
            });
            createdCount += 1;
        }

        cycle.status = "Generated";
        cycle.lastGeneratedAt = new Date();
        cycle.preparedById = new Types.ObjectId(actor.id);
        cycle.preparedByName = actor.name;
        await cycle.save();
        await refreshCycleCounters(cycle._id);

        syncRun.status = "Completed";
        syncRun.metricCount = definitions.length;
        syncRun.createdCount = createdCount;
        syncRun.updatedCount = updatedCount;
        syncRun.completedAt = new Date();
        await syncRun.save();

        await createAuditLog({
            actor,
            action: "NAAC_METRIC_CYCLE_GENERATE",
            tableName: "naac_metric_cycles",
            recordId: cycle._id.toString(),
            newData: {
                cycleId: cycle._id.toString(),
                academicYearLabel: cycle.academicYearLabel,
                metricCount: definitions.length,
                createdCount,
                updatedCount,
            },
            auditContext: actor.auditContext,
        });

        return getCycleWorkspaceInternal(cycle._id.toString());
    } catch (error) {
        syncRun.status = "Failed";
        syncRun.errorMessage = error instanceof Error ? error.message : "Snapshot generation failed.";
        syncRun.completedAt = new Date();
        await syncRun.save();
        throw error;
    }
}

export async function reviewNaacMetricValue(
    actor: SafeActor,
    id: string,
    rawInput: unknown
) {
    ensureAdmin(actor);
    await dbConnect();

    const input = naacMetricValueReviewSchema.parse(rawInput);
    const metric = await NaacMetricValue.findById(id);

    if (!metric) {
        throw new AuthError("NAAC metric value not found.", 404);
    }

    const previousValue = getEffectiveValue(metric);
    metric.reviewRemarks = input.reviewRemarks?.trim() || undefined;
    metric.reviewedAt = new Date();
    metric.reviewedBy = new Types.ObjectId(actor.id);

    if (input.status === "Overridden") {
        metric.status = "Overridden";
        metric.overrideNumericValue =
            typeof input.overrideNumericValue === "number" && Number.isFinite(input.overrideNumericValue)
                ? input.overrideNumericValue
                : undefined;
        metric.overrideTextValue = input.overrideTextValue?.trim() || undefined;
        metric.overrideReason = input.overrideReason?.trim() || undefined;
        metric.overriddenAt = new Date();
        metric.overriddenBy = new Types.ObjectId(actor.id);
        metric.effectiveValueText = getEffectiveValue({
            overrideNumericValue: metric.overrideNumericValue,
            overrideTextValue: metric.overrideTextValue,
        });
    } else {
        metric.status = "Reviewed";
        metric.effectiveValueText = getEffectiveValue(metric);
    }

    metric.reviewHistory.push({
        action: input.status,
        actorId: new Types.ObjectId(actor.id),
        actorName: actor.name,
        actorRole: actor.role,
        remarks:
            input.status === "Overridden"
                ? metric.overrideReason || input.reviewRemarks
                : input.reviewRemarks,
        previousValue,
        nextValue: metric.effectiveValueText,
        actedAt: new Date(),
    });
    await metric.save();
    await refreshCycleCounters(metric.cycleId);

    await createAuditLog({
        actor,
        action: input.status === "Overridden" ? "NAAC_METRIC_OVERRIDE" : "NAAC_METRIC_REVIEW",
        tableName: "naac_metric_values",
        recordId: metric._id.toString(),
        newData: {
            status: metric.status,
            effectiveValueText: metric.effectiveValueText,
            reviewRemarks: metric.reviewRemarks,
            overrideReason: metric.overrideReason,
        },
        auditContext: actor.auditContext,
    });

    return metric;
}

export async function updateManualNaacMetricValue(
    actor: SafeActor,
    id: string,
    rawInput: unknown
) {
    ensureAdmin(actor);
    await dbConnect();

    const input = naacMetricValueManualUpdateSchema.parse(rawInput);
    const metric = await NaacMetricValue.findById(id);

    if (!metric) {
        throw new AuthError("NAAC metric value not found.", 404);
    }

    if (metric.sourceMode !== "MANUAL") {
        throw new AuthError("Only manual-source warehouse metrics can be edited directly.", 409);
    }

    const previousValue = getEffectiveValue(metric);
    metric.numericValue =
        typeof input.numericValue === "number" && Number.isFinite(input.numericValue)
            ? input.numericValue
            : undefined;
    metric.textValue = input.textValue?.trim() || undefined;
    metric.effectiveValueText = formatMetricValueText({
        numericValue: metric.numericValue,
        textValue: metric.textValue,
    });
    metric.status = "Generated";
    metric.lastGeneratedAt = new Date();
    metric.reviewRemarks = input.remarks?.trim() || metric.reviewRemarks;
    metric.reviewHistory.push({
        action: "Generated",
        actorId: new Types.ObjectId(actor.id),
        actorName: actor.name,
        actorRole: actor.role,
        remarks: input.remarks?.trim() || "Manual warehouse value captured.",
        previousValue,
        nextValue: metric.effectiveValueText,
        actedAt: new Date(),
    });
    await metric.save();
    await refreshCycleCounters(metric.cycleId);

    await createAuditLog({
        actor,
        action: "NAAC_MANUAL_METRIC_UPDATE",
        tableName: "naac_metric_values",
        recordId: metric._id.toString(),
        newData: {
            status: metric.status,
            numericValue: metric.numericValue,
            textValue: metric.textValue,
            effectiveValueText: metric.effectiveValueText,
        },
        auditContext: actor.auditContext,
    });

    return metric;
}

function assignmentPriority(label: string) {
    const order = ["HOD", "PRINCIPAL", "IQAC_COORDINATOR", "DIRECTOR", "OFFICE_HEAD"];
    const index = order.indexOf(label);
    return index === -1 ? order.length : index;
}

function uniqueStrings(values: Array<string | undefined | null>) {
    return Array.from(
        new Set(
            values
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    );
}

export async function getNaacMetricWarehouseLeadershipWorkspace(actor: AuthorizationActor) {
    await dbConnect();
    await ensureNaacMetricDefinitionsSeeded();

    const profile = await resolveAuthorizationProfile(actor);
    if (!profile.hasLeadershipPortalAccess && !profile.isAdmin) {
        throw new AuthError("Leadership access is required.", 403);
    }

    const assignments = await LeadershipAssignment.find({
        userId: new Types.ObjectId(actor.id),
        isActive: true,
    })
        .select("assignmentType")
        .lean();

    const roleLabels = uniqueStrings([
        ...assignments.map((assignment) => assignment.assignmentType),
        ...profile.workflowRoles.map((role) => role.replaceAll("_", " ")),
    ]);
    const displayRole =
        roleLabels.sort((left, right) => assignmentPriority(left) - assignmentPriority(right))[0] ??
        "Leadership";

    const cycle = await NaacMetricCycle.findOne({
        status: { $in: ["Generated", "Locked"] },
    }).sort({ lastGeneratedAt: -1, updatedAt: -1 });

    if (!cycle) {
        return {
            access: {
                displayRole: displayRole.replaceAll("_", " "),
                roleLabels: roleLabels.map((label) => label.replaceAll("_", " ")),
            },
            workspace: null,
        };
    }

    const workspace = await getCycleWorkspaceInternal(cycle._id.toString());

    return {
        access: {
            displayRole: displayRole.replaceAll("_", " "),
            roleLabels: roleLabels.map((label) => label.replaceAll("_", " ")),
        },
        workspace,
    };
}
