import dbConnect from "@/lib/dbConnect";
import MasterData from "@/models/core/master-data";
import User from "@/models/core/user";
import Organization from "@/models/core/organization";
import Program from "@/models/academic/program";
import Report from "@/models/reporting/report";
import ReportingStatus from "@/models/reporting/reporting-status";
import Feedback from "@/models/engagement/feedback";
import SystemMisc from "@/models/engagement/system-misc";
import Publication from "@/models/research/publication";
import Project from "@/models/research/project";
import ResearchActivity from "@/models/research/research-activity";

export async function getAdminDashboardData() {
    await dbConnect();

    const [
        totalUsers,
        facultyUsers,
        studentUsers,
        adminUsers,
        pendingVerification,
        activeMasterData,
        organizations,
        programs,
        reports,
        reportingLocks,
        feedbackEntries,
        systemUpdates,
        publications,
        projects,
        researchActivities,
        recentUsers,
        recentMasterData,
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "Faculty" }),
        User.countDocuments({ role: "Student" }),
        User.countDocuments({ role: "Admin" }),
        User.countDocuments({ emailVerified: false }),
        MasterData.countDocuments({ isActive: true }),
        Organization.countDocuments(),
        Program.countDocuments(),
        Report.countDocuments(),
        ReportingStatus.countDocuments({ isLocked: true }),
        Feedback.countDocuments(),
        SystemMisc.countDocuments({ isActive: true }),
        Publication.countDocuments(),
        Project.countDocuments(),
        ResearchActivity.countDocuments(),
        User.find()
            .sort({ createdAt: -1 })
            .limit(6)
            .select("name email role universityName department collegeName createdAt isActive"),
        MasterData.find()
            .sort({ updatedAt: -1 })
            .limit(8)
            .select("category label isActive updatedAt"),
    ]);

    return {
        metrics: {
            totalUsers,
            facultyUsers,
            studentUsers,
            adminUsers,
            pendingVerification,
            activeMasterData,
            organizations,
            programs,
            reports,
            reportingLocks,
            feedbackEntries,
            systemUpdates,
            publications,
            projects,
            researchActivities,
        },
        recentUsers,
        recentMasterData,
    };
}
