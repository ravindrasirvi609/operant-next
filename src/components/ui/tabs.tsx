"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return <TabsPrimitive.Root className={cn("flex flex-col gap-4", className)} {...props} />;
}

function TabsList({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            className={cn(
                "grid grid-cols-2 gap-2 rounded-full bg-[#f6f0e7] p-1",
                className
            )}
            {...props}
        />
    );
}

function TabsTrigger({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            className={cn(
                "inline-flex h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-[#7d6a56] transition-all data-[state=active]:bg-white data-[state=active]:text-[#1f2937] data-[state=active]:shadow-sm",
                className
            )}
            {...props}
        />
    );
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return <TabsPrimitive.Content className={cn("mt-0", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
