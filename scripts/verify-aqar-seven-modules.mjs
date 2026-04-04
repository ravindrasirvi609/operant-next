import dbConnect from "../src/lib/dbConnect.ts";
import { resolveAuthorizationProfile } from "../src/lib/authorization/service.ts";
import User from "../src/models/core/user.ts";
import DocumentModel from "../src/models/reference/document.ts";
import AcademicYear from "../src/models/reference/academic-year.ts";
import Semester from "../src/models/reference/semester.ts";
import Department from "../src/models/reference/department.ts";
import Institution from "../src/models/reference/institution.ts";
import Program from "../src/models/academic/program.ts";
import Course from "../src/models/academic/course.ts";
import GovernanceCommittee from "../src/models/core/governance-committee.ts";
import GovernanceCommitteeMembership from "../src/models/core/governance-committee-membership.ts";
import {
    createCurriculumAssignment,
    createCurriculumCourse,
    createCurriculumPlan,
    createCurriculumProgramOutcome,
    createCurriculumSyllabusVersion,
    reviewCurriculumAssignment,
    saveCurriculumContributionDraft,
    submitCurriculumAssignment,
} from "../src/lib/curriculum/service.ts";
import {
    createTeachingLearningAssignment,
    createTeachingLearningPlan,
    reviewTeachingLearningAssignment,
    saveTeachingLearningContributionDraft,
    submitTeachingLearningAssignment,
} from "../src/lib/teaching-learning/service.ts";
import {
    createResearchInnovationAssignment,
    createResearchInnovationPlan,
    reviewResearchInnovationAssignment,
    saveResearchInnovationContributionDraft,
    submitResearchInnovationAssignment,
} from "../src/lib/research-innovation/service.ts";
import {
    createInfrastructureLibraryAssignment,
    createInfrastructureLibraryPlan,
    reviewInfrastructureLibraryAssignment,
    saveInfrastructureLibraryContributionDraft,
    submitInfrastructureLibraryAssignment,
} from "../src/lib/infrastructure-library/service.ts";
import {
    createStudentSupportGovernanceAssignment,
    createStudentSupportGovernancePlan,
    reviewStudentSupportGovernanceAssignment,
    saveStudentSupportGovernanceContributionDraft,
    submitStudentSupportGovernanceAssignment,
} from "../src/lib/student-support-governance/service.ts";
import {
    createGovernanceLeadershipIqacAssignment,
    createGovernanceLeadershipIqacPlan,
    reviewGovernanceLeadershipIqacAssignment,
    saveGovernanceLeadershipIqacContributionDraft,
    submitGovernanceLeadershipIqacAssignment,
} from "../src/lib/governance-leadership-iqac/service.ts";
import {
    createInstitutionalValuesBestPracticesAssignment,
    createInstitutionalValuesBestPracticesPlan,
    reviewInstitutionalValuesBestPracticesAssignment,
    saveInstitutionalValuesBestPracticesContributionDraft,
    submitInstitutionalValuesBestPracticesAssignment,
} from "../src/lib/institutional-values-best-practices/service.ts";

const RUN_TAG = `Codex AQAR Verify ${new Date().toISOString()}`;

function actorFromUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        department: user.department,
        collegeName: user.collegeName,
        universityName: user.universityName,
    };
}

async function requireAdminUser() {
    const admin = await User.findOne({
        role: "Admin",
        isActive: true,
        emailVerified: true,
        accountStatus: "Active",
    })
        .sort({ createdAt: 1 })
        .lean();

    if (!admin) {
        throw new Error("No active admin user is available for verification.");
    }

    return admin;
}

async function requireDepartmentHeadUser() {
    const facultyUsers = await User.find({
        role: "Faculty",
        isActive: true,
        emailVerified: true,
        accountStatus: "Active",
    })
        .select("_id name email role department collegeName universityName departmentId institutionId")
        .lean();

    for (const faculty of facultyUsers) {
        const profile = await resolveAuthorizationProfile({
            id: faculty._id.toString(),
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
            collegeName: faculty.collegeName,
            universityName: faculty.universityName,
        });

        if (profile.workflowRoles.includes("DEPARTMENT_HEAD")) {
            return faculty;
        }
    }

    throw new Error("No active department-head workflow actor is available for verification.");
}

