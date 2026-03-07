import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "rounded-[28px] border border-[#e5ded3] bg-white/95 shadow-[0_24px_80px_rgba(44,33,20,0.08)]",
                className
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("flex flex-col gap-2 p-8 pb-4", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
    return (
        <h2
            className={cn("text-2xl font-semibold tracking-tight text-[#111827]", className)}
            {...props}
        />
    );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
    return <p className={cn("text-sm leading-6 text-[#6b7280]", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("p-8 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("flex items-center p-8 pt-0", className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
