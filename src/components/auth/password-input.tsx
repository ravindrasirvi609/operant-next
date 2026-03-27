"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = React.ComponentProps<typeof Input> & {
    wrapperClassName?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, wrapperClassName, ...props }, ref) => {
        const [isVisible, setIsVisible] = React.useState(false);

        return (
            <div className={cn("relative", wrapperClassName)}>
                <Input
                    ref={ref}
                    type={isVisible ? "text" : "password"}
                    className={cn("pr-11", className)}
                    {...props}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-950"
                    aria-label={isVisible ? "Hide password" : "Show password"}
                    onClick={() => setIsVisible((value) => !value)}
                >
                    {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
            </div>
        );
    }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
