import type { FieldErrors, FieldValues } from "react-hook-form";

function getValueAtPath(source: unknown, path: string): unknown {
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
    return paths.some((path) => {
        const value = getValueAtPath(errors, path);

        if (!value) return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    });
}
