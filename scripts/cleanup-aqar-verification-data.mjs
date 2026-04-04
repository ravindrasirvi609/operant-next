import dbConnect from "../src/lib/dbConnect.ts";
import User from "../src/models/core/user.ts";
import DocumentModel from "../src/models/reference/document.ts";
import Program from "../src/models/academic/program.ts";
import Course from "../src/models/academic/course.ts";
import GovernanceCommittee from "../src/models/core/governance-committee.ts";
import GovernanceCommitteeMembership from "../src/models/core/governance-committee-membership.ts";
import CurriculumPlan from "../src/models/academic/curriculum-plan.ts";
import CurriculumCourse from "../src/models/academic/curriculum-course.ts";
import CurriculumSyllabusVersion from "../src/models/academic/curriculum-syllabus-version.ts";
import CurriculumProgramOutcome from "../src/models/academic/curriculum-program-outcome.ts";
import CurriculumCourseOutcome from "../src/models/academic/curriculum-course-outcome.ts";
import CurriculumOutcomeMapping from "../src/models/academic/curriculum-outcome-mapping.ts";
import CurriculumAssignment from "../src/models/academic/curriculum-assignment.ts";
import TeachingLearningPlan from "../src/models/academic/teaching-learning-plan.ts";
import TeachingLearningAssignment from "../src/models/academic/teaching-learning-assignment.ts";
import TeachingLearningSession from "../src/models/academic/teaching-learning-session.ts";
import TeachingLearningAssessment from "../src/models/academic/teaching-learning-assessment.ts";
import TeachingLearningSupport from "../src/models/academic/teaching-learning-support.ts";
import ResearchInnovationPlan from "../src/models/research/research-innovation-plan.ts";
import ResearchInnovationAssignment from "../src/models/research/research-innovation-assignment.ts";
import ResearchInnovationActivity from "../src/models/research/research-innovation-activity.ts";
import ResearchInnovationGrant from "../src/models/research/research-innovation-grant.ts";
import ResearchInnovationStartup from "../src/models/research/research-innovation-startup.ts";
import InfrastructureLibraryPlan from "../src/models/operations/infrastructure-library-plan.ts";
import InfrastructureLibraryAssignment from "../src/models/operations/infrastructure-library-assignment.ts";
import InfrastructureLibraryFacility from "../src/models/operations/infrastructure-library-facility.ts";
import InfrastructureLibraryResource from "../src/models/operations/infrastructure-library-resource.ts";
import InfrastructureLibraryUsage from "../src/models/operations/infrastructure-library-usage.ts";
import InfrastructureLibraryMaintenance from "../src/models/operations/infrastructure-library-maintenance.ts";
import StudentSupportGovernancePlan from "../src/models/student/student-support-governance-plan.ts";
import StudentSupportGovernanceAssignment from "../src/models/student/student-support-governance-assignment.ts";
import StudentSupportMentorGroup from "../src/models/student/student-support-mentor-group.ts";
import StudentSupportGrievance from "../src/models/student/student-support-grievance.ts";
import StudentSupportProgression from "../src/models/student/student-support-progression.ts";
import StudentSupportRepresentation from "../src/models/student/student-support-representation.ts";
import GovernanceLeadershipIqacPlan from "../src/models/core/governance-leadership-iqac-plan.ts";
import GovernanceLeadershipIqacAssignment from "../src/models/core/governance-leadership-iqac-assignment.ts";
import GovernanceIqacMeeting from "../src/models/core/governance-iqac-meeting.ts";
import GovernanceQualityInitiative from "../src/models/core/governance-quality-initiative.ts";
import GovernancePolicyCircular from "../src/models/core/governance-policy-circular.ts";
import GovernanceComplianceReview from "../src/models/core/governance-compliance-review.ts";
import InstitutionalValuesBestPracticesPlan from "../src/models/quality/institutional-values-best-practices-plan.ts";
import InstitutionalValuesBestPracticesAssignment from "../src/models/quality/institutional-values-best-practices-assignment.ts";
import GreenCampusInitiative from "../src/models/quality/green-campus-initiative.ts";
import EnvironmentalResourceRecord from "../src/models/quality/environmental-resource-record.ts";
import EnergyConsumptionRecord from "../src/models/quality/energy-consumption-record.ts";
import WaterManagementSystem from "../src/models/quality/water-management-system.ts";
import WasteManagementPractice from "../src/models/quality/waste-management-practice.ts";
import GenderEquityProgram from "../src/models/quality/gender-equity-program.ts";
import InclusivenessFacility from "../src/models/quality/inclusiveness-facility.ts";
import EthicsProgram from "../src/models/quality/ethics-program.ts";
import CodeOfConductRecord from "../src/models/quality/code-of-conduct-record.ts";
import CommunityOutreachProgram from "../src/models/quality/community-outreach-program.ts";
import OutreachParticipant from "../src/models/quality/outreach-participant.ts";
import InstitutionalBestPractice from "../src/models/quality/institutional-best-practice.ts";
import InstitutionalDistinctiveness from "../src/models/quality/institutional-distinctiveness.ts";
import SustainabilityAudit from "../src/models/quality/sustainability-audit.ts";

