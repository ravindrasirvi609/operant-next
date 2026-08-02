#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Removes hand-rolled spinner children from buttons that now use `loading`.
 *
 *   node scripts/codemod-button-spinner-dedupe.cjs --dry
 *   node scripts/codemod-button-spinner-dedupe.cjs
 *
 * Some buttons already showed pending state manually:
 *
 *   {isPending ? <Spinner /> : null}                     -> now redundant
 *   {isPending ? <Spinner /> : <UploadCloud />}          -> Button hides the
 *                                                          static icon while
 *                                                          loading, so only the
 *                                                          icon needs to remain
 *
 * Strictly flag-scoped: the manual spinner is only touched when the button
 * carries `loading={SAME_FLAG}`. Buttons like
 * `disabled={!bulkFile || isBulkPending}` never received `loading` (the flag is
 * not the leading term), so their manual spinner is deliberately left in place.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "src");
const DRY = process.argv.includes("--dry");
const VENDORED = path.join(ROOT, "components", "ui");

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
        if (src[j - 1] === "/") {
            i = j;
            continue;
        }

        const close = src.indexOf("</Button>", j);
        if (close === -1) {
            i = j;
            continue;
        }

        out.push({
            attrs: src.slice(i + 7, j),
            childStart: j + 1,
            childEnd: close,
            children: src.slice(j + 1, close),
        });
        i = close;
    }

    return out;
}

let filesChanged = 0;
let removed = 0;
let simplified = 0;

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
        const loading = b.attrs.match(/loading=\{([a-zA-Z_$][\w$]*)\}/);
        if (!loading) continue;
        const flag = loading[1];

        // `{flag ? <Spinner .../> : null}` -> drop entirely.
        const dropRe = new RegExp(
            `\\n?\\s*\\{\\s*${flag}\\s*\\?\\s*<Spinner\\b[^>]*/>\\s*:\\s*null\\s*\\}`,
            "g"
        );
        // `{flag ? <Spinner .../> : <Icon .../>}` -> keep just the icon.
        const keepRe = new RegExp(
            `\\{\\s*${flag}\\s*\\?\\s*<Spinner\\b[^>]*/>\\s*:\\s*(<[A-Z][\\w]*\\b[^>]*/>)\\s*\\}`,
            "g"
        );

        let next = b.children;
        const dropHits = next.match(dropRe);
        if (dropHits) {
            next = next.replace(dropRe, "");
            removed += dropHits.length;
        }
        const keepHits = next.match(keepRe);
        if (keepHits) {
            next = next.replace(keepRe, (_m, icon) =>
                // Normalise to the codemod's icon convention.
                icon.replace(/\s*className="[^"]*size-4[^"]*"/, "").replace(/\s*\/>$/, " aria-hidden />")
            );
            simplified += keepHits.length;
        }

        if (next !== b.children) {
            edits.push({ start: b.childStart, end: b.childEnd, text: next });
        }
    }

    if (edits.length === 0) continue;

    let next = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
    }

    if (!DRY) fs.writeFileSync(file, usesCrlf ? next.replace(/\n/g, "\r\n") : next, "utf8");

    filesChanged += 1;
    console.log(`${DRY ? "[dry] " : ""}${path.relative(ROOT, file)}  ${edits.length} button(s)`);
}

console.log(
    `\n${DRY ? "[dry run] " : ""}${removed} redundant spinner(s) removed, ${simplified} spinner-or-icon simplified, across ${filesChanged} file(s).`
);
