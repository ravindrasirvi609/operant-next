import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";

import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/ui/tone";

type EmptyStateProps = {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    tone?: Tone;
    /** Dashed border + muted fill, for use directly inside a CardContent. */
    bordered?: boolean;
    className?: string;
};

export function EmptyState({
    icon: Icon = InboxIcon,
    title,
    description,
    action,
    tone = "neutral",
    bordered = false,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-3 py-12 text-center",
                bordered && "rounded-lg border border-dashed bg-muted/30 px-6",
                className
            )}
        >
            <IconChip icon={Icon} tone={tone} size="lg" className="rounded-full" />
            <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {description ? (
                    <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {action ? <div className="pt-1">{action}</div> : null}
        </div>
    );
}
