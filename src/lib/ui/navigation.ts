import {
    Award,
    BarChart3,
    BookMarked,
    BookOpen,
    Building2,
    Calculator,
    ClipboardCheck,
    ClipboardList,
    Crown,
    Database,
    FileSearch,
    FileStack,
    FileText,
    FlaskConical,
    GitBranch,
    GraduationCap,
    Handshake,
    HeartHandshake,
    LayoutDashboard,
    ListTree,
    Megaphone,
    ScrollText,
    Shield,
    Sparkles,
    UserRound,
    Users,
    Warehouse,
    type LucideIcon,
} from "lucide-react";

/**
 * One definition of the app's navigation, per role.
 *
 * The four role shells each used to carry their own copy of this tree plus
 * their own `getInitials` and `isActiveRoute`. That meant a module could appear
 * with one icon in the admin sidebar and a different icon (or none) on its own
 * page header. Everything that needs to know "what is this route called and
 * what icon represents it" now reads from here: the sidebars, the breadcrumb
 * trail, and PageHeader.
 */

export type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    /** Shown in the student sidebar and as the default PageHeader description. */
    description?: string;
    /** Compact label for narrow contexts. Falls back to `label`. */
    shortLabel?: string;
};

export type NavGroup = {
    label: string;
    items: NavItem[];
};

export type RoleKey = "admin" | "director" | "faculty" | "student" | "alumni";

export const ROLE_META: Record<
    RoleKey,
    {
        /** Root breadcrumb label. */
        shortLabel: string;
        eyebrow: string;
        title: string;
        /** Sub-label under the user's name in the sidebar footer. */
        roleLabel: string;
        home: string;
        /** Where sign-out sends the user. */
        logoutRedirect: string;
    }
> = {
    admin: {
        shortLabel: "Admin",
        eyebrow: "UMIS Admin",
        title: "Control Center",
        roleLabel: "Administrator",
        home: "/admin",
        logoutRedirect: "/login",
    },
    director: {
        shortLabel: "Leadership",
        eyebrow: "UMIS Leadership",
        title: "Leadership Workspace",
        roleLabel: "Director",
        home: "/director",
        logoutRedirect: "/director/login",
    },
    faculty: {
        shortLabel: "Faculty",
        eyebrow: "Operant Faculty",
        title: "Faculty Workspace",
        roleLabel: "Faculty",
        home: "/faculty",
        logoutRedirect: "/login",
    },
    student: {
        shortLabel: "Student",
        eyebrow: "Operant Student",
        title: "Student Workspace",
        roleLabel: "Student",
        home: "/student",
        logoutRedirect: "/login",
    },
    alumni: {
        shortLabel: "Alumni",
        eyebrow: "Operant Alumni",
        title: "Alumni Workspace",
        roleLabel: "Alumni",
        home: "/alumni",
        logoutRedirect: "/login",
    },
};

const adminNav: NavGroup[] = [
    {
        label: "Core",
        items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
    },
    {
        label: "Structure",
        items: [
            { href: "/admin/hierarchy", label: "Hierarchy", icon: GitBranch },
            { href: "/admin/governance", label: "Governance", icon: Shield },
            { href: "/admin/academics", label: "Academics", icon: BookOpen },
            { href: "/admin/curriculum", label: "Curriculum", icon: BookMarked },
            { href: "/admin/teaching-learning", label: "Teaching Learning", icon: GraduationCap },
            { href: "/admin/reference-masters", label: "Reference Masters", icon: ListTree },
        ],
    },
    {
        label: "Research & Quality",
        items: [
            { href: "/admin/research-innovation", label: "Research & Innovation", icon: FlaskConical },
            { href: "/admin/infrastructure-library", label: "Infrastructure & Library", icon: Building2 },
            {
                href: "/admin/institutional-values-best-practices",
                label: "Values & Best Practices",
                icon: Sparkles,
            },
            { href: "/admin/student-support-governance", label: "Student Support", icon: HeartHandshake },
            { href: "/admin/alumni", label: "Alumni Engagement", icon: Handshake },
            { href: "/admin/governance-leadership-iqac", label: "Leadership & IQAC", icon: Crown },
        ],
    },
    {
        label: "Accreditation",
        items: [
            { href: "/admin/cas", label: "CAS", icon: Calculator },
            { href: "/admin/pbas", label: "PBAS", icon: ClipboardList },
            { href: "/admin/pbas/catalog", label: "PBAS Catalog", icon: ListTree },
            { href: "/admin/evidence", label: "Evidence Review", icon: FileSearch },
            { href: "/admin/aqar", label: "AQAR", icon: BarChart3 },
            { href: "/admin/naac-metric-warehouse", label: "NAAC Warehouse", icon: Warehouse },
            { href: "/admin/accreditation", label: "Accreditation Ops", icon: Award },
            { href: "/admin/ssr", label: "SSR", icon: ScrollText },
        ],
    },
    {
        label: "Reporting & System",
        items: [
            { href: "/admin/report-templates", label: "Report Templates", icon: FileText },
            { href: "/admin/master-data", label: "Master Data", icon: Database },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
            { href: "/admin/system", label: "System Updates", icon: Megaphone },
        ],
    },
];

