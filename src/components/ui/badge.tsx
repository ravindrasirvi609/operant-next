import * as React from "react";

import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700",
                className
            )}
            {...props}
        />
    );
}

export { Badge };
