/**
 * Theme plumbing, deliberately dependency-free.
 *
 * `next-themes` would also work, but this is ~40 lines and avoids adding a
 * package for one feature. The important part is THEME_INIT_SCRIPT: it must run
 * *before* first paint, otherwise a dark-mode user sees a white flash on every
 * navigation. It is injected synchronously in <head> in src/app/layout.tsx.
 *
 * The storage key and the class name live here so the inline script and the
 * React provider cannot drift apart.
 */

export const THEME_STORAGE_KEY = "umis-theme";

export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

export type ResolvedTheme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
    return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Runs in <head> before paint. Kept as a single expression string with no
 * dependencies on module scope, since it is serialised into the document.
 *
 * Wrapped in try/catch because localStorage throws in Safari private mode and
 * a throw here would block the rest of the document.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s==="dark"||((!s||s==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function systemTheme(): ResolvedTheme {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(theme: Theme): ResolvedTheme {
    return theme === "system" ? systemTheme() : theme;
}

/** Single place that mutates the document, so provider and script agree. */
export function applyTheme(resolved: ResolvedTheme) {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
}