const directorNav: NavGroup[] = [
    {
        label: "Core",
        items: [
            { href: "/director", label: "Overview", icon: LayoutDashboard },
            { href: "/director/approvals", label: "Approvals", icon: ClipboardCheck },
            { href: "/director/faculty", label: "Faculty", icon: Users },
            { href: "/director/students", label: "Students", icon: GraduationCap },
        ],
    },
    {
        label: "Academic Operations",
        items: [
            { href: "/director/curriculum", label: "Curriculum", icon: BookMarked },
            { href: "/director/teaching-learning", label: "Teaching Learning", icon: GraduationCap },
            { href: "/director/evidence", label: "Evidence Review", icon: FileSearch },
        ],
    },
    {
        label: "Research & Quality",
        items: [
            { href: "/director/research-innovation", label: "Research & Innovation", icon: FlaskConical },
            { href: "/director/infrastructure-library", label: "Infrastructure & Library", icon: Building2 },
            {
                href: "/director/institutional-values-best-practices",
                label: "Values & Best Practices",
                icon: Sparkles,
            },
            { href: "/director/student-support-governance", label: "Student Support", icon: HeartHandshake },
            { href: "/director/governance-leadership-iqac", label: "Leadership & IQAC", icon: Crown },
        ],
    },
    {
        label: "Accreditation & Reporting",
        items: [
            { href: "/director/cas", label: "CAS Reviews", icon: ClipboardList },
            { href: "/director/pbas", label: "PBAS Reviews", icon: Shield },
            { href: "/director/aqar", label: "AQAR", icon: BarChart3 },
            { href: "/director/ssr", label: "SSR Reviews", icon: ScrollText },
            { href: "/director/naac-metric-warehouse", label: "NAAC Warehouse", icon: Warehouse },
            { href: "/director/accreditation", label: "Accreditation Ops", icon: Award },
            { href: "/director/reports", label: "Reports", icon: FileText },
        ],
    },
];

const facultyNav: NavGroup[] = [
    {
        label: "Core",
        items: [
            { href: "/faculty", label: "Dashboard", icon: LayoutDashboard },
            { href: "/faculty/profile", label: "Profile", icon: UserRound },
        ],
    },
    {
        label: "Teaching",
        items: [
            { href: "/faculty/teaching-learning", label: "Teaching & Learning", icon: GraduationCap },
            { href: "/faculty/curriculum", label: "Curriculum", icon: BookMarked },
        ],
    },
    {
        label: "Research",
        items: [
            { href: "/faculty/research-innovation", label: "Research & Innovation", icon: FlaskConical },
            { href: "/faculty/infrastructure-library", label: "Infrastructure & Library", icon: Building2 },
            { href: "/faculty/student-support-governance", label: "Student Support", icon: HeartHandshake },
        ],
    },
    {
        label: "Compliance",
        items: [
            { href: "/faculty/pbas", label: "PBAS", icon: ScrollText },
            { href: "/faculty/aqar", label: "AQAR", icon: BarChart3 },
            { href: "/faculty/cas", label: "CAS", icon: Calculator },
            { href: "/faculty/ssr", label: "SSR", icon: FileSearch },
            { href: "/faculty/evidence", label: "Evidence", icon: FileSearch },
        ],
    },
];

