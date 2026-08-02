#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Summarises `npm run lint` as `count<TAB>file<TAB>rule` lines.
 *
 * Used to prove a refactor introduced no NEW lint problems. Comparing raw eslint
 * output is useless after a large diff, because every line number shifts; this
 * collapses to (file, rule) pairs so only genuinely new violations show up.
 *
 *   node scripts/lint-summary.cjs > after.txt
 *   git stash && node scripts/lint-summary.cjs > before.txt && git stash pop
 *   comm -13 <(cut -f2,3 before.txt|sort -u) <(cut -f2,3 after.txt|sort -u)
 */

const { execSync } = require("node:child_process");
const path = require("node:path");

let output = "";
try {
    output = execSync("npx eslint", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (error) {
    // eslint exits non-zero when it finds problems — that is the normal path.
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
}

const root = path.join(__dirname, "..");
const counts = new Map();
let file = null;

for (const line of output.split(/\r?\n/)) {
    if (/^[A-Za-z]:[\\/]/.test(line) || line.startsWith("/")) {
        file = path.relative(root, line.trim()).replace(/\\/g, "/");
        continue;
    }

    const m = line.match(/^\s+\d+:\d+\s+(error|warning)\s+(.*)$/);
    if (!m || !file) continue;

    const rest = m[2].trim();
    // Rule id, when present, is the last whitespace-separated token.
    const ruleMatch = rest.match(/\s([@a-z][\w@/-]*\/[\w-]+)$/);
    const rule = ruleMatch ? ruleMatch[1] : rest.slice(0, 60);

    const key = `${file}\t${rule}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
}

for (const [key, count] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
    process.stdout.write(`${count}\t${key}\n`);
}
