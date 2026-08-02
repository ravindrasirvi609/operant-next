#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Rewrites hardcoded Tailwind palette classes to theme tokens.
 *
 * The app was written against literal `zinc-*` / `white` / `rose-*` classes, so
 * the `.dark` block in globals.css had no effect. This converts the mechanical,
 * unambiguous cases and REPORTS the rest rather than guessing.
 *
 *   node scripts/codemod-theme-tokens.cjs           # rewrite + report
 *   node scripts/codemod-theme-tokens.cjs --dry     # report only
 *
 * Deliberately NOT automated:
 *  - `bg-white` / `text-white`, which mean bg-card, bg-sidebar, bg-background or
 *    (on a colored fill) primary-foreground depending on context.
 *  - `emerald|amber|rose` status literals, which are removed by adopting
 *    StatusBadge / TONE_CLASSES, not remapped one-for-one.
 * Both are listed in the report so they can be fixed by hand.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "src");
const DRY = process.argv.includes("--dry");

/** Utility roots that can carry a color, excluding variant prefixes. */
const ROOTS = "text|bg|border|ring|divide|fill|stroke|outline|caret|decoration|from|via|to|shadow";

/** Matches an optional chain of variant prefixes (hover:, lg:, data-[x]:, ...). */
const PREFIX = "((?:[\\w-]+(?:\\[[^\\]\\s]+\\])?:)*)";

/** zinc shade -> token, per utility root. `null` means "report, don't touch". */
const ZINC = {
    text: {
        950: "foreground",
        900: "foreground",
        800: "foreground",
        700: "foreground",
        600: "muted-foreground",
        500: "muted-foreground",
        400: "muted-foreground",
        300: null,
        200: null,
        100: null,
        50: null,
    },
    bg: {
        950: "primary",
        900: "primary",
        800: "muted",
        700: "muted",
        600: "muted",
        500: "muted",
        400: "muted",
        300: "muted",
        200: "muted",
        100: "muted",
        50: "muted/50",
    },
    border: "border",
    ring: "border",
    divide: "border",
    outline: "border",
    fill: "muted-foreground",
    stroke: "muted-foreground",
    caret: "foreground",
    decoration: "border",
    shadow: null,
    from: null,
    via: null,
    to: null,
};

/**
 * Non-zinc literals with an unambiguous semantic equivalent. Status colors on
 * badges are intentionally absent — see the header note.
 */
const DIRECT = [
    // Error text in forms. Always an error message, never decoration.
    [new RegExp(`\\b${PREFIX}text-rose-(600|700|800|900)\\b`, "g"), "$1text-destructive"],
    [new RegExp(`\\b${PREFIX}text-red-(600|700|800|900)\\b`, "g"), "$1text-destructive"],
    // The one link color used in tables.
    [new RegExp(`\\b${PREFIX}text-sky-(600|700)\\b`, "g"), "$1text-primary"],
    [new RegExp(`\\b${PREFIX}text-slate-(400|500|600)\\b`, "g"), "$1text-muted-foreground"],
    [new RegExp(`\\b${PREFIX}text-slate-(700|800|900|950)\\b`, "g"), "$1text-foreground"],
    [new RegExp(`\\b${PREFIX}border-slate-(100|200|300)\\b`, "g"), "$1border-border"],
    [new RegExp(`\\b${PREFIX}bg-slate-50\\b`, "g"), "$1bg-muted/50"],
    [new RegExp(`\\b${PREFIX}bg-slate-(100|200)\\b`, "g"), "$1bg-muted"],
];

/**
 * Surface literals.
 *
 * These were reported rather than rewritten on the first pass, until the actual
 * usage could be checked. Grouping all 115 `bg-white` occurrences by their full
 * class string showed a single dominant shape — `rounded-* border border-border
 * bg-white p-*`, i.e. a raised panel — so `bg-white` means `bg-card` virtually
 * everywhere, including the `bg-white/85 backdrop-blur` glass panels on the auth
 * and student screens.
 *
 * `text-white` is still excluded: it depends on what is *behind* it (a primary
 * fill wants `text-primary-foreground`, a decorative dark hero wants something
 * else), so those are fixed by hand.
 */
const SURFACES = [
    [/\bbg-white\/(\d{1,3})\b/g, "bg-card/$1"],
    [/\bbg-white\b/g, "bg-card"],
    [/\bborder-white\/(\d{1,3})\b/g, "border-border/$1"],
    [/\bborder-white\b/g, "border-border"],
    [/\bdivide-white\b/g, "divide-border"],
    // Leftovers from the zinc pass where an author reached for the far end of
    // the ramp as a "paper" or "ink" color.
    [/\btext-zinc-50\b/g, "text-primary-foreground"],
    [/\bbg-zinc-50\b/g, "bg-muted/50"],
];

