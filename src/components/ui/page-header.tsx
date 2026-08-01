import * as React from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
            <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight break-words text-zinc-950">{title}</h1>
                {description ? (
                    <p className="text-sm leading-6 text-zinc-500">{description}</p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
            ) : null}
        </div>
    );
}
