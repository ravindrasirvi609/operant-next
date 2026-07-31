"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerProps = {
    value?: Date;
    onValueChange: (date: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    fromYear?: number;
    toYear?: number;
};

export function DatePicker({
    value,
    onValueChange,
    placeholder = "Pick a date",
    disabled = false,
    className,
    fromYear = 1950,
    toYear = new Date().getFullYear() + 5,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 size-4" />
                    {value ? format(value, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(date) => {
                        onValueChange(date);
                        setOpen(false);
                    }}
                    captionLayout="dropdown"
                    fromYear={fromYear}
                    toYear={toYear}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
