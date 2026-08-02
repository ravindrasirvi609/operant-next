"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/ui/theme-provider";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/ui/theme";

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
];

/**
 * Sun/moon control for the shell headers. Offers System as well as an explicit
 * choice, because "follow the OS" is the sane default for an app people use all
 * day in different lighting.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { theme, resolvedTheme, setTheme, mounted } = useTheme();

    // Until the client has read localStorage, render the light icon rather than
    // guessing — swapping it post-hydration is a mismatch React will complain about.
    const Icon = mounted && resolvedTheme === "dark" ? Moon : Sun;

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className={cn(className)}>
                            <Icon aria-hidden />
                            <span className="sr-only">Change theme</span>
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Theme</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-36">
                {OPTIONS.map((option) => {
                    const OptionIcon = option.icon;

                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onSelect={() => setTheme(option.value)}
                            className={cn("gap-2", mounted && theme === option.value && "bg-accent text-accent-foreground")}
                        >
                            <OptionIcon className="size-4" aria-hidden />
                            {option.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
