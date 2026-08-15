import type { RoleKey } from "@/lib/ui/navigation";
import { facultyHelpContent } from "@/lib/ui/help-content.faculty";
import { studentHelpContent } from "@/lib/ui/help-content.student";

/**
 * Centralized contextual-help content, keyed by role then pathname — mirrors
 * NAV/ROUTE_META in navigation.ts. Adding help for a new page means adding one
 * entry to the relevant help-content.*.ts file; no component changes needed.
 */

export type HelpAction = {
    label: string;
    description: string;
};

export type HelpEntry = {
    title: string;
    /** 1-2 sentence "what is this page for". */
    purpose: string;
    /** Ordered steps, rendered as a numbered list. */
    workflow?: string[];
    /** Buttons/actions on the page, each with what it does. */
    actions?: HelpAction[];
    /** Filter/search controls, same shape as actions. */
    filters?: HelpAction[];
    /** Bullet callouts — gotchas, validation rules, deadlines, etc. */
    tips?: string[];
};

export const HELP_CONTENT: Record<RoleKey, Record<string, HelpEntry>> = {
    student: studentHelpContent,
    faculty: facultyHelpContent,
    admin: {},
    director: {},
    alumni: {},
};

/**
 * Help entry for a pathname, walking up path segments (same idiom as
 * routeIcon/buildBreadcrumbs in navigation.ts) so a nested or dynamic route
 * falls back to its nearest ancestor's help entry. Returns undefined when
 * nothing is registered yet for that role/path.
 */
export function getHelpForPath(role: RoleKey, pathname: string): HelpEntry | undefined {
    const content = HELP_CONTENT[role];
    const segments = pathname.split("/").filter(Boolean);

    for (let i = segments.length; i > 0; i -= 1) {
        const candidate = `/${segments.slice(0, i).join("/")}`;
        const entry = content[candidate];
        if (entry) return entry;
    }

    return undefined;
}
