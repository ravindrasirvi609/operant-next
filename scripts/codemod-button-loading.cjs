#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds `loading={<pendingFlag>}` to buttons that only had `disabled={<pendingFlag>}`.
 *
 *   node scripts/codemod-button-loading.cjs --dry
 *   node scripts/codemod-button-loading.cjs
 *
 * Almost every mutation in this app runs through `useTransition`, and the buttons
 * driving them were only ever disabled while in flight. A disabled button with no
 * other feedback reads as broken rather than busy, so `loading` (which renders a
 * spinner and sets aria-busy) is added alongside.
 *
 * The flag whitelist is explicit rather than a heuristic: `disabled={isPending}`
 * means busy, but `disabled={isCourseTitleLocked}` and `disabled={disabled}` do
 * not, and a name-shape rule like /^is/ would wrongly catch both.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "src");
const DRY = process.argv.includes("--dry");
const VENDORED = path.join(ROOT, "components", "ui");

/** Identifiers that genuinely mean "a mutation is in flight". */
const PENDING_FLAGS = new Set([
    "isPending",
    "isSavingSettings",
    "isSeeding",
    "isLoggingOut",
    "isMutating",
    "isSubmitting",
]);

function findButtons(src) {
    const out = [];
    let i = 0;

    while ((i = src.indexOf("<Button", i)) !== -1) {
        if (/[A-Za-z]/.test(src[i + 7] ?? "")) {
            i += 7;
            continue;
        }

        let j = i + 7;
        let depth = 0;
        let quote = null;

        while (j < src.length) {
            const c = src[j];
            if (quote) {
                if (c === quote && src[j - 1] !== "\\") quote = null;
            } else if (c === '"' || c === "'" || c === "`") quote = c;
            else if (c === "{") depth += 1;
            else if (c === "}") depth -= 1;
            else if (c === ">" && depth === 0) break;
            j += 1;
        }

        if (j >= src.length) break;

        const selfClosing = src[j - 1] === "/";
        out.push({ attrsStart: i + 7, attrsEnd: selfClosing ? j - 1 : j, attrs: src.slice(i + 7, j) });
        i = j;
    }

    return out;
}

let filesChanged = 0;
let added = 0;

for (const file of (function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f, out);
        else if (f.endsWith(".tsx")) out.push(f);
    }
    return out;
})(ROOT)) {
    if (file.startsWith(VENDORED)) continue;

    const raw = fs.readFileSync(file, "utf8");
    const usesCrlf = raw.includes("\r\n");
    const source = usesCrlf ? raw.replace(/\r\n/g, "\n") : raw;

    const edits = [];

    for (const b of findButtons(source)) {
        if (/\bloading=/.test(b.attrs)) continue;
        // asChild renders a Link; Button intentionally skips spinner injection there.
        if (/\basChild\b/.test(b.attrs)) continue;

        // `disabled={flag}` or `disabled={flag || other}` — the flag must lead.
        const m = b.attrs.match(/disabled=\{([a-zA-Z_$][\w$]*)(\s*\|\|[^}]*)?\}/);
        if (!m || !PENDING_FLAGS.has(m[1])) continue;

        // Insert right after `<Button`, matching the surrounding formatting.
        const isMultiline = b.attrs.startsWith("\n");
        const indent = isMultiline ? (b.attrs.match(/^\n(\s*)/)?.[1] ?? "    ") : "";
        edits.push({
            at: b.attrsStart,
            text: isMultiline ? `\n${indent}loading={${m[1]}}` : ` loading={${m[1]}}`,
        });
    }

    if (edits.length === 0) continue;

    let next = source;
    for (const edit of edits.sort((a, b) => b.at - a.at)) {
        next = next.slice(0, edit.at) + edit.text + next.slice(edit.at);
    }

    if (!DRY) fs.writeFileSync(file, usesCrlf ? next.replace(/\n/g, "\r\n") : next, "utf8");

    filesChanged += 1;
    added += edits.length;
    console.log(`${DRY ? "[dry] " : ""}${path.relative(ROOT, file)}  +${edits.length}`);
}

console.log(`\n${DRY ? "[dry run] " : ""}${added} loading prop(s) across ${filesChanged} file(s).`);