const studentNav: NavGroup[] = [
    {
        label: "Workspace",
        items: [
            {
                href: "/student",
                label: "Dashboard",
                shortLabel: "Home",
                description: "Workspace summary and quick actions.",
                icon: LayoutDashboard,
            },
            {
                href: "/student/profile",
                label: "Profile",
                description: "Institutional identity and academic mapping.",
                icon: UserRound,
            },
            {
                href: "/student/records",
                label: "Records",
                description: "Activities, achievements, evidence, and outcomes.",
                icon: FileStack,
            },
        ],
    },
    {
        label: "Accreditation",
        items: [
            {
                href: "/student/ssr",
                label: "SSR",
                description: "Assigned self-study report responses and evidence.",
                icon: ScrollText,
            },
            {
                href: "/student/sss",
                label: "SSS",
                description: "Student Satisfaction Survey response workspace.",
                icon: ClipboardCheck,
            },
        ],
    },
];

const alumniNav: NavGroup[] = [
    {
        label: "Workspace",
        items: [
            {
                href: "/alumni",
                label: "Dashboard",
                shortLabel: "Home",
                description: "Alumni workspace summary.",
                icon: LayoutDashboard,
            },
            {
                href: "/alumni/profile",
                label: "Profile",
                description: "Contact details and current career information.",
                icon: UserRound,
            },
        ],
    },
];

export const NAV: Record<RoleKey, NavGroup[]> = {
    admin: adminNav,
    director: directorNav,
    faculty: facultyNav,
    student: studentNav,
    alumni: alumniNav,
};

/**
 * Routes that are reachable but not in any sidebar — breadcrumbs still need a
 * label and icon for them.
 */
const EXTRA_ROUTE_META: Record<string, { label: string; icon: LucideIcon }> = {
    "/admin/aqar/cycles": { label: "Cycles", icon: BarChart3 },
    "/faculty/profile/edit": { label: "Edit", icon: UserRound },
    "/student/verification-pending": { label: "Verification Pending", icon: ClipboardCheck },
};

/** href -> nav item, flattened across every role. Built once at module load. */
const ROUTE_META: Record<string, { label: string; icon: LucideIcon; description?: string }> = (() => {
    const index: Record<string, { label: string; icon: LucideIcon; description?: string }> = {};

    for (const groups of Object.values(NAV)) {
        for (const group of groups) {
            for (const item of group.items) {
                index[item.href] = {
                    label: item.label,
                    icon: item.icon,
                    description: item.description,
                };
            }
        }
    }

    return { ...index, ...EXTRA_ROUTE_META };
})();

export function routeMeta(href: string) {
    return ROUTE_META[href];
}

/** Icon for a route, for PageHeader. Falls back to the role's home icon. */
export function routeIcon(pathname: string): LucideIcon {
    // Walk up the path until something matches, so /admin/aqar/cycles/123
    // still resolves to the AQAR icon.
    const segments = pathname.split("/").filter(Boolean);

    for (let i = segments.length; i > 0; i -= 1) {
        const candidate = `/${segments.slice(0, i).join("/")}`;
        const meta = ROUTE_META[candidate];
        if (meta) return meta.icon;
    }

    return LayoutDashboard;
}

export function getInitials(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"
    );
}

/**
 * A nav item is active on an exact match or when the current path is nested
 * under it — except for a role's home route, which must match exactly or it
 * would light up on every page.
 */
export function isActiveRoute(pathname: string, href: string, home?: string): boolean {
    if (href === home) {
        return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

const OBJECT_ID = /^[0-9a-f]{24}$/i;

function humanizeSegment(segment: string): string {
    if (OBJECT_ID.test(segment)) return "Details";

    return segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export type Crumb = {
    href: string;
    label: string;
    icon?: LucideIcon;
};

/**
 * Breadcrumb trail for a pathname, e.g.
 * "/admin/pbas/catalog" -> Admin / PBAS / PBAS Catalog.
 *
 * The first crumb uses the role's short label rather than its nav label, since
 * "Admin / ..." reads better than "Overview / ...".
 */
export function buildBreadcrumbs(pathname: string, role: RoleKey): Crumb[] {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: Crumb[] = [];
    let accumulated = "";

    segments.forEach((segment, index) => {
        accumulated += `/${segment}`;
        const meta = ROUTE_META[accumulated];

        crumbs.push({
            href: accumulated,
            label: index === 0 ? ROLE_META[role].shortLabel : (meta?.label ?? humanizeSegment(segment)),
            icon: meta?.icon,
        });
    });

    return crumbs;
}
