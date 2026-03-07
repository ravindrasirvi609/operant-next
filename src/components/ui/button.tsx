"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8f5f36]",
    {
        variants: {
            variant: {
                default:
                    "bg-[#1f2937] text-white shadow-sm hover:bg-[#111827] ring-offset-[#f4efe6]",
                secondary:
                    "bg-white text-[#1f2937] border border-[#d7c6b2] hover:bg-[#f8f4ee] ring-offset-[#f4efe6]",
                ghost: "text-[#6b4b2a] hover:bg-[#f8f4ee] ring-offset-[#f4efe6]",
                destructive:
                    "bg-[#8f2d22] text-white hover:bg-[#74241c] ring-offset-[#f4efe6]",
            },
            size: {
                default: "h-11 px-5 py-2.5",
                sm: "h-9 px-4",
                lg: "h-12 px-6 text-base",
                icon: "h-11 w-11 rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
