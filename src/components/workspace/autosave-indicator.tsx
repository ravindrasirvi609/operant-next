"use client";

import { Check, CloudOff, Loader2, PencilLine } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AutosaveStatus } from "@/lib/hooks/use-autosave-draft";
import { TONE_CLASSES } from "@/lib/ui/tone";
import { cn } from "@/lib/utils";

/**
 * Draft save state.
 *
 * The three dashboards each rendered this as a bordered block of prose:
 * `Auto save: {selectedId ? autoSaveState : "Create a draft to enable auto save"}`,
 * which printed the literal strings "idle", "saving", and "saved" at the user.
 * "idle" was also what a *failed* save reset to, so the one state a faculty
 * member most needed to notice was the one that looked like "nothing to do".
 *
 * Here each state has its own wording, icon, and tone, and `error` is
 * unmistakable.
 */

const PRESENTS: Record<
    AutosaveStatus,
    { label: string; icon: typeof Check; tone: keyof typeof TONE_CLASSES; hint: string }
> = {
    idle: {
        label: "No changes",
        icon: Check,
        tone: "neutral",
        hint: "Everything is saved. Edits save automatically as you type.",
    },
    dirty: {
        label: "Unsaved changes",
        icon: PencilLine,
        tone: "warning",
        hint: "Your edits will save automatically in a moment.",
    },
    saving: {
        label: "Saving…",
        icon: Loader2,
        tone: "info",
        hint: "Saving your draft.",
    },
    saved: {
        label: "Saved",
        icon: Check,
        tone: "success",
        hint: "Your draft is saved on the server.",
    },
    error: {
        label: "Not saved",
        icon: CloudOff,
        tone: "danger",
        hint: "Your last change could not be saved.",
    },
};

export function AutosaveIndicator({
    status,
    error,
    /** Shown instead of a state when there is no draft to save into yet. */
    inactiveLabel,
    className,
}: {
    status: AutosaveStatus;
    error?: string | null;
    inactiveLabel?: string;
    className?: string;
}) {
    if (inactiveLabel) {
        return (
            <span className={cn("text-xs text-muted-foreground", className)}>{inactiveLabel}</span>
        );
    }

    const preset = PRESENTS[status];
    const Icon = preset.icon;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    aria-live="polite"
                    className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-medium",
                        TONE_CLASSES[preset.tone].text,
                        className
                    )}
                >
                    <Icon aria-hidden className={cn("size-3.5", status === "saving" && "animate-spin")} />
                    {preset.label}
                </span>
            </TooltipTrigger>
            <TooltipContent>{error ?? preset.hint}</TooltipContent>
        </Tooltip>
    );
}