async function ensureAcademicYear() {
    return (
        (await AcademicYear.findOne({ isActive: true }).sort({ yearStart: -1 }).lean()) ??
        (await AcademicYear.create({
            yearStart: new Date().getFullYear(),
            yearEnd: new Date().getFullYear() + 1,
            isActive: true,
        }))
    );
}

async function ensureSemester() {
    return (
        (await Semester.findOne({ semesterNumber: 1 }).lean()) ??
        (await Semester.create({ semesterNumber: 1 }))
    );
}

async function createTempContributor(scopeSource) {
    return User.create({
        name: `${RUN_TAG} Contributor`,
        email: `codex-aqar-${Date.now()}@example.test`,
        role: "Faculty",
        designation: "Assistant Professor",
        accountStatus: "Active",
        isActive: true,
        emailVerified: true,
        departmentId: scopeSource.departmentId,
        institutionId: scopeSource.institutionId,
        department: scopeSource.department,
        collegeName: scopeSource.collegeName,
        universityName: scopeSource.universityName,
        experience: [],
    });
}

async function createCommitteeAndMembership({
    user,
    department,
    committeeType,
    nameSuffix,
}) {
    const committee = await GovernanceCommittee.create({
        name: `${RUN_TAG} ${nameSuffix}`,
        committeeType,
        scopeType: "Department",
        organizationId: department.organizationId,
        organizationName: department.name,
        organizationType: "Department",
        collegeName: user.collegeName,
        universityName: user.universityName,
        isActive: true,
    });

    await GovernanceCommitteeMembership.create({
        committeeId: committee._id,
        userId: user._id,
        memberName: user.name,
        memberEmail: user.email,
        memberRole: "Member",
        isExternal: false,
        startDate: new Date(),
        isActive: true,
    });
}

async function createEvidenceDocument(uploadedBy, label) {
    return DocumentModel.create({
        fileName: `${label}.pdf`,
        fileUrl: `https://example.com/${encodeURIComponent(label)}.pdf`,
        fileType: "application/pdf",
        uploadedBy,
        uploadedAt: new Date(),
        verificationStatus: "Pending",
        verified: false,
    });
}

async function createTempProgramAndCourse({ academicYearId, departmentId, institutionId, semesterId, collegeName }) {
    const uniqueToken = Date.now();
    const program = await Program.create({
        name: `${RUN_TAG} Program ${uniqueToken}`,
        code: `CV${String(uniqueToken).slice(-5)}`,
        institutionId,
        departmentId,
        startAcademicYearId: academicYearId,
        degreeType: "B.Tech",
        durationYears: 4,
        collegeName,
        level: "UG",
        type: "Regular",
        isCBCS: true,
        isActive: true,
        revisions: [],
    });

    const course = await Course.create({
        name: `${RUN_TAG} Course ${uniqueToken}`,
        subjectCode: `AQ${String(uniqueToken).slice(-5)}`,
        courseType: "Theory",
        credits: 3,
        isActive: true,
        programId: program._id,
        semesterId,
    });

    return { program, course };
}

