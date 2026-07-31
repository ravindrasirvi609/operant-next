import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
};

export function EmptyState({
    icon: Icon = InboxIcon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}>
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100">
                <Icon className="size-6 text-zinc-400" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">{title}</p>
                {description ? (
                    <p className="text-sm text-zinc-500">{description}</p>
                ) : null}
            </div>
            {action ? <div>{action}</div> : null}
        </div>
    );
}
