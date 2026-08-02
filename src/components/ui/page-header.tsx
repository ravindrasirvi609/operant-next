import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";
import type { Crumb } from "@/lib/ui/navigation";
import type { Tone } from "@/lib/ui/tone";

type PageHeaderProps = {
    title: string;
    description?: string;
    /** Module icon; rendered in a tinted chip beside the title. */
    icon?: LucideIcon;
    tone?: Tone;
    /** Small uppercase label above the title. */
    eyebrow?: string;
    /** Status badges or similar, inline after the title. */
    meta?: React.ReactNode;
    actions?: React.ReactNode;
    /** Trail from buildBreadcrumbs(); the last entry renders as plain text. */
    breadcrumbs?: Crumb[];
    className?: string;
};

export function PageHeader({
    title,
    description,
    icon,
    tone = "accent",
    eyebrow,
    meta,
    actions,
    breadcrumbs,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {breadcrumbs && breadcrumbs.length > 1 ? (
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, index) => {
                            const isLast = index === breadcrumbs.length - 1;

                            return (
                                <React.Fragment key={crumb.href}>
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild>
                                                <Link href={crumb.href} prefetch={false}>
                                                    {crumb.label}
                                                </Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {isLast ? null : <BreadcrumbSeparator />}
                                </React.Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    {icon ? <IconChip icon={icon} tone={tone} size="lg" className="mt-0.5" /> : null}
                    <div className="min-w-0 space-y-1">
                        {eyebrow ? (
                            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                                {eyebrow}
                            </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight break-words text-foreground">
                                {title}
                            </h1>
                            {meta}
                        </div>
                        {description ? (
                            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
                        ) : null}
                    </div>
                </div>
                {actions ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
                ) : null}
            </div>
        </div>
    );
}

/**
 * Header for a section *within* a page — smaller than PageHeader, used above
 * card groups and table blocks so a page can have visual rhythm without four
 * competing h1-sized titles.
 */
export function SectionHeader({
    title,
    description,
    icon,
    tone = "neutral",
    actions,
    className,
}: Pick<PageHeaderProps, "title" | "description" | "icon" | "tone" | "actions" | "className">) {
    return (
        <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
            <div className="flex min-w-0 items-center gap-2.5">
                {icon ? <IconChip icon={icon} tone={tone} size="sm" /> : null}
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
                    {description ? (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    ) : null}
                </div>
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
    );
}
