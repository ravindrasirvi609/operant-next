"use client";

import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function FormMessage({
    type,
    message,
}: {
    type: "success" | "error";
    message: string;
}) {
    return (
        <div
            className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
                type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
            )}
        >
            {type === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
            )}
            <p>{message}</p>
        </div>
    );
}

export function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return <p className="text-sm text-rose-700">{message}</p>;
}

export function Spinner({ className }: { className?: string }) {
    return <LoaderCircle className={cn("size-4 animate-spin", className)} />;
}
