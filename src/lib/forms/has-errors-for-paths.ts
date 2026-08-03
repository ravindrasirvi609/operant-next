import type { FieldErrors, FieldValues } from "react-hook-form";

export function getValueAtPath(source: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, key) => {
        if (current === null || current === undefined) return undefined;
        if (Array.isArray(current)) {
            const index = Number(key);
            return Number.isNaN(index) ? undefined : current[index];
        }

        if (typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }

        return undefined;
    }, source);
}

/**
 * Checks whether any of the given dot-separated field paths have a
 * react-hook-form error attached. Used to derive per-step "needs fixing"
 * state for wizard steppers without threading a form-specific errors shape
 * through the stepper primitive itself.
 */
export function hasErrorsForPaths<T extends FieldValues>(errors: FieldErrors<T>, paths: string[]): boolean {
    return paths.some((path) => hasErrorAtPath(errors, path));
}

/**
 * Single-path variant. Used for one entry of a field array, e.g.
 * `facultyContribution.researchPapers.3`, so a collapsed entry row can show a
 * "Fix" badge and auto-expand instead of hiding the invalid fields.
 *
 * react-hook-form keeps field-array errors in a *sparse* array — index 0 may be
 * `undefined` while index 3 holds an object — so a length check is not enough.
 */
export function hasErrorAtPath<T extends FieldValues>(errors: FieldErrors<T>, path: string): boolean {
    const value = getValueAtPath(errors, path);

    if (!value) return false;
    if (Array.isArray(value)) return value.some(Boolean);
    return true;
}
