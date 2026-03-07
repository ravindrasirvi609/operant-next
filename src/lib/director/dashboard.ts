import dbConnect from "@/lib/dbConnect";
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

    const [facultyCount, studentCount, reportCount, lockedSections] = await Promise.all([
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
    ]);

    return {
        managedOrganizations,
        childOrganizations,
        metrics: {
            facultyCount,
            studentCount,
            reportCount,
            lockedSections: lockedSections.length,
        },
        lockedSections,
    };
}
