"use client";

import * as React from "react";

import {
    THEME_STORAGE_KEY,
    applyTheme,
    isTheme,
    resolveTheme,
    systemTheme,
    type ResolvedTheme,
    type Theme,
} from "@/lib/ui/theme";

type ThemeContextValue = {
    theme: Theme;
    /** What is actually on screen — "system" collapsed to light or dark. */
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    /** Flips between light and dark, leaving "system" behind. */
    toggleTheme: () => void;
    /** False until the client has read localStorage; gate icons on this to avoid a hydration mismatch. */
    mounted: boolean;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Server render and first client render must agree, so start at "system"
    // and correct in the effect below. The inline script in <head> has already
    // put the right class on <html>, so there is no visible flash.
    const [theme, setThemeState] = React.useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>("light");
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        let stored: string | null = null;
        try {
            stored = localStorage.getItem(THEME_STORAGE_KEY);
        } catch {
            // Private browsing — fall through to "system".
        }

        const initial: Theme = isTheme(stored) ? stored : "system";
        setThemeState(initial);
        setResolvedTheme(resolveTheme(initial));
        setMounted(true);
    }, []);

    // Follow the OS only while the user has not made an explicit choice.
    React.useEffect(() => {
        if (theme !== "system") return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            const next = systemTheme();
            setResolvedTheme(next);
            applyTheme(next);
        };

        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [theme]);

    const setTheme = React.useCallback((next: Theme) => {
        const resolved = resolveTheme(next);

        setThemeState(next);
        setResolvedTheme(resolved);
        applyTheme(resolved);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            // Non-fatal: the theme still applies for this session.
        }
    }, []);

    const toggleTheme = React.useCallback(() => {
        setTheme(resolveTheme(theme) === "dark" ? "light" : "dark");
    }, [setTheme, theme]);

    const value = React.useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme, toggleTheme, mounted }),
        [theme, resolvedTheme, setTheme, toggleTheme, mounted]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const context = React.useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider.");
    }

    return context;
}
