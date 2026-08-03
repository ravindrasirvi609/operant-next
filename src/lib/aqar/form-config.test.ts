import { describe, expect, it } from "vitest";

import type { FieldErrors } from "react-hook-form";
import type { $ZodIssue } from "zod/v4/core";

import { aqarSections, aqarStepFieldPaths, aqarSteps } from "@/lib/aqar/form-config";
import { aqarApplicationSchema } from "@/lib/aqar/validators";
import { hasErrorsForPaths } from "@/lib/forms/has-errors-for-paths";

/**
 * Rebuilds the nested error object react-hook-form produces from a flat list of
 * zod issues, so the step-badge assertions exercise the same `hasErrorsForPaths`
 * walk the UI does rather than comparing path strings by hand.
 */
function toRhfErrors(issues: readonly $ZodIssue[]): FieldErrors {
    const root: Record<string, unknown> = {};

    for (const issue of issues) {
        let node = root;

        issue.path.forEach((segment, index) => {
            const key = String(segment);

            if (index === issue.path.length - 1) {
                node[key] = { type: issue.code, message: issue.message };
                return;
            }

            // Numeric segments are array indices; RHF keeps those as sparse arrays.
            if (typeof node[key] !== "object" || node[key] === null) {
                node[key] = Number.isNaN(Number(issue.path[index + 1])) ? {} : [];
            }

            node = node[key] as Record<string, unknown>;
        });
    }

    return root as FieldErrors;
}

/**
 * Guards the config against the exact failure the old duplicated markup invited.
 *
 * In aqar-dashboard.tsx each of the twelve editors wrote its empty-entry literal
 * twice — once for the empty-state Add button, once for the footer Add button —
 * and neither copy was connected to the zod schema it had to satisfy. A renamed
 * schema key, a new required field, or a typo'd field path would all have
 * produced either a silently dead input or a draft that could never validate,
 * with nothing failing until a faculty member hit Submit.
 *
 * Everything below drives `aqarApplicationSchema` through its public `safeParse`
 * rather than walking zod internals — those are version-specific, and a test that
 * breaks on a zod upgrade is worse than no test.
 */

/** Smallest application the schema accepts; every contribution array defaults to []. */
function baseApplication() {
    return {
        academicYear: "2025-2026",
        reportingPeriod: { fromDate: "2025-06-01", toDate: "2026-05-31" },
        facultyContribution: {},
    };
}

type EntryIssue = { field: string; code: string; message: string };

/** Parses one entry in context and returns any issues inside that array. */
function parseEntry(arrayName: string, entry: Record<string, unknown>) {
    const key = arrayName.split(".")[1];
    const result = aqarApplicationSchema.safeParse({
        ...baseApplication(),
        facultyContribution: { [key]: [entry] },
    });

    if (result.success) {
        const contribution = result.data.facultyContribution as Record<string, unknown[]>;
        return { issues: [] as EntryIssue[], output: contribution[key]?.[0] as Record<string, unknown> };
    }

    return {
        // Issue paths are ["facultyContribution", <key>, <index>, <field>] —
        // drop the first three so an issue is keyed by field name alone.
        issues: result.error.issues
            .filter((issue) => issue.path[0] === "facultyContribution")
            .map((issue) => ({
                field: issue.path.slice(3).join("."),
                code: issue.code,
                message: issue.message,
            })),
        output: undefined,
    };
}

/**
 * A plausibly complete entry, derived from `emptyItem()` by typing into every
 * text-ish field. Numbers, enums, and dates keep the config's own defaults —
 * which is the point: if a default is the wrong type or not a member of its
 * enum, this entry fails to parse and the test names the field.
 */
function filledEntry(config: (typeof aqarSections)[string]): Record<string, unknown> {
    const entry = config.emptyItem();

    for (const field of config.fields) {
        switch (field.kind) {
            case "text":
            case "textarea":
                entry[field.name] = "Sample value";
                break;
            case "date":
                entry[field.name] = "2025-06-01";
                break;
            case "upload":
                entry[field.name] = "https://example.test/proof.pdf";
                break;
            default:
                // number / select / checkbox keep the configured default.
                break;
        }
    }

    return entry;
}

const sectionEntries = Object.entries(aqarSections);

