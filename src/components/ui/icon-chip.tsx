import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { TONE_CLASSES, type Tone } from "@/lib/ui/tone";

/**
 * Tinted square holding a single icon. This is the app's basic unit of color:
 * it lets a card, header, or empty state carry a hue without the surface itself
 * becoming colored.
 *
 * Replaces the `inline-flex size-12 items-center justify-center rounded-md
 * bg-zinc-100 text-zinc-700` block that was pasted into most dashboards.
 */

const iconChipVariants = cva("inline-flex shrink-0 items-center justify-center", {
    variants: {
        size: {
            sm: "size-8 rounded-md [&>svg]:size-4",
            default: "size-10 rounded-lg [&>svg]:size-5",
            lg: "size-12 rounded-xl [&>svg]:size-6",
        },
    },
    defaultVariants: {
        size: "default",
    },
});

export type IconChipProps = React.ComponentProps<"span"> &
    VariantProps<typeof iconChipVariants> & {
        icon: LucideIcon;
        tone?: Tone;
    };

export function IconChip({ className, icon: Icon, tone = "accent", size, ...props }: IconChipProps) {
    return (
        <span
            data-slot="icon-chip"
            className={cn(iconChipVariants({ size }), TONE_CLASSES[tone].chip, className)}
            {...props}
        >
            <Icon aria-hidden />
        </span>
    );
}

export { iconChipVariants };
