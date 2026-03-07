import * as React from "react";

import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border border-[#d8c8b4] bg-[#faf5ee] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f5f36]",
                className
            )}
            {...props}
        />
    );
}

export { Badge };
