import { describe, expect, it } from "vitest";

import {
    buildAuthorizedScopeQuery,
    canReviewWorkflowStage,
    canUseBreakGlassOverride,
    canViewModuleRecord,
    type AuthorizationActor,
    type AuthorizationProfile,
    type AuthorizationScope,
    type AuthorizationSubjectScope,
} from "@/lib/authorization/service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfile(overrides: Partial<AuthorizationProfile> = {}): AuthorizationProfile {
    return {
        actorId: "aaa000000000000000000001",
        actorRole: "Faculty",
        isAdmin: false,
        isFaculty: true,
        isStudent: false,
        hasLeadershipPortalAccess: false,
        browseScopes: [],
        workflowRoles: [],
        workflowRoleScopes: {},
        ...overrides,
    };
}

function adminProfile(): AuthorizationProfile {
    return makeProfile({ isAdmin: true, isFaculty: false, actorRole: "Admin" });
}

function makeScope(overrides: Partial<AuthorizationScope> = {}): AuthorizationScope {
    return { source: "leadership", departmentId: "dept-001", ...overrides };
}

function makeSubject(overrides: Partial<AuthorizationSubjectScope> = {}): AuthorizationSubjectScope {
    return { departmentId: "dept-001", ...overrides };
}

// ---------------------------------------------------------------------------
// canViewModuleRecord
// ---------------------------------------------------------------------------

describe("canViewModuleRecord", () => {
    it("admin profile → true regardless of scope", () => {
        expect(canViewModuleRecord(adminProfile(), "PBAS", makeSubject({ departmentId: "other" }))).toBe(true);
    });

    it("non-admin with matching browseScope → true", () => {
        const profile = makeProfile({
            browseScopes: [makeScope({ departmentId: "dept-001" })],
        });
        expect(canViewModuleRecord(profile, "PBAS", makeSubject({ departmentId: "dept-001" }))).toBe(true);
    });

    it("non-admin with non-matching browseScope → false", () => {
        const profile = makeProfile({
            browseScopes: [makeScope({ departmentId: "dept-999" })],
        });
        expect(canViewModuleRecord(profile, "PBAS", makeSubject({ departmentId: "dept-001" }))).toBe(false);
    });

    it("non-admin with empty browseScopes → false", () => {
        expect(canViewModuleRecord(makeProfile(), "PBAS", makeSubject())).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// canReviewWorkflowStage
// ---------------------------------------------------------------------------

describe("canReviewWorkflowStage", () => {
    it("admin + ADMIN in approverRoles → true", () => {
        expect(canReviewWorkflowStage(adminProfile(), makeSubject(), ["ADMIN"])).toBe(true);
    });

    it("admin + ADMIN not in approverRoles → false", () => {
        expect(canReviewWorkflowStage(adminProfile(), makeSubject(), ["DEPARTMENT_HEAD"])).toBe(false);
    });

    it("non-admin with matching workflowRole + matching scope → true", () => {
        const scope = makeScope({ departmentId: "dept-001" });
        const profile = makeProfile({
            hasLeadershipPortalAccess: true,
            workflowRoles: ["DEPARTMENT_HEAD"],
            workflowRoleScopes: { DEPARTMENT_HEAD: [scope] },
            browseScopes: [scope],
        });
        expect(
            canReviewWorkflowStage(profile, makeSubject({ departmentId: "dept-001" }), ["DEPARTMENT_HEAD"])
        ).toBe(true);
    });

    it("non-admin with matching role but non-matching scope → false", () => {
        const profile = makeProfile({
            hasLeadershipPortalAccess: true,
            workflowRoles: ["DEPARTMENT_HEAD"],
            workflowRoleScopes: {
                DEPARTMENT_HEAD: [makeScope({ departmentId: "dept-999" })],
            },
        });
        expect(
            canReviewWorkflowStage(profile, makeSubject({ departmentId: "dept-001" }), ["DEPARTMENT_HEAD"])
        ).toBe(false);
    });

    it("non-admin with workflowRole present but no scopes → false", () => {
        const profile = makeProfile({
            workflowRoles: ["DEPARTMENT_HEAD"],
            workflowRoleScopes: { DEPARTMENT_HEAD: [] },
        });
        expect(
            canReviewWorkflowStage(profile, makeSubject(), ["DEPARTMENT_HEAD"])
        ).toBe(false);
    });

    it("non-admin role not in workflowRoles → false", () => {
        const profile = makeProfile({
            workflowRoles: [],
            workflowRoleScopes: {},
        });
        expect(
            canReviewWorkflowStage(profile, makeSubject(), ["DEPARTMENT_HEAD"])
        ).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// buildAuthorizedScopeQuery
// ---------------------------------------------------------------------------

describe("buildAuthorizedScopeQuery", () => {
    it("admin → empty-match sentinel (admins bypass scope listing)", () => {
        const result = buildAuthorizedScopeQuery(adminProfile()) as { _id?: { $in: unknown[] } };
        expect(result).toHaveProperty("_id.$in");
        expect((result._id as { $in: unknown[] }).$in).toHaveLength(0);
    });

    it("non-admin without leadership access → empty-match sentinel", () => {
        const result = buildAuthorizedScopeQuery(makeProfile()) as { _id?: { $in: unknown[] } };
        expect(result).toHaveProperty("_id.$in");
        expect((result._id as { $in: unknown[] }).$in).toHaveLength(0);
    });

    it("non-admin with leadership access but empty scopes → empty-match sentinel", () => {
        const profile = makeProfile({ hasLeadershipPortalAccess: true, browseScopes: [] });
        const result = buildAuthorizedScopeQuery(profile) as { _id?: { $in: unknown[] } };
        expect(result).toHaveProperty("_id.$in");
    });

    it("non-admin with leadership access + departmentId scope → $or query", () => {
        const profile = makeProfile({
            hasLeadershipPortalAccess: true,
            browseScopes: [makeScope({ departmentId: "dept-abc" })],
        });
        const result = buildAuthorizedScopeQuery(profile) as { $or?: unknown[] };
        expect(result).toHaveProperty("$or");
        expect((result.$or as unknown[]).length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// canUseBreakGlassOverride
// ---------------------------------------------------------------------------

describe("canUseBreakGlassOverride", () => {
    it("AuthorizationActor with role Admin → true", () => {
        const actor: AuthorizationActor = {
            id: "u1",
            name: "Admin",
            role: "Admin",
        };
        expect(canUseBreakGlassOverride(actor)).toBe(true);
    });

    it("AuthorizationActor with role Faculty → false", () => {
        const actor: AuthorizationActor = {
            id: "u1",
            name: "Dr. A",
            role: "Faculty",
        };
        expect(canUseBreakGlassOverride(actor)).toBe(false);
    });

    it("AuthorizationProfile with isAdmin true → true", () => {
        expect(canUseBreakGlassOverride(adminProfile())).toBe(true);
    });

    it("AuthorizationProfile with isAdmin false → false", () => {
        expect(canUseBreakGlassOverride(makeProfile({ isAdmin: false }))).toBe(false);
    });
});
