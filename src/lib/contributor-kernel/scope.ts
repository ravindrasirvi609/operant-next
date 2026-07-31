/**
 * Shared organisational-scope extraction for the contributor workflow.
 *
 * Every contributor assignment carries the same 9-field scope block, and every
 * module maps it into the `syncWorkflowInstanceState` / `canActorProcessWorkflowStage`
 * "subject scope" shape with identical `.toString()` conversions — copy-pasted
 * six times today. This is the single source of truth for that mapping.
 */

import { Types } from "mongoose";

/** Anything with a `.toString()` (e.g. a Mongoose `ObjectId`). */
type Stringable = { toString(): string };

/**
 * The scope fields present on every contributor assignment document. Names and
 * denormalised string + ObjectId pairing are consistent across all six modules.
 */
export interface ContributorScopeSource {
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    scopeDepartmentId?: Stringable | null;
    scopeInstitutionId?: Stringable | null;
    scopeDepartmentOrganizationId?: Stringable | null;
    scopeCollegeOrganizationId?: Stringable | null;
    scopeUniversityOrganizationId?: Stringable | null;
    scopeOrganizationIds?: Stringable[];
}

/** The "subject scope" shape the workflow engine functions accept. */
export interface WorkflowSubjectScope {
    subjectDepartmentName?: string;
    subjectCollegeName?: string;
    subjectUniversityName?: string;
    subjectDepartmentId?: string;
    subjectInstitutionId?: string;
    subjectDepartmentOrganizationId?: string;
    subjectCollegeOrganizationId?: string;
    subjectUniversityOrganizationId?: string;
    subjectOrganizationIds: string[];
}

/** Convert an ObjectId-ish value to a string, or `undefined` when absent. */
function idToString(value?: Stringable | null): string | undefined {
    return value ? value.toString() : undefined;
}

/**
 * Map an assignment's scope block to the workflow engine's subject-scope shape.
 * Mirrors the inline mapping in every module's submit/review service function.
 */
export function toWorkflowSubjectScope(source: ContributorScopeSource): WorkflowSubjectScope {
    return {
        subjectDepartmentName: source.scopeDepartmentName || undefined,
        subjectCollegeName: source.scopeCollegeName || undefined,
        subjectUniversityName: source.scopeUniversityName || undefined,
        subjectDepartmentId: idToString(source.scopeDepartmentId),
        subjectInstitutionId: idToString(source.scopeInstitutionId),
        subjectDepartmentOrganizationId: idToString(source.scopeDepartmentOrganizationId),
        subjectCollegeOrganizationId: idToString(source.scopeCollegeOrganizationId),
        subjectUniversityOrganizationId: idToString(source.scopeUniversityOrganizationId),
        subjectOrganizationIds: (source.scopeOrganizationIds ?? []).map((value) => value.toString()),
    };
}

/**
 * The resolved-scope shape produced by module scope resolvers (string-based ids).
 * Structurally identical across every contributor module's local `<Module>Scope` type.
 */
export interface ResolvedScopeInput {
    departmentName?: string;
    collegeName?: string;
    universityName?: string;
    departmentId?: string;
    institutionId?: string;
    departmentOrganizationId?: string;
    collegeOrganizationId?: string;
    universityOrganizationId?: string;
    subjectOrganizationIds?: string[];
}

/** A document (plan or assignment) that carries the writable 9-field scope block. */
export interface WritableScopeTarget {
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    scopeDepartmentId?: Types.ObjectId;
    scopeInstitutionId?: Types.ObjectId;
    scopeDepartmentOrganizationId?: Types.ObjectId;
    scopeCollegeOrganizationId?: Types.ObjectId;
    scopeUniversityOrganizationId?: Types.ObjectId;
    scopeOrganizationIds: Types.ObjectId[];
}

function toObjectId(value?: string): Types.ObjectId | undefined {
    return value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;
}

/**
 * Write the full 9-field scope snapshot (denormalised names + ObjectId refs) onto a
 * plan/assignment document. The single write-side counterpart to `toWorkflowSubjectScope`:
 * centralising this ensures a module can never persist ObjectIds while forgetting the
 * denormalised names (or vice-versa), which is what kept the two out of sync before.
 */
export function writeScopeSnapshot(target: WritableScopeTarget, scope: ResolvedScopeInput): void {
    target.scopeDepartmentName = scope.departmentName;
    target.scopeCollegeName = scope.collegeName;
    target.scopeUniversityName = scope.universityName;
    target.scopeDepartmentId = toObjectId(scope.departmentId);
    target.scopeInstitutionId = toObjectId(scope.institutionId);
    target.scopeDepartmentOrganizationId = toObjectId(scope.departmentOrganizationId);
    target.scopeCollegeOrganizationId = toObjectId(scope.collegeOrganizationId);
    target.scopeUniversityOrganizationId = toObjectId(scope.universityOrganizationId);
    target.scopeOrganizationIds = (scope.subjectOrganizationIds ?? [])
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));
}
