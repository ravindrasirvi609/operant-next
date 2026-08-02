#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Replaces per-file copies of shared UI helpers with the real shared components.
 *
 *   node scripts/codemod-shared-primitives.cjs --dry
 *   node scripts/codemod-shared-primitives.cjs
 *
 * Three transforms, each verified against every occurrence before being written:
 *
 * 1. `statusBadge(x)` family -> <StatusBadge status={x} />
 *    18 files had a near-identical `statusBadge()` returning a <Badge> with
 *    hardcoded tone classes and NO icon. All 38 call sites were confirmed to be
 *    the single shape `{statusBadge(EXPR)}` in JSX, so the function is deleted
 *    outright and the call sites rewritten. Every badge gains an icon as a
 *    result, which is what makes the tone readable without relying on color.
 *
 * 2. `MetricCard` / `SummaryCard` / `InfoCard` -> StatCard / StatTile
 *    The local component KEEPS its name and `{label, value}` signature and just
 *    delegates. Call sites (~120 of them) are left untouched: the styling
 *    duplication is what mattered, and rewriting that many JSX sites to chase a
 *    cosmetically nicer call site would be risk for no user-visible gain.
 *    Card-wrapped originals delegate to StatCard, <div>-wrapped ones to StatTile,
 *    so the visual nesting stays correct.
 *
 * 3. The inline `message.type === "success"` banner -> <InlineAlert message={...} />
 *    Same `{ type, text }` state shape, so no state refactor is needed.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "src");
const DRY = process.argv.includes("--dry");

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.name.endsWith(".tsx")) out.push(full);
    }
    return out;
}

/** Deletes a top-level `function NAME(` ... matching closing brace at column 0. */
function removeFunction(source, name) {
    const start = source.indexOf(`\nfunction ${name}(`);
    if (start === -1) return { source, removed: false };

    // Top-level declarations in this codebase close with `}` at column 0.
    const end = source.indexOf("\n}\n", start);
    if (end === -1) return { source, removed: false };

    return { source: source.slice(0, start) + source.slice(end + 3), removed: true };
}

/** Adds an import if the module is not already imported. */
function addImport(source, statement, afterPattern) {
    if (source.includes(statement)) return source;

    const matches = [...source.matchAll(afterPattern)];
    if (matches.length === 0) return source;

    const last = matches[matches.length - 1];
    const at = last.index + last[0].length;
    return `${source.slice(0, at)}\n${statement}${source.slice(at)}`;
}

const UI_IMPORT = /^import .*from "@\/components\/ui\/.*";$/gm;
const ANY_IMPORT = /^import .*;$/gm;

/** True when `name` no longer appears anywhere outside its own import line. */
function isUnused(source, name) {
    const withoutImports = source.replace(/^import[\s\S]*?from ".*";$/gm, "");
    return !new RegExp(`\\b${name}\\b`).test(withoutImports);
}

function dropImportedName(source, name, modulePath) {
    // `import { A, Name } from "mod";` -> `import { A } from "mod";`
    const single = new RegExp(`^import \\{ ${name} \\} from "${modulePath}";\\n`, "m");
    if (single.test(source)) return source.replace(single, "");

    return source.replace(
        new RegExp(`(import \\{[^}]*?)\\b${name}\\b,?\\s*([^}]*\\} from "${modulePath}";)`),
        (m, before, after) => `${before}${after}`.replace(/,\s*\}/, " }").replace(/\{\s*,/, "{ ")
    );
}

const STATUS_FNS = ["statusBadge", "planStatusBadge", "assignmentStatusBadge"];

const stats = {
    statusBadge: { files: 0, callSites: 0 },
    metric: { files: 0, components: 0 },
    banner: { files: 0, blocks: 0 },
};

