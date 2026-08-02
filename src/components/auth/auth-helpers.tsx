"use client";

import { AlertCircle } from "lucide-react";

import { InlineAlert } from "@/components/ui/inline-alert";
import { Spinner as UiSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Form feedback banner.
 *
 * Used by ~23 feature components with the `{ type, text }` state shape. It now
 * delegates to InlineAlert so there is exactly one feedback component in the
 * app: the managers and review boards that rendered the banner inline were
 * migrated to InlineAlert directly, and everything that went through
 * FormMessage arrives at the same place.
 *
 * The prop names differ from InlineAlert's (`message` is the string here, not
 * the state object), so this stays as an adapter rather than being deleted —
 * renaming the prop across every call site would be churn for no gain.
 */
export function FormMessage({
    type,
    message,
}: {
    type: "success" | "error";
    message: string;
}) {
    return <InlineAlert message={{ type, text: message }} />;
}

export function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {message}
        </p>
    );
}

/** Re-exported so the many existing `from "@/components/auth/auth-helpers"` imports keep working. */
export function Spinner({ className }: { className?: string }) {
    return <UiSpinner className={cn(className)} />;
}
