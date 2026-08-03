"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useTransition } from "react";
import { ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react";

import { HelpCenter } from "@/components/help/help-center";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
    NAV,
    ROLE_META,
    buildBreadcrumbs,
    getInitials,
    isActiveRoute,
    type RoleKey,
} from "@/lib/ui/navigation";

/**
 * The one authenticated layout, shared by all four roles.
 *
 * Previously admin/director/faculty/student each had their own <aside> with a
 * copy of the nav tree, `getInitials`, `isActiveRoute`, and the sign-out
 * handler — and the faculty and student shells additionally rendered `children`
 * twice (once for mobile, once for desktop), which double-mounted every page.
 * shadcn's Sidebar handles the responsive case with a Sheet, so there is one
 * <main> again.
 *
 * What each role varies is small enough to be props: the nav tree key, the
 * display name, the footer sub-label, and an optional badge row.
 */

export type RoleShellProps = {
    role: RoleKey;
    userName: string;
    children: React.ReactNode;
    /** Overrides ROLE_META[role].roleLabel — e.g. a faculty member's department. */
    userSubtitle?: string;
    /** Optional secondary line in the sidebar header, e.g. designation. */
    headerNote?: string;
    /** Status badges shown in the top bar (the student shell's account status). */
    headerBadges?: React.ReactNode;
    /** Extra items appended to the account dropdown. */
    accountMenuItems?: React.ReactNode;
};

export function RoleShell({
    role,
    userName,
    children,
    userSubtitle,
    headerNote,
    headerBadges,
    accountMenuItems,
}: RoleShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, startLogout] = useTransition();

    const meta = ROLE_META[role];
    const groups = NAV[role];
    const crumbs = buildBreadcrumbs(pathname, role);

    function handleLogout() {
        startLogout(async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push(meta.logoutRedirect);
            router.refresh();
        });
    }

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarHeader className="gap-0 border-b p-0">
                    <Link
                        href={meta.home}
                        prefetch={false}
                        className="flex items-center gap-2.5 px-3 py-3.5 transition-colors hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                            <ShieldCheck className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <span className="block text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                                {meta.eyebrow}
                            </span>
                            <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                                {meta.title}
                            </span>
                            {headerNote ? (
                                <span className="block truncate text-[11px] text-muted-foreground">
                                    {headerNote}
                                </span>
                            ) : null}
                        </span>
                    </Link>
                </SidebarHeader>

                <SidebarContent>
                    {groups.map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase">
                                {group.label}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const active = isActiveRoute(pathname, item.href, meta.home);

                                        return (
                                            <SidebarMenuItem key={item.href}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={active}
                                                    tooltip={item.label}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        prefetch={false}
                                                        aria-current={active ? "page" : undefined}
                                                    >
                                                        <Icon aria-hidden />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>

                <SidebarFooter className="border-t p-1.5">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton size="lg" tooltip={userName}>
                                        <Avatar className="size-8 shrink-0 rounded-lg">
                                            <AvatarFallback className="rounded-lg bg-accent text-xs font-semibold text-accent-foreground">
                                                {getInitials(userName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="grid min-w-0 flex-1 text-left leading-tight">
                                            <span className="truncate text-xs font-semibold">{userName}</span>
                                            <span className="truncate text-[11px] text-muted-foreground">
                                                {userSubtitle ?? meta.roleLabel}
                                            </span>
                                        </span>
                                        <ChevronsUpDown className="ml-auto size-4 opacity-60" aria-hidden />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    side="top"
                                    className="w-(--radix-dropdown-menu-trigger-width) min-w-52"
                                >
                                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                        <span className="block truncate font-medium text-foreground">
                                            {userName}
                                        </span>
                                        {userSubtitle ?? meta.roleLabel}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {accountMenuItems}
                                    <DropdownMenuItem
                                        disabled={isLoggingOut}
                                        onSelect={handleLogout}
                                        className="gap-2"
                                    >
                                        <LogOut className="size-4" aria-hidden />
                                        {isLoggingOut ? "Signing out…" : "Sign out"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <SidebarInset className="min-w-0">
                <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="mr-1 !h-4" />
                    <Breadcrumb className="min-w-0 flex-1">
                        <BreadcrumbList>
                            {crumbs.map((crumb, index) => {
                                const isLast = index === crumbs.length - 1;

                                return (
                                    <React.Fragment key={crumb.href}>
                                        <BreadcrumbItem className={index === 0 ? "hidden sm:block" : undefined}>
                                            {isLast ? (
                                                <BreadcrumbPage className="truncate">
                                                    {crumb.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink asChild>
                                                    <Link href={crumb.href} prefetch={false}>
                                                        {crumb.label}
                                                    </Link>
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                        {isLast ? null : (
                                            <BreadcrumbSeparator
                                                className={index === 0 ? "hidden sm:block" : undefined}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {headerBadges}
                        <HelpCenter role={role} />
                        <NotificationCenter />
                        <ThemeToggle />
                    </div>
                </header>

                <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