const runPrefix = /^Codex AQAR Verify/;
const emailPrefix = /^codex-aqar-/;

async function main() {
    await dbConnect();

    const curriculumPlans = await CurriculumPlan.find({ title: runPrefix }).select("_id");
    const curriculumPlanIds = curriculumPlans.map((item) => item._id);
    const curriculumCourses = await CurriculumCourse.find({
        curriculumId: { $in: curriculumPlanIds },
    }).select("_id");
    const curriculumCourseIds = curriculumCourses.map((item) => item._id);
    const syllabusVersions = await CurriculumSyllabusVersion.find({
        curriculumId: { $in: curriculumPlanIds },
    }).select("_id");
    const syllabusVersionIds = syllabusVersions.map((item) => item._id);
    const curriculumAssignments = await CurriculumAssignment.find({
        curriculumId: { $in: curriculumPlanIds },
    }).select("_id");

    const teachingPlans = await TeachingLearningPlan.find({ title: runPrefix }).select("_id");
    const teachingPlanIds = teachingPlans.map((item) => item._id);
    const teachingAssignments = await TeachingLearningAssignment.find({
        planId: { $in: teachingPlanIds },
    }).select("_id");

    const researchPlans = await ResearchInnovationPlan.find({ title: runPrefix }).select("_id");
    const researchPlanIds = researchPlans.map((item) => item._id);
    const researchAssignments = await ResearchInnovationAssignment.find({
        planId: { $in: researchPlanIds },
    }).select("_id");

    const infrastructurePlans = await InfrastructureLibraryPlan.find({ title: runPrefix }).select("_id");
    const infrastructurePlanIds = infrastructurePlans.map((item) => item._id);
    const infrastructureAssignments = await InfrastructureLibraryAssignment.find({
        planId: { $in: infrastructurePlanIds },
    }).select("_id");

    const studentPlans = await StudentSupportGovernancePlan.find({ title: runPrefix }).select("_id");
    const studentPlanIds = studentPlans.map((item) => item._id);
    const studentAssignments = await StudentSupportGovernanceAssignment.find({
        planId: { $in: studentPlanIds },
    }).select("_id");

    const governancePlans = await GovernanceLeadershipIqacPlan.find({ title: runPrefix }).select("_id");
    const governancePlanIds = governancePlans.map((item) => item._id);
    const governanceAssignments = await GovernanceLeadershipIqacAssignment.find({
        planId: { $in: governancePlanIds },
    }).select("_id");

    const valuesPlans = await InstitutionalValuesBestPracticesPlan.find({
        title: runPrefix,
    }).select("_id");
    const valuesPlanIds = valuesPlans.map((item) => item._id);
    const valuesAssignments = await InstitutionalValuesBestPracticesAssignment.find({
        planId: { $in: valuesPlanIds },
    }).select("_id");

    const assignmentIds = {
        teaching: teachingAssignments.map((item) => item._id),
        research: researchAssignments.map((item) => item._id),
        infrastructure: infrastructureAssignments.map((item) => item._id),
        student: studentAssignments.map((item) => item._id),
        governance: governanceAssignments.map((item) => item._id),
        values: valuesAssignments.map((item) => item._id),
        curriculum: curriculumAssignments.map((item) => item._id),
    };

    await Promise.all([
        CurriculumOutcomeMapping.deleteMany({ syllabusVersionId: { $in: syllabusVersionIds } }),
        CurriculumCourseOutcome.deleteMany({ syllabusVersionId: { $in: syllabusVersionIds } }),
        CurriculumProgramOutcome.deleteMany({ curriculumId: { $in: curriculumPlanIds } }),
        CurriculumAssignment.deleteMany({ _id: { $in: assignmentIds.curriculum } }),
        CurriculumSyllabusVersion.deleteMany({ _id: { $in: syllabusVersionIds } }),
        CurriculumCourse.deleteMany({ _id: { $in: curriculumCourseIds } }),
        CurriculumPlan.deleteMany({ _id: { $in: curriculumPlanIds } }),

        TeachingLearningSession.deleteMany({ assignmentId: { $in: assignmentIds.teaching } }),
        TeachingLearningAssessment.deleteMany({ assignmentId: { $in: assignmentIds.teaching } }),
        TeachingLearningSupport.deleteMany({ assignmentId: { $in: assignmentIds.teaching } }),
        TeachingLearningAssignment.deleteMany({ _id: { $in: assignmentIds.teaching } }),
        TeachingLearningPlan.deleteMany({ _id: { $in: teachingPlanIds } }),

        ResearchInnovationActivity.deleteMany({ assignmentId: { $in: assignmentIds.research } }),
        ResearchInnovationGrant.deleteMany({ assignmentId: { $in: assignmentIds.research } }),
        ResearchInnovationStartup.deleteMany({ assignmentId: { $in: assignmentIds.research } }),
        ResearchInnovationAssignment.deleteMany({ _id: { $in: assignmentIds.research } }),
        ResearchInnovationPlan.deleteMany({ _id: { $in: researchPlanIds } }),

        InfrastructureLibraryFacility.deleteMany({ assignmentId: { $in: assignmentIds.infrastructure } }),
        InfrastructureLibraryResource.deleteMany({ assignmentId: { $in: assignmentIds.infrastructure } }),
        InfrastructureLibraryUsage.deleteMany({ assignmentId: { $in: assignmentIds.infrastructure } }),
        InfrastructureLibraryMaintenance.deleteMany({ assignmentId: { $in: assignmentIds.infrastructure } }),
        InfrastructureLibraryAssignment.deleteMany({ _id: { $in: assignmentIds.infrastructure } }),
        InfrastructureLibraryPlan.deleteMany({ _id: { $in: infrastructurePlanIds } }),

        StudentSupportMentorGroup.deleteMany({ assignmentId: { $in: assignmentIds.student } }),
        StudentSupportGrievance.deleteMany({ assignmentId: { $in: assignmentIds.student } }),
        StudentSupportProgression.deleteMany({ assignmentId: { $in: assignmentIds.student } }),
        StudentSupportRepresentation.deleteMany({ assignmentId: { $in: assignmentIds.student } }),
        StudentSupportGovernanceAssignment.deleteMany({ _id: { $in: assignmentIds.student } }),
        StudentSupportGovernancePlan.deleteMany({ _id: { $in: studentPlanIds } }),

        GovernanceIqacMeeting.deleteMany({ assignmentId: { $in: assignmentIds.governance } }),
        GovernanceQualityInitiative.deleteMany({ assignmentId: { $in: assignmentIds.governance } }),
        GovernancePolicyCircular.deleteMany({ assignmentId: { $in: assignmentIds.governance } }),
        GovernanceComplianceReview.deleteMany({ assignmentId: { $in: assignmentIds.governance } }),
        GovernanceLeadershipIqacAssignment.deleteMany({ _id: { $in: assignmentIds.governance } }),
        GovernanceLeadershipIqacPlan.deleteMany({ _id: { $in: governancePlanIds } }),

        GreenCampusInitiative.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        EnvironmentalResourceRecord.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        EnergyConsumptionRecord.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        WaterManagementSystem.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        WasteManagementPractice.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        GenderEquityProgram.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        InclusivenessFacility.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        EthicsProgram.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        CodeOfConductRecord.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        CommunityOutreachProgram.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        OutreachParticipant.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        InstitutionalBestPractice.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        InstitutionalDistinctiveness.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        SustainabilityAudit.deleteMany({ assignmentId: { $in: assignmentIds.values } }),
        InstitutionalValuesBestPracticesAssignment.deleteMany({ _id: { $in: assignmentIds.values } }),
        InstitutionalValuesBestPracticesPlan.deleteMany({ _id: { $in: valuesPlanIds } }),
    ]);

    await GovernanceCommitteeMembership.deleteMany({
        $or: [{ memberName: runPrefix }, { memberEmail: emailPrefix }],
    });
    await GovernanceCommittee.deleteMany({ name: runPrefix });
    await Course.deleteMany({ name: runPrefix });
    await Program.deleteMany({ name: runPrefix });
    await DocumentModel.deleteMany({ fileName: runPrefix });
    await User.deleteMany({ $or: [{ name: runPrefix }, { email: emailPrefix }] });

    console.log(
        JSON.stringify(
            {
                deleted: {
                    curriculumPlans: curriculumPlanIds.length,
                    teachingPlans: teachingPlanIds.length,
                    researchPlans: researchPlanIds.length,
                    infrastructurePlans: infrastructurePlanIds.length,
                    studentSupportPlans: studentPlanIds.length,
                    governancePlans: governancePlanIds.length,
                    criteria7Plans: valuesPlanIds.length,
                },
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
