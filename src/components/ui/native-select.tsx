import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A styled native `<select>`.
 *
 * Not a replacement for the Radix `Select` in ui/select.tsx — use that one for
 * controlled, value/onChange-driven filters. This exists for the uncontrolled
 * native forms in the student records workspace, which read their values out of
 * FormData on submit. Those cannot become Radix selects without also rewriting
 * their submit handling, and a bare `<select>` renders the OS arrow, which
 * ignores the theme and looks foreign next to every other control.
 *
 * Because this *is* a native select, `name`, `required`, `defaultValue`, and
 * form submission behave exactly as before.
 */
export function NativeSelect({
    className,
    children,
    ...props
}: React.ComponentProps<"select">) {
    return (
        <div className="relative w-full">
            <select
                data-slot="native-select"
                className={cn(
                    "h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
                    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
                    "md:text-sm",
                    "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
                    // The option list is painted by the OS, so it needs a real
                    // background colour or dark mode renders white-on-white.
                    "[&>option]:bg-popover [&>option]:text-popover-foreground",
                    className
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDownIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
        </div>
    );
}
