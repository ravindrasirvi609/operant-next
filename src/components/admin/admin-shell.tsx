"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListTree, Megaphone, Users2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/logout-button";

const navigation = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/master-data", label: "Master Data", icon: ListTree },
    { href: "/admin/users", label: "Users", icon: Users2 },
    { href: "/admin/system", label: "System Updates", icon: Megaphone },
];

export function AdminShell({
    children,
    adminName,
}: {
    children: React.ReactNode;
    adminName: string;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="grid min-h-screen gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
                <aside className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.26em] text-zinc-500">
                                UMIS Admin
                            </p>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                                Control center
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-zinc-500">
                                Master data, users, and system communication managed from one place.
                            </p>
                        </div>

                        <Badge>Signed in as {adminName}</Badge>

                        <nav className="grid gap-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                            isActive
                                                ? "bg-zinc-100 text-zinc-950"
                                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                                        }`}
                                        href={item.href}
                                        key={item.href}
                                    >
                                        <Icon className="size-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm leading-6 text-zinc-500">
                            Admin access can create institutional enums like colleges, schools, departments, reporting categories, offices, and system alerts.
                        </p>
                        <div className="mt-4">
                            <LogoutButton />
                        </div>
                    </div>
                </aside>

                <div className="min-w-0">{children}</div>
            </div>
        </div>
    );
}
