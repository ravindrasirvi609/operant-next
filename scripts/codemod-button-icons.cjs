#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds a leading lucide icon to action buttons whose label is recognised.
 *
 *   node scripts/codemod-button-icons.cjs --report   # label frequency, no writes
 *   node scripts/codemod-button-icons.cjs --dry
 *   node scripts/codemod-button-icons.cjs
 *
 * Why a codemod: there are ~420 <Button>s across the app and almost none had an
 * icon, which is most of why the UI read as flat. Hand-editing them is both slow
 * and error-prone, but a naive regex cannot be used either — Button attributes
 * span multiple lines and contain nested JSX expressions with `>` inside them.
 * So this walks the tag with a small brace/quote-aware scanner instead.
 *
 * Deliberately conservative:
 *  - Only buttons whose children are a single plain text label, or a ternary of
 *    two string literals (`{editing ? "Update plan" : "Create plan"}`), are
 *    touched. Anything already containing an element is skipped.
 *  - The label must match LABEL_ICONS. Unrecognised labels are left alone and
 *    listed by --report so the mapping can be extended deliberately.
 *  - `asChild` buttons are skipped: their single child is a <Link>, and adding a
 *    sibling would break Slot's single-child contract. Those get icons by hand.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "src");
const MODE = process.argv.includes("--report")
    ? "report"
    : process.argv.includes("--dry")
      ? "dry"
      : "write";

/**
 * Label (lowercased, trimmed) -> lucide icon component name.
 * Ordered by specificity: exact matches win, then the prefix rules below.
 */
const LABEL_ICONS = {
    // create / add
    "add row": "Plus",
    "add section": "Plus",
    "new plan": "Plus",
    "new assignment": "Plus",
    "add award": "Plus",
    "add skill": "Plus",
    "add sport": "Plus",
    "add event": "Plus",
    "add cultural activity": "Plus",
    "add social programme": "Plus",

    // save / update
    "save draft": "Save",
    "save review": "Save",
    "save template version": "Save",
    "submit review": "Send",
    "submit for review": "Send",
    "submit response": "Send",
    "switch to new record": "RefreshCw",

    // reset / clear / cancel
    reset: "RotateCcw",
    "reset form": "RotateCcw",
    "clear form": "RotateCcw",
    cancel: "X",
    close: "X",
    "try again": "RefreshCw",

    // row / record ops
    edit: "Pencil",
    "edit plan": "Pencil",
    "edit assignment": "Pencil",
    "edit section": "Pencil",
    delete: "Trash2",
    remove: "Trash2",
    "remove row": "Trash2",
    "remove from pbas": "Trash2",
    inspect: "Eye",
    "mark read": "Check",

    // review decisions
    approve: "Check",
    reject: "X",
    "final approve": "CheckCheck",
    "final reject": "X",
    verify: "ShieldCheck",

    // data ops
    "export dossier": "Download",
    "load default template": "FileDown",
    "merge missing keys": "Merge",
    "refresh preview": "RefreshCw",
    refresh: "RefreshCw",
    previous: "ChevronLeft",
    next: "ChevronRight",
    "previous step": "ChevronLeft",
    "next step": "ChevronRight",
    load: "FolderOpen",
    "load workspace": "FolderOpen",

    // NOTE: "Plans" / "Assignments" are intentionally absent. Those <Button>s are
    // being used as tab triggers, and they are converted to <Tabs> rather than
    // given an icon.
};

/** Prefix rules applied when there is no exact match. */
const PREFIX_ICONS = [
    [/^(create|add|new)\b/, "Plus"],
    [/^(update|save)\b/, "Save"],
    [/^(submit|send)\b/, "Send"],
    [/^(edit|rename)\b/, "Pencil"],
    [/^(delete|remove|discard)\b/, "Trash2"],
    [/^(approve|accept|verify)\b/, "Check"],
    [/^reject\b/, "X"],
    [/^(export|download)\b/, "Download"],
    [/^(import|upload)\b/, "Upload"],
    [/^(refresh|reload|retry)\b/, "RefreshCw"],
    [/^(reset|clear)\b/, "RotateCcw"],
    [/^(cancel|close|dismiss)\b/, "X"],
    [/^(open|view|inspect)\b/, "ArrowRight"],
    [/^(assign)\b/, "UserPlus"],
    [/^(lock|finalize)\b/, "Lock"],
    [/^(generate)\b/, "Sparkles"],
    [/^(search|filter)\b/, "Search"],
    [/^jump to\b/, "ArrowDown"],
];

function iconFor(label) {
    const key = label.toLowerCase().trim().replace(/[.…]+$/, "");
    if (LABEL_ICONS[key]) return LABEL_ICONS[key];
    for (const [re, icon] of PREFIX_ICONS) if (re.test(key)) return icon;
    return null;
}

