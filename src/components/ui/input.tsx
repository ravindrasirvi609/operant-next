import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-2xl border border-[#dbcfc0] bg-white/90 px-4 py-2 text-sm text-[#111827] shadow-sm outline-none transition placeholder:text-[#8c7b68] focus:border-[#8f5f36] focus:ring-2 focus:ring-[#e6d8c5]",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