describe("aqarSections", () => {
    it("covers every facultyContribution array in the schema", () => {
        // Parsing an empty contribution object materialises every array the
        // schema declares, via their `.default([])`.
        const parsed = aqarApplicationSchema.safeParse(baseApplication());
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const inSchema = Object.keys(parsed.data.facultyContribution).sort();
        const declared = sectionEntries.map(([, config]) => config.arrayName.split(".")[1]).sort();

        expect(declared).toEqual(inSchema);
    });

    it("uses a unique id and array path per section", () => {
        const ids = sectionEntries.map(([, config]) => config.id);
        const paths = sectionEntries.map(([, config]) => config.arrayName);

        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it.each(sectionEntries)("%s: a filled entry satisfies its schema", (_key, config) => {
        // A *blank* entry is expected to fail — the user has not typed yet. What
        // must hold is that once the text fields are filled, the defaults
        // `emptyItem()` supplies for numbers, enums, and dates are all accepted.
        expect(parseEntry(config.arrayName, filledEntry(config)).issues).toEqual([]);
    });

    it.each(sectionEntries)("%s: emptyItem() defaults are the right type", (_key, config) => {
        // Every issue a blank entry raises must be a "you have not filled this in
        // yet" issue on a field the form renders. An `invalid_type` means a
        // default of the wrong shape (e.g. "" for a number); an `invalid_value`
        // means an enum default that is not a member of its enum. Neither is
        // fixable by typing, so both would strand the draft.
        const { issues } = parseEntry(config.arrayName, config.emptyItem());
        const unfixable = issues.filter(
            (issue) => issue.code === "invalid_type" || issue.code === "invalid_value"
        );

        expect(unfixable).toEqual([]);
    });

    it.each(sectionEntries)("%s: every declared field exists in its schema", (_key, config) => {
        const { output } = parseEntry(config.arrayName, filledEntry(config));
        expect(output, "the filled entry must parse before field names can be checked").toBeDefined();

        // zod strips keys it does not declare, so a field name that survives the
        // round trip is a name the schema knows. A typo'd path would render an
        // input bound to nothing.
        const survived = new Set(Object.keys(output ?? {}));
        const missing = config.fields.map((field) => field.name).filter((name) => !survived.has(name));

        expect(missing).toEqual([]);
    });

    it.each(sectionEntries)("%s: emptyItem() declares no key the form cannot edit", (_key, config) => {
        const editable = new Set(config.fields.map((field) => field.name));
        const orphans = Object.keys(config.emptyItem()).filter((name) => !editable.has(name));

        // An orphan key is written on every Add and is then permanently invisible
        // and unfixable through the UI.
        expect(orphans).toEqual([]);
    });

    it.each(sectionEntries)("%s: every field the schema requires has an input", (_key, config) => {
        // Anything the schema rejects when absent must be reachable in the form,
        // or the draft becomes unsubmittable with no way to fix it.
        const { issues } = parseEntry(config.arrayName, {});
        const requiredNames = new Set(issues.map((issue) => issue.field).filter(Boolean));
        const declared = new Set(config.fields.map((field) => field.name));
        const unreachable = [...requiredNames].filter((name) => !declared.has(name));

        expect(unreachable).toEqual([]);
    });

    it.each(sectionEntries)("%s: summary() is safe on an empty entry", (_key, config) => {
        // Collapsed rows render before the user types anything, and again for
        // server data that predates a newly added field.
        expect(() => config.summary({})).not.toThrow();
        expect(config.summary({}).primary).toBe("");
    });
});

describe("aqarSteps", () => {
    it("assigns every section to exactly one step", () => {
        const assigned = aqarSteps.flatMap((step) => step.sections);

        expect(new Set(assigned).size).toBe(assigned.length);
        expect([...assigned].sort()).toEqual(Object.keys(aqarSections).sort());
    });

    it("uses unique step ids", () => {
        const ids = aqarSteps.map((step) => step.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("gives every step at least one resolvable field path or section", () => {
        const withPaths = aqarSteps.filter((step) => aqarStepFieldPaths(step).length > 0);

        // Only the final review step legitimately owns no fields.
        expect(aqarSteps.length - withPaths.length).toBe(1);
        expect(aqarSteps.at(-1)?.id).toBe("review");
    });

    // A declared path that does not line up with what zod reports silently
    // disables the step's "needs attention" badge. The two shapes report
    // differently — a present-but-blank object errors on its leaves, an absent one
    // errors on the parent — so this drives the real detection function rather
    // than string-matching paths, and covers both.
    it.each([
        ["blank reporting period", { reportingPeriod: { fromDate: "", toDate: "" }, facultyContribution: {} }],
        ["absent reporting period", { facultyContribution: {} }],
        ["empty application", {}],
    ])("flags the overview step for %s", (_label, input) => {
        const overview = aqarSteps.find((step) => step.id === "overview");
        expect(overview).toBeDefined();

        const probe = aqarApplicationSchema.safeParse(input);
        expect(probe.success).toBe(false);
        if (probe.success) return;

        const errors = toRhfErrors(probe.error.issues);
        expect(hasErrorsForPaths(errors, overview!.fields)).toBe(true);
    });
});
