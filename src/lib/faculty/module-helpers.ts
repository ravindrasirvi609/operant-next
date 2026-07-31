import { Types } from "mongoose";

import { AuthError } from "@/lib/auth/errors";
import {
    resolveFacultyAuthorizationScope,
    type AuthorizationSubjectScope,
} from "@/lib/authorization/service";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";

/**
 * Normalised user+faculty info returned by getFacultyUserInfo.
 * Callers typically need `_id` (for notification targeting) and
 * `department` / `designation` (for display and scope resolution).
 */
export type FacultyUserInfo = {
    _id: Types.ObjectId;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    department?: string | null;
    designation?: string | null;
    universityName?: string | null;
    collegeName?: string | null;
};

/**
 * Structural interface satisfied by both AqarApplication and
 * FacultyPbasForm Mongoose documents — the seven scope fields
 * that applyFacultyWorkflowScope writes onto the application.
 */
export interface ApplicationScopeFields {
    scopeDepartmentId?: Types.ObjectId;
    scopeInstitutionId?: Types.ObjectId;
    scopeDepartmentOrganizationId?: Types.ObjectId;
    scopeCollegeOrganizationId?: Types.ObjectId;
    scopeUniversityOrganizationId?: Types.ObjectId;
    scopeOrganizationIds: Types.ObjectId[];
}

/**
 * Load the user and department info for a faculty member.
 * Replaces the copy-pasted getUserForApplication() that existed
 * independently in both aqar/service.ts and pbas/service.ts.
 */
export async function getFacultyUserInfo(
    facultyId: Types.ObjectId
): Promise<FacultyUserInfo> {
    const faculty = await Faculty.findById(facultyId).select(
        "userId departmentId designation firstName lastName"
    );

    if (!faculty?.userId) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const user = await User.findById(faculty.userId).select(
        "name email role department designation universityName collegeName"
    );

    if (!user) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const department = faculty.departmentId
        ? await Department.findById(faculty.departmentId).select("name")
        : null;

    const obj = user.toObject() as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
        role?: string;
        department?: string;
        designation?: string;
        universityName?: string;
        collegeName?: string;
    };

    return {
        _id: obj._id,
        name: obj.name,
        email: obj.email,
        role: obj.role,
        department: department?.name ?? obj.department,
        designation: faculty.designation || obj.designation,
        universityName: obj.universityName,
        collegeName: obj.collegeName,
    };
}

/**
 * Resolve the faculty member's organisational scope and write all
 * seven scope fields onto the application document so they are
 * persisted on the next .save() call.
 *
 * Replaces the identical getAqarWorkflowScope / getPbasWorkflowScope
 * helpers that were copy-pasted between the two service files.
 *
 * Returns the resolved AuthorizationSubjectScope for immediate use
 * in workflow / notification calls.
 */
export async function applyFacultyWorkflowScope<
    T extends ApplicationScopeFields,
>(
    application: T,
    facultyId: Types.ObjectId
): Promise<AuthorizationSubjectScope> {
    const resolved = await resolveFacultyAuthorizationScope(
        facultyId.toString()
    );

    application.scopeDepartmentId =
        resolved.departmentId && Types.ObjectId.isValid(resolved.departmentId)
            ? new Types.ObjectId(resolved.departmentId)
            : undefined;

    application.scopeInstitutionId =
        resolved.institutionId && Types.ObjectId.isValid(resolved.institutionId)
            ? new Types.ObjectId(resolved.institutionId)
            : undefined;

    application.scopeDepartmentOrganizationId =
        resolved.departmentOrganizationId &&
        Types.ObjectId.isValid(resolved.departmentOrganizationId)
            ? new Types.ObjectId(resolved.departmentOrganizationId)
            : undefined;

    application.scopeCollegeOrganizationId =
        resolved.collegeOrganizationId &&
        Types.ObjectId.isValid(resolved.collegeOrganizationId)
            ? new Types.ObjectId(resolved.collegeOrganizationId)
            : undefined;

    application.scopeUniversityOrganizationId =
        resolved.universityOrganizationId &&
        Types.ObjectId.isValid(resolved.universityOrganizationId)
            ? new Types.ObjectId(resolved.universityOrganizationId)
            : undefined;

    application.scopeOrganizationIds = (
        resolved.subjectOrganizationIds ?? []
    )
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));

    return resolved;
}