/** Pairs that must be rewritten together to stay legible. */
const PAIRS = [
    [/\bbg-zinc-950 text-white\b/g, "bg-primary text-primary-foreground"],
    [/\bbg-zinc-900 text-white\b/g, "bg-primary text-primary-foreground"],
    [/\btext-white bg-zinc-950\b/g, "text-primary-foreground bg-primary"],
    [/\bborder-zinc-950 bg-zinc-950 text-white\b/g, "border-primary bg-primary text-primary-foreground"],
];

/**
 * Palette family -> semantic tone.
 *
 * Only the *classes* are remapped here, so tinted callouts and badges start
 * working in dark mode. Replacing the surrounding badge/alert markup with the
 * StatusBadge and InlineAlert components is a separate, component-level change.
 */
const TONE_FAMILIES = {
    success: ["emerald", "green"],
    warning: ["amber", "yellow", "orange"],
    destructive: ["rose", "red"],
    info: ["sky", "blue", "cyan", "indigo"],
};

const FAMILY_TO_TONE = Object.fromEntries(
    Object.entries(TONE_FAMILIES).flatMap(([tone, families]) => families.map((family) => [family, tone]))
);

const FAMILY_ALT = Object.keys(FAMILY_TO_TONE).join("|");

/**
 * Rewrites tinted blocks one className string at a time.
 *
 * This has to be scoped to a single string rather than applied file-wide,
 * because the correct target depends on what the text sits ON. The solid tone
 * tokens are NOT readable on their own muted tints — measured against the light
 * tints, `--destructive` on `--destructive-muted` is only 4.17:1 and `--warning`
 * on `--warning-muted` is 1.64:1. Text inside a tinted block must therefore use
 * `-muted-foreground` (6.7-7.4:1), and only a solid *fill* may use the solid token.
 */
