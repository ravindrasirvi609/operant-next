import { describe, expect, it } from "vitest";

import { casSections, casSteps, CAS_DOCUMENTS_STEP, CAS_REVIEW_STEP } from "@/lib/cas/form-config";
import { casApplicationSchema } from "@/lib/cas/validators";

/**
 * Same contract as the AQAR config test, for the three CAS achievement editors.
 *
 * This matters more here than it looks. The originals rendered these arrays as
 * bare `<Input placeholder="Journal" />` with no `<Label>` and no `FormMessage`
 * (cas-step-publications.tsx:26-30), so a schema mismatch produced *no visible
 * error at all* — the step's "Fix" badge lit up with nothing to indicate which
 * field or why. A config error was effectively undebuggable from the UI.
 */

function baseApplication() {
    return {
        applicationYear: "2025-2026",
        currentDesignation: "Assistant Professor (Stage 1)",
        applyingForDesignation: "Assistant Professor (Stage 2)",
        eligibilityPeriod: { fromYear: 2021, toYear: 2025 },
        experienceYears: 4,
        pbasReports: [],
        manualAchievements: {},
    };
}

type EntryIssue = { field: string; code: string; message: string };

function parseEntry(arrayName: string, entry: Record<string, unknown>) {
    const key = arrayName.split(".")[1];
    const result = casApplicationSchema.safeParse({
        ...baseApplication(),
        manualAchievements: { [key]: [entry] },
    });

    if (result.success) {
        const bucket = result.data.manualAchievements as unknown as Record<string, unknown[]>;
        return { issues: [] as EntryIssue[], output: bucket[key]?.[0] as Record<string, unknown> };
    }

    return {
        issues: result.error.issues
            .filter((issue) => issue.path[0] === "manualAchievements")
            .map((issue) => ({
                field: issue.path.slice(3).join("."),
                code: issue.code,
                message: issue.message,
            })),
        output: undefined,
    };
}

function filledEntry(config: (typeof casSections)[string]): Record<string, unknown> {
    const entry = config.emptyItem();

    for (const field of config.fields) {
        if (field.kind === "text" || field.kind === "textarea") {
            entry[field.name] = "Sample value";
        }
    }

    return entry;
}

const sectionEntries = Object.entries(casSections);

describe("casSections", () => {
    it("covers every array in the manual achievement bucket", () => {
        const parsed = casApplicationSchema.safeParse(baseApplication());
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const bucket = parsed.data.manualAchievements as unknown as Record<string, unknown>;
        const arraysInSchema = Object.entries(bucket)
            .filter(([, value]) => Array.isArray(value))
            .map(([name]) => name)
            .sort();

        const declared = sectionEntries.map(([, config]) => config.arrayName.split(".")[1]).sort();

        // phdGuided and conferences are scalars handled by the contributions
        // step, so only the array-valued keys should have a section.
        expect(declared).toEqual(arraysInSchema);
    });

    it("uses a unique id and array path per section", () => {
        const ids = sectionEntries.map(([, config]) => config.id);
        const paths = sectionEntries.map(([, config]) => config.arrayName);

        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it.each(sectionEntries)("%s: a filled entry satisfies its schema", (_key, config) => {
        expect(parseEntry(config.arrayName, filledEntry(config)).issues).toEqual([]);
    });

    it.each(sectionEntries)("%s: emptyItem() defaults are the right type", (_key, config) => {
        const { issues } = parseEntry(config.arrayName, config.emptyItem());
        const unfixable = issues.filter(
            (issue) => issue.code === "invalid_type" || issue.code === "invalid_value"
        );

        expect(unfixable).toEqual([]);
    });

    it.each(sectionEntries)("%s: every declared field exists in its schema", (_key, config) => {
        const { output } = parseEntry(config.arrayName, filledEntry(config));
        expect(output).toBeDefined();

        const survived = new Set(Object.keys(output ?? {}));
        const missing = config.fields.map((field) => field.name).filter((name) => !survived.has(name));

        expect(missing).toEqual([]);
    });

    it.each(sectionEntries)("%s: emptyItem() declares no key the form cannot edit", (_key, config) => {
        const editable = new Set(config.fields.map((field) => field.name));
        const orphans = Object.keys(config.emptyItem()).filter((name) => !editable.has(name));

        expect(orphans).toEqual([]);
    });

    it.each(sectionEntries)("%s: every field the schema requires has an input", (_key, config) => {
        const { issues } = parseEntry(config.arrayName, {});
        const required = new Set(issues.map((issue) => issue.field).filter(Boolean));
        const declared = new Set(config.fields.map((field) => field.name));

        expect([...required].filter((name) => !declared.has(name))).toEqual([]);
    });

    it.each(sectionEntries)("%s: summary() is safe on an empty entry", (_key, config) => {
        expect(() => config.summary({})).not.toThrow();
        expect(config.summary({}).primary).toBe("");
    });
});

describe("casSteps", () => {
    it("uses unique, non-numeric step ids", () => {
        const ids = casSteps.map((step) => step.id);

        expect(new Set(ids).size).toBe(ids.length);
        // The originals were `id: String(index)`, which is why `hasStepErrors`
        // had to switch on the magic indices 6 and 7.
        expect(ids.every((id) => Number.isNaN(Number(id)))).toBe(true);
    });

    it("exposes the two steps referenced by name", () => {
        expect(casSteps.some((step) => step.id === CAS_DOCUMENTS_STEP)).toBe(true);
        expect(casSteps.some((step) => step.id === CAS_REVIEW_STEP)).toBe(true);
        expect(casSteps.at(-1)?.id).toBe(CAS_REVIEW_STEP);
    });

    it("gives every step a title, description, and icon", () => {
        for (const step of casSteps) {
            expect(step.title.length).toBeGreaterThan(0);
            expect(step.description?.length ?? 0).toBeGreaterThan(0);
            expect(step.icon).toBeDefined();
        }
    });

    it("declares each section's array path on exactly one step", () => {
        for (const [, config] of sectionEntries) {
            const owners = casSteps.filter((step) => step.fields.includes(config.arrayName));
            expect(owners).toHaveLength(1);
        }
    });

    it("references only paths the schema reports issues for", () => {
        // Guards against a renamed schema key silently disabling a step badge.
        const probe = casApplicationSchema.safeParse({});
        expect(probe.success).toBe(false);
        if (probe.success) return;

        const declared = new Set(casSteps.flatMap((step) => step.fields));
        const reported = probe.error.issues.map((issue) => issue.path.join("."));

        expect(reported.filter((path) => !declared.has(path))).toEqual([]);
    });
});
