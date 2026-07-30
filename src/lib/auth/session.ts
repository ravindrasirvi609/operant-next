import { cookies } from "next/headers";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import { authConfig, getAuthSecret } from "@/lib/auth/config";
import { clearCsrfCookie, setCsrfCookie } from "@/lib/auth/csrf";

export interface SessionPayload extends JWTPayload {
    sub: string;
    email: string;
    name: string;
    role: string;
    /**
     * Session generation the token was minted for. Optional for backward
     * compatibility: tokens issued before this field existed decode as
     * `undefined`, which is treated as generation 0 (see `getCurrentUser`).
     */
    sessionVersion?: number;
}

function getSecretKey() {
    return new TextEncoder().encode(getAuthSecret());
}

export async function createSessionToken(payload: Omit<SessionPayload, keyof JWTPayload>) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${authConfig.sessionDurationSeconds}s`)
        .sign(getSecretKey());
}

export async function verifySessionToken(token: string) {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as SessionPayload;
}

export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();

    cookieStore.set(authConfig.cookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: authConfig.sessionDurationSeconds,
    });

    // Issue a matching CSRF token cookie for the double-submit pattern.
    await setCsrfCookie();
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.set(authConfig.cookieName, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });

    // Clear the paired CSRF cookie on logout.
    await clearCsrfCookie();
}

export async function getSessionPayload() {
    const cookieStore = await cookies();
    const token = cookieStore.get(authConfig.cookieName)?.value;

    if (!token) {
        return null;
    }

    try {
        return await verifySessionToken(token);
    } catch {
        return null;
    }
}