function tonedBlocks(line) {
    // Each quoted run is one className (or one branch of a ternary), which is
    // the unit where "text sits on this background" actually holds.
    return line.replace(/(["'`])((?:[^"'`\\\n]|\\.)*)\1/g, (match, quote, body) => {
        if (!new RegExp(`-(?:${FAMILY_ALT})-\\d{2,3}\\b`).test(body) && !/text-destructive\b/.test(body)) {
            return match;
        }

        // Which tone does this string's tinted background establish?
        const bgMatch = body.match(new RegExp(`\\bbg-(${FAMILY_ALT})-\\d{2,3}\\b`));
        const bgTone = bgMatch ? FAMILY_TO_TONE[bgMatch[1]] : null;

        let next = body
            .replace(
                new RegExp(`\\b((?:[\\w-]+(?:\\[[^\\]\\s]+\\])?:)*)bg-(${FAMILY_ALT})-\\d{2,3}\\b`, "g"),
                (_m, prefix, family) => `${prefix}bg-${FAMILY_TO_TONE[family]}-muted`
            )
            .replace(
                new RegExp(`\\b((?:[\\w-]+(?:\\[[^\\]\\s]+\\])?:)*)border-(${FAMILY_ALT})-\\d{2,3}\\b`, "g"),
                (_m, prefix, family) => `${prefix}border-${FAMILY_TO_TONE[family]}-border`
            )
            .replace(
                new RegExp(`\\b((?:[\\w-]+(?:\\[[^\\]\\s]+\\])?:)*)(?:text|fill|stroke)-(${FAMILY_ALT})-\\d{2,3}\\b`, "g"),
                (_m, prefix, family) => `${prefix}text-${FAMILY_TO_TONE[family]}-muted-foreground`
            )
            .replace(
                new RegExp(`\\b((?:[\\w-]+(?:\\[[^\\]\\s]+\\])?:)*)ring-(${FAMILY_ALT})-\\d{2,3}\\b`, "g"),
                (_m, prefix, family) => `${prefix}ring-${FAMILY_TO_TONE[family]}-border`
            );

        // An earlier pass mapped `text-rose-700` to the solid `text-destructive`,
        // which is too low-contrast once it sits on `bg-destructive-muted`.
        if (bgTone) {
            next = next.replace(/\btext-destructive\b(?!-)/g, `text-${bgTone}-muted-foreground`);
        }

        return `${quote}${next}${quote}`;
    });
}

const UNHANDLED = [
    ["text-white (depends on the fill behind it)", /\btext-white\b/],
    ["status literal (adopt StatusBadge / TONE_CLASSES instead)", /\b(?:text|bg|border|ring)-(?:emerald|amber|rose|red|green|sky|blue|indigo|violet|teal|orange)-\d{2,3}\b/],
    ["leftover zinc", /\bzinc-\d{2,3}\b/],
    // Email templates legitimately need literal hex — CSS variables do not
    // survive most mail clients. src/lib/**/email.ts is expected here.
    ["hex/rgba literal", /(?:#[0-9a-fA-F]{6}\b|rgba?\()/],
];

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
    return out;
}

function zincReplacer(source) {
    const pattern = new RegExp(`\\b${PREFIX}(${ROOTS})-zinc-(\\d{2,3})(\\/\\d{1,3})?\\b`, "g");

    return source.replace(pattern, (match, prefix, root, shade, opacity) => {
        const rule = ZINC[root];
        if (rule === undefined || rule === null) return match;

        const token = typeof rule === "string" ? rule : rule[Number(shade)];
        if (!token) return match;

        // An explicit opacity on a token that already carries one would produce
        // `bg-muted/50/80`; the author's opacity wins.
        const base = opacity ? token.split("/")[0] : token;
        return `${prefix}${root}-${base}${opacity ?? ""}`;
    });
}

/**
 * Comment lines are skipped. Several primitives document the pre-migration
 * classes on purpose ("this replaces bg-emerald-100 text-emerald-700"), and
 * rewriting those turns the explanation into nonsense.
 */
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;

/**
 * Opt-out marker for files containing an INVERTED surface — a panel that is
 * dark in both themes (the login hero). There, literal `text-white` /
 * `bg-white/10` are correct and `bg-card` would flip the panel light in dark
 * mode. A file with this marker skips the SURFACES stage.
 */
const IGNORE_SURFACES = "theme-codemod:ignore-surfaces";

function transformLine(line, { skipSurfaces }) {
    if (COMMENT_LINE.test(line)) return line;

    let next = line;
    for (const [pattern, replacement] of PAIRS) next = next.replace(pattern, replacement);
    next = zincReplacer(next);
    for (const [pattern, replacement] of DIRECT) next = next.replace(pattern, replacement);
    if (!skipSurfaces) {
        for (const [pattern, replacement] of SURFACES) next = next.replace(pattern, replacement);
    }
    next = tonedBlocks(next);
    return next;
}

const files = walk(ROOT);
let changedFiles = 0;
let totalReplacements = 0;
const report = new Map();

for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const skipSurfaces = original.includes(IGNORE_SURFACES);
    const next = original
        .split("\n")
        .map((line) => transformLine(line, { skipSurfaces }))
        .join("\n");

    if (next !== original) {
        changedFiles += 1;
        // Rough count: how many class tokens differ.
        const before = original.match(/zinc-\d{2,3}|rose-\d{2,3}|slate-\d{2,3}|sky-\d{2,3}|red-\d{2,3}/g) ?? [];
        const after = next.match(/zinc-\d{2,3}|rose-\d{2,3}|slate-\d{2,3}|sky-\d{2,3}|red-\d{2,3}/g) ?? [];
        totalReplacements += Math.max(0, before.length - after.length);

        if (!DRY) fs.writeFileSync(file, next, "utf8");
    }

    // Report what still needs a human, based on the post-rewrite content.
    const lines = next.split("\n");
    for (const [label, pattern] of UNHANDLED) {
        lines.forEach((line, index) => {
            if (pattern.test(line)) {
                if (!report.has(label)) report.set(label, []);
                report.get(label).push(`${path.relative(ROOT, file)}:${index + 1}`);
            }
        });
    }
}

console.log(
    `${DRY ? "[dry run] " : ""}${changedFiles} file(s) ${DRY ? "would change" : "changed"}, ~${totalReplacements} class token(s) rewritten.\n`
);
console.log("Needs a human decision (not auto-rewritten):");
for (const [label, hits] of report) {
    console.log(`\n  ${label} — ${hits.length} occurrence(s) in ${new Set(hits.map((h) => h.split(":")[0])).size} file(s)`);
    const byFile = new Map();
    for (const hit of hits) {
        const [file] = hit.split(":");
        byFile.set(file, (byFile.get(file) ?? 0) + 1);
    }
    for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
        console.log(`      ${String(count).padStart(4)}  ${file}`);
    }
    if (byFile.size > 12) console.log(`      ...and ${byFile.size - 12} more file(s)`);
}