for (const file of walk(ROOT)) {
    const raw = fs.readFileSync(file, "utf8");
    // These files are a mix of CRLF and LF. Every pattern below is written
    // against LF, so normalise here and restore the file's own ending on write —
    // otherwise `\n}\n` silently never matches in a CRLF file.
    const usesCrlf = raw.includes("\r\n");
    const original = usesCrlf ? raw.replace(/\r\n/g, "\n") : raw;
    let source = original;
    const rel = path.relative(ROOT, file);

    // ---- 1. statusBadge family -------------------------------------------
    let statusCalls = 0;
    for (const fn of STATUS_FNS) {
        if (!new RegExp(`^function ${fn}\\(`, "m").test(source)) continue;

        const { source: stripped, removed } = removeFunction(source, fn);
        if (!removed) continue;
        source = stripped;

        source = source.replace(new RegExp(`\\{${fn}\\(([^{}]+?)\\)\\}`, "g"), (_m, expr) => {
            statusCalls += 1;
            return `<StatusBadge status={${expr.trim()}} />`;
        });
    }

    if (statusCalls > 0) {
        source = addImport(
            source,
            'import { StatusBadge } from "@/components/ui/status-badge";',
            UI_IMPORT.source ? UI_IMPORT : ANY_IMPORT
        );
        if (isUnused(source, "Badge")) {
            source = dropImportedName(source, "Badge", "@/components/ui/badge");
        }
        stats.statusBadge.files += 1;
        stats.statusBadge.callSites += statusCalls;
    }

    // ---- 2. metric components --------------------------------------------
    let metricsChanged = 0;
    for (const name of ["MetricCard", "SummaryCard", "InfoCard"]) {
        const decl = new RegExp(
            `^function ${name}\\(\\{ label, value \\}: \\{ label: string; value: (number|string) \\}\\) \\{\\n([\\s\\S]*?)\\n\\}$`,
            "m"
        );
        const match = source.match(decl);
        if (!match) continue;

        const body = match[2];
        // Already delegating (an earlier run, or hand-converted).
        if (/StatTile|StatCard/.test(body)) continue;

        const target = /<Card\b/.test(body) ? "StatCard" : "StatTile";
        source = source.replace(
            decl,
            `function ${name}({ label, value }: { label: string; value: ${match[1]} }) {\n` +
                `    return <${target} label={label} value={value} />;\n}`
        );
        metricsChanged += 1;

        source = addImport(
            source,
            `import { ${target} } from "@/components/ui/stat-card";`,
            UI_IMPORT
        );
    }

    if (metricsChanged > 0) {
        stats.metric.files += 1;
        stats.metric.components += metricsChanged;
    }

    // ---- 3. inline message banner ----------------------------------------
    // Matches the copy-pasted block regardless of indentation depth.
    const bannerRe =
        /\{message \? \(\s*<div\s+className=\{`rounded-lg border px-4 py-3 text-sm \$\{\s*message\.type === "success"\s*\?\s*"[^"]*"\s*:\s*"[^"]*"\s*\}`\}\s*>\s*\{message\.text\}\s*<\/div>\s*\) : null\}/g;

    const bannerHits = source.match(bannerRe);
    if (bannerHits) {
        source = source.replace(bannerRe, "<InlineAlert message={message} />");
        source = addImport(
            source,
            'import { InlineAlert } from "@/components/ui/inline-alert";',
            UI_IMPORT
        );
        stats.banner.files += 1;
        stats.banner.blocks += bannerHits.length;
    }

    if (source !== original) {
        if (!DRY) fs.writeFileSync(file, usesCrlf ? source.replace(/\n/g, "\r\n") : source, "utf8");
        console.log(
            `${DRY ? "[dry] " : ""}${rel}` +
                (statusCalls ? `  statusBadge:${statusCalls}` : "") +
                (metricsChanged ? `  metric:${metricsChanged}` : "") +
                (bannerHits ? `  banner:${bannerHits.length}` : "")
        );
    }
}

console.log(
    `\n${DRY ? "[dry run] " : ""}statusBadge: ${stats.statusBadge.callSites} call site(s) in ${stats.statusBadge.files} file(s)` +
        `\nmetric components: ${stats.metric.components} in ${stats.metric.files} file(s)` +
        `\nmessage banners: ${stats.banner.blocks} in ${stats.banner.files} file(s)`
);
