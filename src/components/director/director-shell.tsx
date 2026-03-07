"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, FileStack } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";

const navigation = [
    { href: "/director", label: "Overview", icon: Building2 },
    { href: "/director/approvals", label: "Approvals", icon: ClipboardList },
    { href: "/director/cas", label: "CAS Reviews", icon: FileStack },
    { href: "/director/pbas", label: "PBAS Reviews", icon: FileStack },
    { href: "/director/aqar", label: "AQAR Reviews", icon: FileStack },
];

export function DirectorShell({
    children,
    directorName,
}: {
    children: React.ReactNode;
    directorName: string;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="grid min-h-screen gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-6">
                <aside className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.26em] text-zinc-500">
                                UMIS Director
                            </p>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                                Leadership portal
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-zinc-500">
                                Review your assigned organizational units and the reporting hierarchy beneath them.
                            </p>
                        </div>

                        <Badge>Signed in as {directorName}</Badge>

                        <nav className="grid gap-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
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

                    <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-start gap-3">
                            <ClipboardList className="mt-0.5 size-4 text-zinc-600" />
                            <p className="text-sm leading-6 text-zinc-500">
                                Director access is limited to the organizational units assigned as your leadership responsibility.
                            </p>
                        </div>
                        <div className="mt-4">
                            <LogoutButton />
                        </div>
                    </div>
                </aside>
                <div>{children}</div>
            </div>
        </div>
    );
}
