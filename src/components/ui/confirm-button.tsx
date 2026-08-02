"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * A button whose action is confirmed first.
 *
 * Used for the handful of actions that delete server-side records — a CAS rule,
 * a NAAC criteria mapping, an AQAR draft, a PBAS row. Those were previously
 * one-click and irreversible.
 *
 * Deliberately NOT applied to the "Remove row" buttons in the contributor
 * workspaces: those drop an unsaved row out of local form state, so they are
 * both cheap and trivially reversible, and a modal there would be friction with
 * no safety benefit.
 */
export type ConfirmButtonProps = React.ComponentProps<typeof Button> & {
    /** Runs only after the user confirms. */
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /**
     * `onClick` still fires on the trigger itself (Radix composes it with its
     * own handler), so it is available for the case where this button sits
     * inside a clickable row and needs `event.stopPropagation()`. It must not be
     * used for the destructive action — that goes in `onConfirm`.
     */
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export function ConfirmButton({
    onConfirm,
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    children,
    ...buttonProps
}: ConfirmButtonProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button {...buttonProps}>{children}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <TriangleAlert className="size-4 text-destructive" aria-hidden />
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
