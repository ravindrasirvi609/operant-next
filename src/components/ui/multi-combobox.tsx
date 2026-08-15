"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ComboboxOption } from "@/components/ui/combobox";

type MultiComboboxProps = {
    values: string[];
    onValuesChange: (values: string[]) => void;
    options: ComboboxOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
};

export function MultiCombobox({
    values,
    onValuesChange,
    options,
    placeholder = "Add...",
    searchPlaceholder = "Search...",
    emptyText = "No results found.",
    disabled = false,
    className,
}: MultiComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const optionByValue = new Map(options.map((option) => [option.value, option]));
    const selectableOptions = options.filter((option) => !values.includes(option.value));

    function remove(value: string) {
        onValuesChange(values.filter((item) => item !== value));
    }

    return (
        <div className={cn("space-y-2", className)}>
            {values.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {values.map((value) => (
                        <Badge key={value} variant="secondary" className="gap-1 pr-1">
                            {optionByValue.get(value)?.label ?? value}
                            {!disabled && (
                                <button
                                    type="button"
                                    aria-label="Remove"
                                    onClick={() => remove(value)}
                                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </Badge>
                    ))}
                </div>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className="w-full justify-between font-normal text-muted-foreground"
                    >
                        <span className="min-w-0 flex-1 truncate text-left">{placeholder}</span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList>
                            <CommandEmpty>{emptyText}</CommandEmpty>
                            <CommandGroup>
                                {selectableOptions.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() => {
                                            onValuesChange([...values, option.value]);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check className="mr-2 size-4 opacity-0" />
                                        <span className="min-w-0 flex-1 break-words">{option.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
