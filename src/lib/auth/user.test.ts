import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    dbConnectMock,
    createSessionTokenMock,
    setSessionCookieMock,
    hashPasswordMock,
    userModelMock,
} = vi.hoisted(() => ({
    dbConnectMock: vi.fn(),
    createSessionTokenMock: vi.fn(),
    setSessionCookieMock: vi.fn(),
    hashPasswordMock: vi.fn(),
    userModelMock: {
        countDocuments: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        findById: vi.fn(),
    },
}));

vi.mock("next/navigation", () => ({
    redirect: vi.fn(),
}));

vi.mock("@/lib/dbConnect", () => ({
    default: dbConnectMock,
}));

vi.mock("@/lib/auth/session", () => ({
    clearSessionCookie: vi.fn(),
    createSessionToken: createSessionTokenMock,
    getSessionPayload: vi.fn(),
    setSessionCookie: setSessionCookieMock,
}));

vi.mock("@/lib/auth/email", () => ({
    sendPasswordResetEmail: vi.fn(),
    sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
    hashPassword: hashPasswordMock,
    verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth/tokens", () => ({
    addHours: vi.fn(),
    addMinutes: vi.fn(),
    createRandomToken: vi.fn(),
    hashToken: vi.fn(),
}));

vi.mock("@/lib/authorization/service", () => ({
    resolveAuthorizationProfile: vi.fn(),
}));

vi.mock("@/lib/governance/service", () => ({
    hasGovernancePortalAccess: vi.fn(),
}));

vi.mock("@/models/core/organization", () => ({
    default: {},
}));

vi.mock("@/models/faculty/faculty", () => ({
    default: {},
}));

vi.mock("@/models/student/student", () => ({
    default: {},
}));

vi.mock("@/models/core/user", () => ({
    default: userModelMock,
}));

import { bootstrapAdmin } from "@/lib/auth/user";

describe("bootstrapAdmin", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalBootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

    const validInput = {
        name: "System Admin",
        email: "admin@example.edu",
        password: "Password1!",
    };

    beforeEach(() => {
        process.env.NODE_ENV = originalNodeEnv;

        if (originalBootstrapSecret === undefined) {
            delete process.env.ADMIN_BOOTSTRAP_SECRET;
        } else {
            process.env.ADMIN_BOOTSTRAP_SECRET = originalBootstrapSecret;
        }

        vi.clearAllMocks();
        hashPasswordMock.mockResolvedValue("hashed-password");
        createSessionTokenMock.mockResolvedValue("session-token");
        setSessionCookieMock.mockResolvedValue(undefined);
    });

    it("blocks first-admin bootstrap in production when no bootstrap secret is configured", async () => {
        process.env.NODE_ENV = "production";
        delete process.env.ADMIN_BOOTSTRAP_SECRET;

        await expect(bootstrapAdmin(validInput)).rejects.toMatchObject({
            message:
                "Initial admin bootstrap is disabled. Configure ADMIN_BOOTSTRAP_SECRET to enable first-run setup.",
            status: 403,
        });

        expect(dbConnectMock).not.toHaveBeenCalled();
        expect(userModelMock.countDocuments).not.toHaveBeenCalled();
    });

    it("rejects bootstrap requests that do not present the configured secret", async () => {
        process.env.NODE_ENV = "production";
        process.env.ADMIN_BOOTSTRAP_SECRET = "expected-secret";

        await expect(
            bootstrapAdmin(validInput, { bootstrapSecret: "wrong-secret" })
        ).rejects.toMatchObject({
            message: "A valid admin bootstrap secret is required.",
            status: 403,
        });

        expect(dbConnectMock).not.toHaveBeenCalled();
        expect(userModelMock.countDocuments).not.toHaveBeenCalled();
    });

    it("allows bootstrap to proceed when the configured secret is supplied", async () => {
        process.env.NODE_ENV = "production";
        process.env.ADMIN_BOOTSTRAP_SECRET = "expected-secret";

        userModelMock.countDocuments.mockResolvedValue(0);
        userModelMock.findOne.mockResolvedValue(null);
        userModelMock.create.mockResolvedValue({
            _id: {
                toString: () => "admin-1",
            },
            name: validInput.name,
            email: validInput.email,
            role: "Admin",
            accountStatus: "Active",
            emailVerified: true,
            facultyId: undefined,
            lastLoginAt: undefined,
        });

        const result = await bootstrapAdmin(validInput, {
            bootstrapSecret: "expected-secret",
        });

        expect(dbConnectMock).toHaveBeenCalledTimes(1);
        expect(userModelMock.countDocuments).toHaveBeenCalledWith({ role: "Admin" });
        expect(userModelMock.findOne).toHaveBeenCalledWith({ email: validInput.email });
        expect(hashPasswordMock).toHaveBeenCalledWith(validInput.password);
        expect(setSessionCookieMock).toHaveBeenCalledWith("session-token");
        expect(result).toMatchObject({
            message: "Admin account created successfully.",
            user: {
                id: "admin-1",
                email: validInput.email,
                role: "Admin",
            },
        });
    });
});
