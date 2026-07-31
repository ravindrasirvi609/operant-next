"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
    BarChart3,
    BookMarked,
    Building2,
    Calculator,
    FileSearch,
    FlaskConical,
    GraduationCap,
    HeartHandshake,
    LayoutDashboard,
    LogOut,
    ScrollText,
    UserRound,
    type LucideIcon,
} from "lucide-react";

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

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
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

function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function FacultyShell({
    children,
    facultyName,
    department,
    designation,
}: {
    children: React.ReactNode;
    facultyName: string;
    department?: string;
    designation?: string;
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
        if (href === "/faculty") return pathname === href;
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
                <aside className="sticky top-0 hidden h-screen flex-col border-r border-zinc-200 bg-white lg:flex">
                    {/* Header */}
                    <div className="flex-none border-b border-zinc-100 px-5 py-5">
                        <p className="text-xs font-medium uppercase tracking-[0.26em] text-zinc-400">
                            Operant Faculty
                        </p>
                        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-950">
                            Faculty Workspace
                        </h1>
                        {designation ? (
                            <p className="mt-1 text-xs text-zinc-500">{designation}</p>
                        ) : null}
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
                                                <Link className={cls} href={item.href} key={item.href} prefetch={false}>
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

                    {/* Footer */}
                    <div className="flex-none border-t border-zinc-100 px-3 py-3">
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-zinc-50">
                                        <Avatar className="size-8 shrink-0">
                                            <AvatarFallback className="bg-zinc-200 text-xs font-semibold text-zinc-700">
                                                {getInitials(facultyName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-semibold text-zinc-900">{facultyName}</p>
                                            <p className="truncate text-[11px] text-zinc-400">{department ?? "Faculty"}</p>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" side="top" className="w-52">
                                    <DropdownMenuLabel className="text-xs text-zinc-500">
                                        {facultyName}
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

                {/* Mobile top bar */}
                <div className="flex flex-col lg:hidden">
                    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-xs font-bold text-white">
                                OP
                            </div>
                            <span className="text-sm font-semibold text-zinc-900">Faculty</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <NotificationCenter />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="rounded-full">
                                        <Avatar className="size-8">
                                            <AvatarFallback className="bg-zinc-200 text-xs font-semibold text-zinc-700">
                                                {getInitials(facultyName)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="text-xs">{facultyName}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled={isLoggingOut} onSelect={handleLogout} className="gap-2">
                                        <LogOut className="size-4" />
                                        {isLoggingOut ? "Signing out…" : "Sign out"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    <div className="flex overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2 gap-1">
                        {navGroups.flatMap((g) => g.items).map((item) => {
                            const isActive = isActiveRoute(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                        isActive
                                            ? "bg-zinc-950 text-white"
                                            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                    <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
                </div>

                <main className="hidden min-w-0 px-4 py-6 lg:block lg:px-6">{children}</main>
            </div>
        </div>
    );
}
