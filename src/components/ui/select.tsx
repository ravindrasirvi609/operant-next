import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
    ({ className, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={cn(
                    "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-300 focus:ring-2 focus:ring-zinc-950/10",
                    className
                )}
                {...props}
            />
        );
    }
);

Select.displayName = "Select";

export { Select };
