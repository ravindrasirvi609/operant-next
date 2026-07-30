/**
 * Centralised, validated environment configuration.
 *
 * This module is the single source of truth for every environment variable the
 * UMIS server depends on. It exists to fix two problems that previously lived
 * scattered across the codebase:
 *
 *   1. Ad-hoc `process.env.X` reads with inconsistent (or missing) guards, so a
 *      missing variable surfaced as a confusing error deep inside a request
 *      instead of at boot.
 *   2. No single place documenting *which* variables the system needs.
 *
 * ## How validation runs
 *
 * {@link validateEnv} is invoked once, at server start-up, from
 * `src/instrumentation.ts`. If any required variable is missing or malformed the
 * process fails fast with an aggregated, human-readable report that lists
 * *every* problem at once (not just the first one).
 *
 * ## Why the accessors read `process.env` lazily
 *
 * Merely importing this module has no side effects — the schema is only run when
 * {@link validateEnv} is called, and the typed accessors (e.g. {@link getMongoUri})
 * read `process.env` on demand. That keeps `next build` static analysis and edge
 * bundling safe: importing `dbConnect` during build never triggers validation.
 *
 * @see docs/20_Foundational_Hardening.md
 * @see docs/18_Coding_Standards.md — §8 Configuration, §9 Logging
 */
import { z } from "zod";

/** Recognised deployment environments. Mirrors Next.js' own `NODE_ENV` values. */
const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

/** Log levels accepted by pino (see `src/lib/logger.ts`). */
const logLevelSchema = z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info");

/**
 * The full server-side environment contract.
 *
 * Optionality here encodes *baseline* requirements. Environment-specific rules
 * (e.g. "R2 credentials are mandatory in production") are layered on top in
 * {@link refineServerEnv} so that the error messages stay precise.
 */
const serverEnvSchema = z.object({
    NODE_ENV: nodeEnvSchema,

    // --- Core: always required -------------------------------------------------
    /** MongoDB connection string used by `src/lib/dbConnect.ts`. */
    MONGODB_URI: z
        .string({ message: "MONGODB_URI is required (MongoDB connection string)." })
        .min(1, "MONGODB_URI must not be empty."),
    /** HS256 signing secret for session JWTs (see `src/lib/auth/session.ts`). */
    AUTH_SECRET: z
        .string({ message: "AUTH_SECRET is required (JWT signing secret)." })
        .min(32, "AUTH_SECRET must be at least 32 characters for a secure HS256 key."),

    // --- Admin bootstrap -------------------------------------------------------
    /** Shared secret gating first-admin creation; mandatory in production. */
    ADMIN_BOOTSTRAP_SECRET: z.string().min(1).optional(),

    // --- Application URL -------------------------------------------------------
    APP_URL: z.string().url("APP_URL must be a valid URL.").optional(),
    NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL.").optional(),

    // --- Email (Resend) --------------------------------------------------------
    /** When absent, auth/notification emails fall back to a console preview. */
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),

    // --- Cloudflare R2 object storage -----------------------------------------
    // Treated as an all-or-nothing group (see refineServerEnv) and required in
    // production, because uploads/evidence/photos are core features there.
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1).optional(),
    CLOUDFLARE_R2_PUBLIC_URL: z.string().url("CLOUDFLARE_R2_PUBLIC_URL must be a valid URL.").optional(),
    NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL: z
        .string()
        .url("NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL must be a valid URL.")
        .optional(),

    // --- Observability ---------------------------------------------------------
    LOG_LEVEL: logLevelSchema,
});

/** The keys that together make R2 usable. */
const R2_KEYS = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_PUBLIC_URL",
] as const;

/**
 * Environment-specific cross-field rules applied after the base schema:
 *
 *  - In production, `ADMIN_BOOTSTRAP_SECRET` and the full R2 group are required.
 *  - R2 keys are all-or-nothing in every environment: configuring some but not
 *    all of them is almost always a mistake and produces confusing partial
 *    failures at runtime.
 */
function refineServerEnv(env: z.infer<typeof serverEnvSchema>, ctx: z.RefinementCtx) {
    const isProd = env.NODE_ENV === "production";

    if (isProd && !env.ADMIN_BOOTSTRAP_SECRET) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ADMIN_BOOTSTRAP_SECRET"],
            message: "ADMIN_BOOTSTRAP_SECRET is required in production.",
        });
    }

    const presentR2 = R2_KEYS.filter((key) => Boolean(env[key]));
    const someR2 = presentR2.length > 0;
    const allR2 = presentR2.length === R2_KEYS.length;

    if ((isProd || someR2) && !allR2) {
        const missing = R2_KEYS.filter((key) => !env[key]);
        for (const key of missing) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [key],
                message: isProd
                    ? `${key} is required in production (Cloudflare R2 storage).`
                    : `${key} is required once any CLOUDFLARE_R2_* variable is set.`,
            });
        }
    }
}

const refinedServerEnvSchema = serverEnvSchema.superRefine(refineServerEnv);

/** Fully-typed, validated server environment. */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Set `SKIP_ENV_VALIDATION=1` to bypass the boot-time check.
 *
 * This is intended for CI/build steps that compile the app without a full set of
 * runtime secrets (e.g. `next build` in a pipeline). It must never be set in a
 * running production environment.
 */
function isValidationSkipped(): boolean {
    return process.env.SKIP_ENV_VALIDATION === "1" || process.env.SKIP_ENV_VALIDATION === "true";
}

/**
 * Validate the entire server environment and fail fast on any problem.
 *
 * Called once from `src/instrumentation.ts` at server start-up. On failure it
 * throws a single error whose message enumerates *all* invalid/missing variables,
 * so an operator can fix everything in one pass instead of rerunning repeatedly.
 *
 * @throws {Error} if one or more required variables are missing or malformed.
 */
export function validateEnv(): void {
    if (isValidationSkipped()) {
        return;
    }

    const result = refinedServerEnvSchema.safeParse(process.env);

    if (!result.success) {
        const report = result.error.issues
            .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("\n");

        throw new Error(
            `Invalid environment configuration. Fix the following before starting the server:\n${report}\n\n` +
                `See .env.example for the full list of variables, or set SKIP_ENV_VALIDATION=1 to bypass (build/CI only).`
        );
    }
}

// ---------------------------------------------------------------------------
// Typed accessors
//
// These read `process.env` lazily and throw a precise error only if the specific
// value they need is actually missing at the moment of use. Boot-time
// validation (above) is what guarantees they will not throw in a correctly
// configured deployment; these guards are the last line of defence.
// ---------------------------------------------------------------------------

/** @internal Read a required variable or throw a consistent, actionable error. */
function required(name: keyof ServerEnv): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
    }
    return value;
}

/** MongoDB connection string. */
export function getMongoUri(): string {
    return required("MONGODB_URI");
}

/** Cloudflare R2 credentials used to construct the S3-compatible client. */
export function getR2Credentials(): {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
} {
    return {
        accountId: required("CLOUDFLARE_ACCOUNT_ID"),
        accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    };
}

/** R2 bucket name for object operations. */
export function getR2BucketName(): string {
    return required("CLOUDFLARE_R2_BUCKET_NAME");
}

/** Public base URL used to build browser-facing links to R2 objects. */
export function getR2PublicUrl(): string {
    return required("CLOUDFLARE_R2_PUBLIC_URL");
}

/** Configured log level (defaults to `info`). */
export function getLogLevel(): string {
    return process.env.LOG_LEVEL ?? "info";
}

/** True when running in a production deployment. */
export function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

/** True when running in local development. */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
}
