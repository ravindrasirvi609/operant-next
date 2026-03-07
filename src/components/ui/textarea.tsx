import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                "flex min-h-28 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-950/10",
                className
            )}
            {...props}
        />
    );
});

Textarea.displayName = "Textarea";

export { Textarea };