/** Brace/quote-aware scan for <Button ...> ... </Button>. */
function findButtons(src) {
    const out = [];
    let i = 0;

    while ((i = src.indexOf("<Button", i)) !== -1) {
        // Don't match <ButtonGroup> and friends.
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
            } else if (c === '"' || c === "'" || c === "`") {
                quote = c;
            } else if (c === "{") depth += 1;
            else if (c === "}") depth -= 1;
            else if (c === ">" && depth === 0) break;
            j += 1;
        }

        if (j >= src.length) break;

        if (src[j - 1] === "/") {
            i = j;
            continue; // self-closing: no children to prepend to
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

/**
 * `{editingPlanId ? "Update plan" : "Create plan"}` — the primary action in
 * every manager. The condition is captured lazily but must be followed by
 * `? "`, so optional chaining (`a?.b ? "x" : "y"`) in the condition does not
 * terminate the match early.
 */
const TERNARY = /^\{\s*([\s\S]+?)\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"\s*\}$/;

/**
 * Resolves what to prepend to a button's children.
 * Returns `{ icons, jsx }`, or null when the button must be skipped.
 */
function resolveIcon(children) {
    const kids = children.trim();
    if (!kids) return null;
    if (/<[A-Za-z]/.test(kids)) return null; // already has an element child

    const ternary = kids.match(TERNARY);
    if (ternary) {
        const [, condition, whenTrue, whenFalse] = ternary;
        const a = iconFor(whenTrue);
        const b = iconFor(whenFalse);
        if (!a || !b) return null;

        // Same icon in both states -> plain icon. Different -> mirror the
        // condition, so an "Update"/"Create" button never shows the wrong glyph.
        if (a === b) return { icons: [a], jsx: `<${a} aria-hidden />`, label: whenTrue };
        return {
            icons: [a, b],
            jsx: `{${condition} ? <${a} aria-hidden /> : <${b} aria-hidden />}`,
            label: `${whenTrue} / ${whenFalse}`,
        };
    }

    if (kids.includes("{")) return null; // other dynamic content

    const label = kids.replace(/\s+/g, " ");
    const icon = iconFor(label);
    if (!icon) return { icons: [], jsx: null, label };
    return { icons: [icon], jsx: `<${icon} aria-hidden />`, label };
}

function ensureIconImports(source, icons) {
    const existing = source.match(/^import \{([^}]*)\} from "lucide-react";$/m);

    if (existing) {
        const have = existing[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const merged = [...new Set([...have.filter((h) => !h.startsWith("type ")), ...icons])].sort();
        const types = have.filter((h) => h.startsWith("type "));
        return source.replace(
            existing[0],
            `import { ${[...merged, ...types].join(", ")} } from "lucide-react";`
        );
    }

    // No lucide import yet — add one after the last import line.
    const imports = [...source.matchAll(/^import .*;$/gm)];
    if (imports.length === 0) return source;
    const last = imports[imports.length - 1];
    const at = last.index + last[0].length;
    return `${source.slice(0, at)}\nimport { ${[...icons].sort().join(", ")} } from "lucide-react";${source.slice(at)}`;
}

const report = new Map();
let filesChanged = 0;
let iconsAdded = 0;

/**
 * `src/components/ui` is vendored shadcn output. Keeping it byte-close to
 * upstream means a future `shadcn add`/upgrade produces a readable diff, so app
 * conventions are applied at the call sites instead of inside the primitives.
 */
const VENDORED = path.join(ROOT, "components", "ui");

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

    const buttons = findButtons(source);
    const edits = [];
    const icons = new Set();

    for (const b of buttons) {
        if (/\basChild\b/.test(b.attrs)) continue;

        const resolved = resolveIcon(b.children);
        if (!resolved) continue;

        if (!resolved.jsx) {
            report.set(resolved.label, (report.get(resolved.label) ?? 0) + 1);
            continue;
        }

        // Preserve the original indentation of the children.
        const indentMatch = b.children.match(/^\n(\s*)/);
        const inserted = indentMatch ? `\n${indentMatch[1]}${resolved.jsx}` : resolved.jsx;

        edits.push({ at: b.childStart, text: inserted });
        for (const icon of resolved.icons) icons.add(icon);
    }

    if (edits.length === 0) continue;

    if (MODE === "report") continue;

    // Apply back-to-front so earlier offsets stay valid.
    let next = source;
    for (const edit of edits.sort((a, b) => b.at - a.at)) {
        next = next.slice(0, edit.at) + edit.text + next.slice(edit.at);
    }
    next = ensureIconImports(next, icons);

    if (MODE === "write") {
        fs.writeFileSync(file, usesCrlf ? next.replace(/\n/g, "\r\n") : next, "utf8");
    }

    filesChanged += 1;
    iconsAdded += edits.length;
    console.log(
        `${MODE === "dry" ? "[dry] " : ""}${path.relative(ROOT, file)}  +${edits.length} icon(s)`
    );
}

if (MODE === "report") {
    console.log("--- UNMAPPED plain-text button labels (extend LABEL_ICONS if wanted) ---");
    for (const [label, count] of [...report].sort((a, b) => b[1] - a[1])) {
        console.log(String(count).padStart(3), JSON.stringify(label));
    }
} else {
    console.log(`\n${iconsAdded} icon(s) added across ${filesChanged} file(s).`);
    if (report.size) {
        console.log(`${report.size} label(s) left unmapped — run with --report to list them.`);
    }
}
