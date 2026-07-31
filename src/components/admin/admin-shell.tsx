"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Award,
    BarChart3,
    BookMarked,
    BookOpen,
    Building2,
    Calculator,
    ClipboardList,
    Crown,
    Database,
    FileSearch,
    FileText,
    FlaskConical,
    GitBranch,
    GraduationCap,
    HeartHandshake,
    LayoutDashboard,
    ListTree,
    LogOut,
    Megaphone,
    ScrollText,
    Shield,
    Sparkles,
    Users,
    Users2,
    Warehouse,
    type LucideIcon,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationCenter } from "@/components/notifications/notification-center";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

const navGroups: NavGroup[] = [
    {
        label: "Core",
        items: [
            { href: "/admin", label: "Overview", icon: LayoutDashboard },
        ],
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
            { href: "/admin/institutional-values-best-practices", label: "Values & Best Practices", icon: Sparkles },
            { href: "/admin/student-support-governance", label: "Student Support", icon: HeartHandshake },
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
            { href: "/admin/system", label: "System Updates", icon: Megaphone },
        ],
    },
];

function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function AdminShell({
    children,
    adminName,
}: {
    children: React.ReactNode;
    adminName: string;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, startLogout] = useTransition();

    function handleLogout() {
        startLogout(async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
        });
    }

    function isActiveRoute(href: string) {
        if (href === "/admin") {
            return pathname === href;
        }
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
                <aside className="sticky top-0 flex h-screen flex-col border-r border-zinc-200 bg-white">
                    {/* Header */}
                    <div className="flex-none border-b border-zinc-100 px-5 py-5">
                        <p className="text-xs font-medium uppercase tracking-[0.26em] text-zinc-400">
                            UMIS Admin
                        </p>
                        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-950">
                            Control Center
                        </h1>
                    </div>

                    {/* Nav */}
                    <ScrollArea className="flex-1 px-3 py-3">
                        <nav className="space-y-4">
                            {navGroups.map((group) => (
                                <div key={group.label}>
                                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                                        {group.label}
                                    </p>
                                    <div className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = isActiveRoute(item.href);
                                            const cls = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                isActive
                                                    ? "bg-zinc-100 text-zinc-950"
                                                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                                            }`;

                                            if (isActive) {
                                                return (
                                                    <span aria-current="page" className={cls} key={item.href}>
                                                        <Icon className="size-4 shrink-0" />
                                                        {item.label}
                                                    </span>
                                                );
                                            }

                                            return (
                                                <Link
                                                    className={cls}
                                                    href={item.href}
                                                    key={item.href}
                                                    prefetch={false}
                                                >
                                                    <Icon className="size-4 shrink-0" />
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </ScrollArea>

                    {/* Footer: user + notifications */}
                    <div className="flex-none border-t border-zinc-100 px-3 py-3">
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-zinc-50">
                                        <Avatar className="size-8 shrink-0">
                                            <AvatarFallback className="bg-zinc-200 text-xs font-semibold text-zinc-700">
                                                {getInitials(adminName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-semibold text-zinc-900">{adminName}</p>
                                            <p className="text-[11px] text-zinc-400">Administrator</p>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" side="top" className="w-52">
                                    <DropdownMenuLabel className="text-xs text-zinc-500">
                                        {adminName}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        disabled={isLoggingOut}
                                        onSelect={handleLogout}
                                        className="gap-2 text-zinc-700"
                                    >
                                        <LogOut className="size-4" />
                                        {isLoggingOut ? "Signing out…" : "Sign out"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <NotificationCenter />
                        </div>
                    </div>
                </aside>

                <main className="min-w-0 px-4 py-6 lg:px-6">{children}</main>
            </div>
        </div>
    );
}
