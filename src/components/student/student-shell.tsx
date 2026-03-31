"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, LayoutDashboard, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
    {
        href: "/student",
        label: "Dashboard",
        mobileLabel: "Home",
        description: "Workspace summary and quick actions.",
        icon: LayoutDashboard,
    },
    {
        href: "/student/profile",
        label: "Profile",
        mobileLabel: "Profile",
        description: "Institutional identity and academic mapping.",
        icon: UserRound,
    },
    {
        href: "/student/records",
        label: "Records",
        mobileLabel: "Records",
        description: "Activities, achievements, evidence, and outcomes.",
        icon: FileStack,
    },
] as const;

function isActiveRoute(pathname: string, href: string) {
    if (href === "/student") {
        return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentShell({
    children,
    studentName,
    studentEmail,
    accountStatus,
}: {
    children: React.ReactNode;
    studentName: string;
    studentEmail: string;
    accountStatus: string;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-[100dvh] bg-[linear-gradient(180deg,_#f8fafc_0%,_#f3f6fb_48%,_#f8fafc_100%)]">
            <div className="mx-auto min-h-[100dvh] max-w-[1680px] xl:grid xl:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="hidden border-r border-white/70 bg-white/65 backdrop-blur-xl xl:flex xl:min-h-[100dvh] xl:flex-col">
                    <div className="flex h-full flex-col px-6 py-8">
                        <Link href="/student" className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-semibold text-white shadow-sm">
                                OP
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                                    Operant
                                </p>
                                <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                                    Student Workspace
                                </h1>
                            </div>
                        </Link>

                        <div className="mt-8 rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">Institutional Student</Badge>
                                <Badge
                                    className={cn(
                                        "border-transparent",
                                        accountStatus === "Active"
                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                    )}
                                >
                                    {accountStatus}
                                </Badge>
                            </div>
                            <p className="mt-4 text-lg font-semibold text-zinc-950">{studentName}</p>
                            <p className="mt-1 text-sm text-zinc-500">{studentEmail}</p>
                            <p className="mt-4 text-sm leading-6 text-zinc-600">
                                Move between profile details and accreditation records from one responsive workspace.
                            </p>
                        </div>

                        <nav className="mt-8 grid gap-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const active = isActiveRoute(pathname, item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "rounded-[1.5rem] border px-4 py-4 transition",
                                            active
                                                ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                                                : "border-transparent bg-white/75 text-zinc-700 shadow-sm hover:border-zinc-200 hover:bg-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "flex h-10 w-10 items-center justify-center rounded-2xl",
                                                    active ? "bg-white/15" : "bg-zinc-100"
                                                )}
                                            >
                                                <Icon className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold">{item.label}</p>
                                                <p
                                                    className={cn(
                                                        "text-xs leading-5",
                                                        active ? "text-white/75" : "text-zinc-500"
                                                    )}
                                                >
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-auto rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-sm">
                            <p className="text-sm font-semibold text-zinc-950">Stay on top of reviews</p>
                            <p className="mt-2 text-sm leading-6 text-zinc-600">
                                Evidence verification, workflow messages, and updates continue to appear here as your record grows.
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <NotificationCenter />
                                <LogoutButton />
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex min-h-[100dvh] min-w-0 flex-col">
                    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-xl">
                        <div className="px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <Link href="/student" className="flex items-center gap-3 xl:hidden">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-semibold text-white shadow-sm">
                                            OP
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                                                Operant Student
                                            </p>
                                            <p className="truncate text-base font-semibold text-zinc-950">
                                                {studentName}
                                            </p>
                                        </div>
                                    </Link>
                                    <div className="hidden xl:block">
                                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                                            Institutional Student Portal
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-zinc-950">
                                            {studentName}
                                        </p>
                                        <p className="text-sm text-zinc-500">{studentEmail}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">Student</Badge>
                                    <Badge
                                        className={cn(
                                            "border-transparent",
                                            accountStatus === "Active"
                                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                                : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                        )}
                                    >
                                        {accountStatus}
                                    </Badge>
                                    <NotificationCenter />
                                    <div className="xl:hidden">
                                        <LogoutButton />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 hidden sm:flex gap-2 overflow-x-auto pb-1 xl:hidden">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActiveRoute(pathname, item.href);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                                                active
                                                    ? "border-zinc-950 bg-zinc-950 text-white"
                                                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                                            )}
                                        >
                                            <Icon className="size-4" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 xl:px-10">
                        {children}
                    </main>
                </div>
            </div>

            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/80 bg-white/95 px-3 py-3 backdrop-blur-xl sm:hidden">
                <div className="grid grid-cols-3 gap-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const active = isActiveRoute(pathname, item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition",
                                    active ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
                                )}
                            >
                                <Icon className="size-4" />
                                {item.mobileLabel}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
