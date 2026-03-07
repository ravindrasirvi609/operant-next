import crypto from "crypto";

export function createRandomToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function addHours(hours: number) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function addMinutes(minutes: number) {
    return new Date(Date.now() + minutes * 60 * 1000);
}
