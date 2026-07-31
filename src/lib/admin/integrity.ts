import { AuthError } from "@/lib/auth/errors";

/**
 * A single referential-integrity check against a would-be-orphaned dependent collection.
 * `exists` should resolve truthy when at least one blocking dependent is present
 * (e.g. `() => AqarApplication.exists({ academicYearId: id })`).
 */
export interface DependentCheck {
    /** Human-readable label for the dependent collection, e.g. "AQAR applications". */
    label: string;
    exists: () => Promise<unknown>;
}

/**
 * Guards a parent record from deletion while dependents still reference it, preventing
 * orphaned foreign keys. MongoDB enforces no referential integrity and this codebase uses
 * no Mongoose hooks, so this service-layer guard is the single point of protection.
 *
 * Runs all checks in parallel and, if any dependents exist, throws one 409 listing every
 * blocking collection so the caller can report a complete reason.
 */
export async function assertNoActiveDependents(
    parentLabel: string,
    checks: DependentCheck[]
): Promise<void> {
    const results = await Promise.all(
        checks.map(async (check) => ({
            label: check.label,
            blocking: Boolean(await check.exists()),
        }))
    );

    const blocking = results.filter((result) => result.blocking).map((result) => result.label);

    if (blocking.length) {
        throw new AuthError(
            `${parentLabel} cannot be deleted because it is still referenced by: ${blocking.join(", ")}.`,
            409
        );
    }
}