async function expectSelfReviewBlocked(moduleName, reviewFn, contributorActor, assignmentId) {
    try {
        await reviewFn(contributorActor, assignmentId, {
            remarks: `${RUN_TAG} self-review probe`,
            decision: "Forward",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("cannot review their own")) {
            return;
        }

        throw new Error(`${moduleName}: expected self-review block, received "${message}"`);
    }

    throw new Error(`${moduleName}: contributor self-review unexpectedly succeeded.`);
}

async function advanceWorkflow(moduleName, reviewFn, assignmentId, reviewerActor, adminActor) {
    const visitedStatuses = [];

    let assignment = await reviewFn(reviewerActor, assignmentId, {
        remarks: `${RUN_TAG} first-stage review`,
        decision: "Forward",
    });
    visitedStatuses.push(assignment.status);

    let guard = 0;
    while (assignment.status !== "Approved") {
        guard += 1;
        if (guard > 6) {
            throw new Error(`${moduleName}: workflow did not reach Approved after ${guard} admin transitions.`);
        }

        const decision =
            assignment.status === "Committee Review" || assignment.status === "Governance Review"
                ? "Approve"
                : "Forward";

        assignment = await reviewFn(adminActor, assignmentId, {
            remarks: `${RUN_TAG} admin ${decision.toLowerCase()}`,
            decision,
        });
        visitedStatuses.push(assignment.status);
    }

    return visitedStatuses;
}

async function main() {
    await dbConnect();

    const adminUser = await requireAdminUser();
    const departmentHeadUser = await requireDepartmentHeadUser();
    const department = await Department.findById(departmentHeadUser.departmentId).lean();
    const institution = await Institution.findById(departmentHeadUser.institutionId).lean();

    if (!department?.organizationId) {
        throw new Error("Department organization mapping is required for the verification workflow.");
    }

    if (!institution) {
        throw new Error("Institution scope is required for the verification workflow.");
    }

    const academicYear = await ensureAcademicYear();
    const semester = await ensureSemester();
    const contributorUser = await createTempContributor(departmentHeadUser);
    const contributorActor = actorFromUser(contributorUser);
    const adminActor = actorFromUser(adminUser);
    const reviewerActor = actorFromUser(departmentHeadUser);
    const { program, course } = await createTempProgramAndCourse({
        academicYearId: academicYear._id,
        departmentId: departmentHeadUser.departmentId,
        institutionId: departmentHeadUser.institutionId,
        semesterId: semester._id,
        collegeName: departmentHeadUser.collegeName,
    });

    const evidence = {
        curriculum: await createEvidenceDocument(contributorUser._id, `${RUN_TAG} Curriculum`),
        lessonPlan: await createEvidenceDocument(contributorUser._id, `${RUN_TAG} Lesson Plan`),
        questionPaper: await createEvidenceDocument(contributorUser._id, `${RUN_TAG} Question Paper`),
        resultAnalysis: await createEvidenceDocument(contributorUser._id, `${RUN_TAG} Result Analysis`),
        governance: await createEvidenceDocument(contributorUser._id, `${RUN_TAG} Governance`),
        criteria7: await createEvidenceDocument(contributorUser._id, `${RUN_TAG} Criteria 7`),
    };

    await createCommitteeAndMembership({
        user: contributorUser,
        department,
        committeeType: "RESEARCH_COMMITTEE",
        nameSuffix: "Research Committee",
    });
    await createCommitteeAndMembership({
        user: contributorUser,
        department,
        committeeType: "INFRASTRUCTURE_LIBRARY_REVIEW",
        nameSuffix: "Infrastructure Committee",
    });
    await createCommitteeAndMembership({
        user: contributorUser,
        department,
        committeeType: "STUDENT_SUPPORT_GOVERNANCE_REVIEW",
        nameSuffix: "Student Support Committee",
    });
    await createCommitteeAndMembership({
        user: contributorUser,
        department,
        committeeType: "IQAC",
        nameSuffix: "IQAC Cell",
    });

    const report = {};

    const curriculumPlan = await createCurriculumPlan(adminActor, {
        programId: program._id.toString(),
        effectiveFromAcademicYearId: academicYear._id.toString(),
        title: `${RUN_TAG} Curriculum Plan`,
        regulationYear: String(academicYear.yearStart),
        totalCredits: 3,
        status: "Active",
        summary: "Temporary verification curriculum plan.",
    });
    const curriculumCourse = await createCurriculumCourse(adminActor, {
        curriculumId: curriculumPlan._id.toString(),
        courseId: course._id.toString(),
        courseCode: "AQAR-C1",
        courseTitle: `${RUN_TAG} Curriculum Course`,
        courseType: "Core",
        credits: 3,
        lectureHours: 3,
        tutorialHours: 0,
        practicalHours: 0,
        semesterNumber: 1,
        displayOrder: 1,
        facultyOwnerUserId: contributorUser._id.toString(),
        isActive: true,
    });
    const curriculumSyllabus = await createCurriculumSyllabusVersion(adminActor, {
        curriculumId: curriculumPlan._id.toString(),
        curriculumCourseId: curriculumCourse._id.toString(),
        versionNumber: 1,
        status: "Draft",
    });
    const curriculumPo = await createCurriculumProgramOutcome(adminActor, {
        curriculumId: curriculumPlan._id.toString(),
        programId: program._id.toString(),
        outcomeType: "PO",
        outcomeCode: "PO1",
        description: "Verification programme outcome",
        isActive: true,
    });
    const curriculumAssignment = await createCurriculumAssignment(adminActor, {
        curriculumId: curriculumPlan._id.toString(),
        curriculumCourseId: curriculumCourse._id.toString(),
        syllabusVersionId: curriculumSyllabus._id.toString(),
        assigneeUserId: contributorUser._id.toString(),
        notes: "Verification assignment",
        isActive: true,
    });
    await saveCurriculumContributionDraft(contributorActor, curriculumAssignment._id.toString(), {
        syllabusSummary: "Verification syllabus summary",
        unitOutline: "Unit 1: Verification",
        outcomes: [
            {
                coCode: "CO1",
                description: "Verify AQAR module flow",
            },
        ],
        mappings: [
            {
                courseOutcomeCode: "CO1",
                programOutcomeId: curriculumPo._id.toString(),
                mappingStrength: 2,
            },
        ],
        officialDocumentId: evidence.curriculum._id.toString(),
        supportingLinks: ["https://example.com/curriculum-flow"],
        documentIds: [evidence.curriculum._id.toString()],
        contributorRemarks: "Verification draft",
    });
    await submitCurriculumAssignment(contributorActor, curriculumAssignment._id.toString());
    await expectSelfReviewBlocked(
        "curriculum",
        reviewCurriculumAssignment,
        contributorActor,
        curriculumAssignment._id.toString()
    );
    report.curriculum = await advanceWorkflow(
        "curriculum",
        reviewCurriculumAssignment,
        curriculumAssignment._id.toString(),
        reviewerActor,
        adminActor
    );

    const teachingPlan = await createTeachingLearningPlan(adminActor, {
        academicYearId: academicYear._id.toString(),
        programId: program._id.toString(),
        courseId: course._id.toString(),
        semesterId: semester._id.toString(),
        title: `${RUN_TAG} Teaching Plan`,
        deliveryType: "Theory",
        plannedSessions: 1,
        plannedContactHours: 1,
        facultyOwnerUserId: contributorUser._id.toString(),
        status: "Active",
    });
    const teachingAssignment = await createTeachingLearningAssignment(adminActor, {
        planId: teachingPlan._id.toString(),
        assigneeUserId: contributorUser._id.toString(),
        isActive: true,
    });
    await saveTeachingLearningContributionDraft(contributorActor, teachingAssignment._id.toString(), {
        pedagogicalApproach: "Outcome-driven teaching with reflective checkpoints.",
        attendanceStrategy: "Weekly attendance and engagement follow-up.",
        attainmentSummary: "Initial attainment goals have been mapped and reviewed.",
        supportingLinks: ["https://example.com/teaching-learning-flow"],
        lessonPlanDocumentId: evidence.lessonPlan._id.toString(),
        questionPaperDocumentId: evidence.questionPaper._id.toString(),
        resultAnalysisDocumentId: evidence.resultAnalysis._id.toString(),
        documentIds: [evidence.lessonPlan._id.toString()],
        sessions: [
            {
                sessionNumber: 1,
                topic: "Verification Topic",
                teachingMethod: "Lecture",
                isDelivered: true,
                displayOrder: 1,
                documentId: evidence.lessonPlan._id.toString(),
            },
        ],
        assessments: [
            {
                title: "Verification Assessment",
                assessmentType: "Assignment",
                displayOrder: 1,
                isCompleted: true,
                documentId: evidence.questionPaper._id.toString(),
            },
        ],
        supports: [],
    });
    await submitTeachingLearningAssignment(contributorActor, teachingAssignment._id.toString());
    await expectSelfReviewBlocked(
        "teaching-learning",
        reviewTeachingLearningAssignment,
        contributorActor,
        teachingAssignment._id.toString()
    );
    report.teachingLearning = await advanceWorkflow(
        "teaching-learning",
        reviewTeachingLearningAssignment,
        teachingAssignment._id.toString(),
        reviewerActor,
        adminActor
    );

    const researchPlan = await createResearchInnovationPlan(adminActor, {
        academicYearId: academicYear._id.toString(),
        scopeType: "Department",
        institutionId: departmentHeadUser.institutionId?.toString(),
        departmentId: departmentHeadUser.departmentId?.toString(),
        title: `${RUN_TAG} Research Plan`,
        focusArea: "Integrated",
        facultyOwnerUserId: contributorUser._id.toString(),
        status: "Active",
    });
    const researchAssignment = await createResearchInnovationAssignment(adminActor, {
        planId: researchPlan._id.toString(),
        assigneeUserId: contributorUser._id.toString(),
        isActive: true,
    });
    await saveResearchInnovationContributionDraft(contributorActor, researchAssignment._id.toString(), {
        researchStrategy: "Build a governed publication and innovation pipeline.",
        innovationEcosystem: "Innovation mentorship, grants, and startup support are aligned.",
        collaborationHighlights: "Department partnerships with internal and external stakeholders.",
        supportingLinks: ["https://example.com/research-flow"],
        activities: [
            {
                title: "Verification Innovation Drive",
                activityType: "Incubation",
                stage: "Ongoing",
                displayOrder: 1,
            },
        ],
        grants: [],
        startups: [],
    });
    await submitResearchInnovationAssignment(contributorActor, researchAssignment._id.toString());
    await expectSelfReviewBlocked(
        "research-innovation",
        reviewResearchInnovationAssignment,
        contributorActor,
        researchAssignment._id.toString()
    );
    report.researchInnovation = await advanceWorkflow(
        "research-innovation",
        reviewResearchInnovationAssignment,
        researchAssignment._id.toString(),
        reviewerActor,
        adminActor
    );

    const infrastructurePlan = await createInfrastructureLibraryPlan(adminActor, {
        academicYearId: academicYear._id.toString(),
        scopeType: "Department",
        institutionId: departmentHeadUser.institutionId?.toString(),
        departmentId: departmentHeadUser.departmentId?.toString(),
        title: `${RUN_TAG} Infrastructure Plan`,
        focusArea: "Integrated",
        facultyOwnerUserId: contributorUser._id.toString(),
        status: "Active",
    });
    const infrastructureAssignment = await createInfrastructureLibraryAssignment(adminActor, {
        planId: infrastructurePlan._id.toString(),
        assigneeUserId: contributorUser._id.toString(),
        isActive: true,
    });
    await saveInfrastructureLibraryContributionDraft(
        contributorActor,
        infrastructureAssignment._id.toString(),
        {
            infrastructureOverview: "Integrated classroom and lab readiness review.",
            libraryOverview: "Library services and access coverage reviewed for the cycle.",
            maintenanceProtocol: "Preventive maintenance calendar is active.",
            utilizationInsights: "Usage analytics are reviewed monthly.",
            supportingLinks: ["https://example.com/infrastructure-flow"],
            facilities: [
                {
                    facilityType: "Classroom",
                    name: "Verification Smart Classroom",
                    status: "Available",
                    ictEnabled: true,
                    displayOrder: 1,
                },
            ],
            libraryResources: [],
            usageRows: [],
            maintenanceRows: [],
        }
    );
    await submitInfrastructureLibraryAssignment(contributorActor, infrastructureAssignment._id.toString());
    await expectSelfReviewBlocked(
        "infrastructure-library",
        reviewInfrastructureLibraryAssignment,
        contributorActor,
        infrastructureAssignment._id.toString()
    );
    report.infrastructureLibrary = await advanceWorkflow(
        "infrastructure-library",
        reviewInfrastructureLibraryAssignment,
        infrastructureAssignment._id.toString(),
        reviewerActor,
        adminActor
    );

    const studentSupportPlan = await createStudentSupportGovernancePlan(adminActor, {
        academicYearId: academicYear._id.toString(),
        scopeType: "Department",
        institutionId: departmentHeadUser.institutionId?.toString(),
        departmentId: departmentHeadUser.departmentId?.toString(),
        title: `${RUN_TAG} Student Support Plan`,
        focusArea: "Integrated",
        facultyOwnerUserId: contributorUser._id.toString(),
        status: "Active",
    });
    const studentSupportAssignment = await createStudentSupportGovernanceAssignment(adminActor, {
        planId: studentSupportPlan._id.toString(),
        assigneeUserId: contributorUser._id.toString(),
        isActive: true,
    });
    await saveStudentSupportGovernanceContributionDraft(
        contributorActor,
        studentSupportAssignment._id.toString(),
        {
            mentoringFramework: "Mentor allocation and monitoring framework is active.",
            grievanceRedressalSystem: "Escalation and closure workflow is defined.",
            progressionTracking: "Placement and higher-studies tracking is updated monthly.",
            placementReadiness: "Placement preparation interventions are aligned to student cohorts.",
            supportingLinks: ["https://example.com/student-support-flow"],
            mentorGroups: [
                {
                    groupName: "Verification Mentor Group",
                    mentorName: contributorUser.name,
                    menteeCount: 12,
                    displayOrder: 1,
                },
            ],
            grievances: [],
            progressionRows: [],
            representationRows: [],
        }
    );
    await submitStudentSupportGovernanceAssignment(
        contributorActor,
        studentSupportAssignment._id.toString()
    );
    await expectSelfReviewBlocked(
        "student-support-governance",
        reviewStudentSupportGovernanceAssignment,
        contributorActor,
        studentSupportAssignment._id.toString()
    );
    report.studentSupportGovernance = await advanceWorkflow(
        "student-support-governance",
        reviewStudentSupportGovernanceAssignment,
        studentSupportAssignment._id.toString(),
        reviewerActor,
        adminActor
    );

    const governancePlan = await createGovernanceLeadershipIqacPlan(adminActor, {
        academicYearId: academicYear._id.toString(),
        scopeType: "Department",
        institutionId: departmentHeadUser.institutionId?.toString(),
        departmentId: departmentHeadUser.departmentId?.toString(),
        title: `${RUN_TAG} Governance Plan`,
        focusArea: "Integrated",
        ownerUserId: contributorUser._id.toString(),
        status: "Active",
    });
    const governanceAssignment = await createGovernanceLeadershipIqacAssignment(adminActor, {
        planId: governancePlan._id.toString(),
        assigneeUserId: contributorUser._id.toString(),
        isActive: true,
    });
    await saveGovernanceLeadershipIqacContributionDraft(
        contributorActor,
        governanceAssignment._id.toString(),
        {
            governanceStructureNarrative: "Governance structure is documented and delegated.",
            leadershipParticipationNarrative: "Leadership participation is reviewed in scheduled forums.",
            qualityInitiativesNarrative: "IQAC-led quality initiatives are monitored with closure notes.",
            policyGovernanceNarrative: "Policy issue, review, and revision workflow is active.",
            supportingLinks: ["https://example.com/governance-flow"],
            iqacMeetings: [
                {
                    meetingType: "IQAC",
                    title: "Verification IQAC Meeting",
                    meetingDate: new Date().toISOString().slice(0, 10),
                    documentId: evidence.governance._id.toString(),
                    displayOrder: 1,
                },
            ],
            qualityInitiatives: [],
            policyCirculars: [],
            complianceReviews: [],
        }
    );
    await submitGovernanceLeadershipIqacAssignment(
        contributorActor,
        governanceAssignment._id.toString()
    );
    await expectSelfReviewBlocked(
        "governance-leadership-iqac",
        reviewGovernanceLeadershipIqacAssignment,
        contributorActor,
        governanceAssignment._id.toString()
    );
    report.governanceLeadershipIqac = await advanceWorkflow(
        "governance-leadership-iqac",
        reviewGovernanceLeadershipIqacAssignment,
        governanceAssignment._id.toString(),
        reviewerActor,
        adminActor
    );

    const valuesPlan = await createInstitutionalValuesBestPracticesPlan(adminActor, {
        academicYearId: academicYear._id.toString(),
        scopeType: "Department",
        institutionId: departmentHeadUser.institutionId?.toString(),
        departmentId: departmentHeadUser.departmentId?.toString(),
        title: `${RUN_TAG} Criteria 7 Plan`,
        theme: "Integrated",
        ownerUserId: contributorUser._id.toString(),
        status: "Active",
    });
    const valuesAssignment = await createInstitutionalValuesBestPracticesAssignment(adminActor, {
        planId: valuesPlan._id.toString(),
        assigneeUserId: contributorUser._id.toString(),
        isActive: true,
    });
    await saveInstitutionalValuesBestPracticesContributionDraft(
        contributorActor,
        valuesAssignment._id.toString(),
        {
            environmentalSustainabilityNarrative: "Environmental sustainability measures are documented and tracked.",
            inclusivenessNarrative: "Inclusiveness interventions are recorded with accessible infrastructure notes.",
            humanValuesNarrative: "Human values and ethics programmes are documented for the cycle.",
            communityOutreachNarrative: "Community outreach activities are structured and reviewed.",
            bestPracticesNarrative: "Institutional best practices are documented with outcome evidence.",
            institutionalDistinctivenessNarrative: "Distinctiveness narrative is aligned with impact statements.",
            sustainabilityAuditNarrative: "Sustainability audit and follow-up observations are tracked.",
            supportingLinks: ["https://example.com/criteria7-flow"],
            greenCampusInitiatives: [
                {
                    initiativeType: "TreePlantation",
                    title: "Verification Green Campus Drive",
                    status: "InProgress",
                    documentId: evidence.criteria7._id.toString(),
                    displayOrder: 1,
                },
            ],
            energyConsumptionRecords: [],
            waterManagementSystems: [],
            wasteManagementPractices: [],
            genderEquityPrograms: [],
            inclusivenessFacilities: [],
            ethicsPrograms: [],
            codeOfConductRecords: [],
            communityOutreachPrograms: [],
            outreachParticipants: [],
            institutionalBestPractices: [],
            institutionalDistinctivenessEntries: [],
            sustainabilityAudits: [],
        }
    );
    await submitInstitutionalValuesBestPracticesAssignment(
        contributorActor,
        valuesAssignment._id.toString()
    );
    await expectSelfReviewBlocked(
        "institutional-values-best-practices",
        reviewInstitutionalValuesBestPracticesAssignment,
        contributorActor,
        valuesAssignment._id.toString()
    );
    report.institutionalValuesBestPractices = await advanceWorkflow(
        "institutional-values-best-practices",
        reviewInstitutionalValuesBestPracticesAssignment,
        valuesAssignment._id.toString(),
        reviewerActor,
        adminActor
    );

    console.log(
        JSON.stringify(
            {
                runTag: RUN_TAG,
                admin: { id: adminUser._id.toString(), email: adminUser.email },
                reviewer: { id: departmentHeadUser._id.toString(), email: departmentHeadUser.email },
                contributor: { id: contributorUser._id.toString(), email: contributorUser.email },
                report,
            },
            null,
            2
        )
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
