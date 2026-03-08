"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col gap-4 sm:flex-row",
                month: "space-y-4",
                caption: "relative flex items-center justify-center pt-1",
                caption_label: "text-sm font-semibold text-zinc-950",
                nav: "flex items-center gap-1",
                button_previous: cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "absolute left-1 h-8 w-8 rounded-md p-0 text-zinc-500 hover:text-zinc-950"
                ),
                button_next: cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "absolute right-1 h-8 w-8 rounded-md p-0 text-zinc-500 hover:text-zinc-950"
                ),
                month_caption: "flex items-center justify-center pb-1",
                weekdays: "flex",
                weekday: "w-9 text-[0.8rem] font-medium text-zinc-500",
                week: "mt-2 flex w-full",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 rounded-md p-0 font-normal text-zinc-900 aria-selected:opacity-100"
                ),
                selected:
                    "bg-zinc-900 text-zinc-50 hover:bg-zinc-900 hover:text-zinc-50 focus:bg-zinc-900 focus:text-zinc-50",
                today: "bg-zinc-100 text-zinc-900",
                outside: "text-zinc-400 opacity-50",
                disabled: "text-zinc-400 opacity-50",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
                    orientation === "left" ? (
                        <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...iconProps} />
                    ) : (
                        <ChevronRight className={cn("h-4 w-4", iconClassName)} {...iconProps} />
                    ),
            }}
            {...props}
        />
    );
}

Calendar.displayName = "Calendar";

export { Calendar };
