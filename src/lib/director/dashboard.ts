import dbConnect from "@/lib/dbConnect";
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import LeadershipAssignment from "@/models/core/leadership-assignment";
import Organization from "@/models/core/organization";
import User from "@/models/core/user";
import Report from "@/models/reporting/report";
import ReportingStatus from "@/models/reporting/reporting-status";

export async function getDirectorDashboardData(userId: string) {
    await dbConnect();

    const managedOrganizations = await Organization.find({
        headUserId: userId,
        isActive: true,
    }).sort({ hierarchyLevel: 1, name: 1 });

    const colleges = managedOrganizations
        .filter((item) => item.type === "College")
        .map((item) => item.name);
    const departments = managedOrganizations
        .filter((item) => item.type === "Department")
        .map((item) => item.name);

    const childFilters: Array<Record<string, unknown>> = [];

    if (colleges.length) {
        childFilters.push({ collegeName: { $in: colleges } });
    }

    if (departments.length) {
        childFilters.push({ name: { $in: departments } });
    }

    if (managedOrganizations.length) {
        childFilters.push({
            parentOrganizationId: { $in: managedOrganizations.map((item) => item._id) },
        });
    }

    const childOrganizations = await Organization.find({
        $or: childFilters.length ? childFilters : [{ _id: { $in: [] } }],
        isActive: true,
    });

    const collegeNames = colleges.length
        ? colleges
        : managedOrganizations
              .map((item) => item.collegeName)
              .filter((item): item is string => Boolean(item));
    const departmentNames = departments.length
        ? departments
        : managedOrganizations.map((item) => item.name);

    const scopeFilters: Array<Record<string, unknown>> = [];

    if (collegeNames.length) {
        scopeFilters.push({ collegeName: { $in: collegeNames } });
    }

    if (departmentNames.length) {
        scopeFilters.push({ department: { $in: departmentNames } });
    }

    const [facultyCount, studentCount, reportCount, lockedSections, leadershipAssignments, committeeMemberships] = await Promise.all([
        User.countDocuments({
            role: "Faculty",
            $or: scopeFilters.length ? scopeFilters : [{ _id: { $in: [] } }],
        }),
        User.countDocuments({
            role: "Student",
            $or: scopeFilters.length ? scopeFilters : [{ _id: { $in: [] } }],
        }),
        Report.countDocuments({
            collegeName: { $in: collegeNames.length ? collegeNames : ["__none__"] },
        }),
        ReportingStatus.find({
            collegeName: { $in: collegeNames.length ? collegeNames : ["__none__"] },
        }).sort({ updatedAt: -1 }),
        LeadershipAssignment.find({
            userId,
            isActive: true,
        })
            .select("assignmentType organizationName organizationType collegeName universityName")
            .lean(),
        GovernanceCommitteeMembership.find({
            userId,
            isActive: true,
        })
            .populate("committeeId", "name committeeType organizationName")
            .select("memberRole")
            .lean(),
    ]);

    return {
        managedOrganizations,
        childOrganizations,
        leadershipAssignments,
        committeeMemberships: committeeMemberships
            .map((membership) => {
                const committee = membership.committeeId as {
                    name?: string;
                    committeeType?: string;
                    organizationName?: string;
                } | null;

                if (!committee?.name) {
                    return null;
                }

                return {
                    name: committee.name,
                    committeeType: committee.committeeType,
                    organizationName: committee.organizationName,
                    memberRole: membership.memberRole,
                };
            })
            .filter(Boolean),
        metrics: {
            facultyCount,
            studentCount,
            reportCount,
            lockedSections: lockedSections.length,
        },
        lockedSections,
    };
}
