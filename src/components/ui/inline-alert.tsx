import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle, type LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, type Tone } from "@/lib/ui/tone";

/**
 * Inline form/action feedback.
 *
 * 49 components each carried this exact block:
 *
 *   {message ? (
 *     <div className={`rounded-lg border px-4 py-3 text-sm ${
 *       message.type === "success"
 *         ? "border-emerald-200 bg-emerald-50 text-emerald-900"
 *         : "border-rose-200 bg-rose-50 text-rose-900"}`}>
 *       {message.text}
 *     </div>
 *   ) : null}
 *
 * ...with no icon and no dark-mode support. `InlineAlert` takes the same shape
 * of state so those call sites become:
 *
 *   <InlineAlert message={message} />
 *
 * where `message` is the existing `{ type: "success" | "error"; text: string }`
 * state — no state refactor needed at the call site.
 */

const TONE_ICONS: Record<Tone, LucideIcon> = {
    success: CheckCircle2,
    warning: TriangleAlert,
    info: Info,
    danger: XCircle,
    neutral: Info,
    accent: Info,
};

/** The message shape already used across the feature components. */
export type FeedbackMessage = {
    type: "success" | "error" | "warning" | "info";
    text: string;
};

const TYPE_TO_TONE: Record<FeedbackMessage["type"], Tone> = {
    success: "success",
    error: "danger",
    warning: "warning",
    info: "info",
};

export type InlineAlertProps = Omit<React.ComponentProps<typeof Alert>, "variant" | "children"> & {
    /** Existing `{ type, text }` state. Renders nothing when null/undefined. */
    message?: FeedbackMessage | null;
    /** Alternative to `message` when you want to compose the body yourself. */
    tone?: Tone;
    title?: string;
    children?: React.ReactNode;
    icon?: LucideIcon;
    hideIcon?: boolean;
};

export function InlineAlert({
    message,
    tone,
    title,
    children,
    icon,
    hideIcon = false,
    className,
    ...props
}: InlineAlertProps) {
    if (!message && !children && !title) {
        return null;
    }

    const effectiveTone = tone ?? (message ? TYPE_TO_TONE[message.type] : "info");
    const Icon = icon ?? TONE_ICONS[effectiveTone];
    const body = children ?? message?.text;

    return (
        <Alert className={cn(TONE_CLASSES[effectiveTone].alert, className)} {...props}>
            {hideIcon ? null : <Icon aria-hidden />}
            {title ? <AlertTitle>{title}</AlertTitle> : null}
            {body ? <AlertDescription className="text-current">{body}</AlertDescription> : null}
        </Alert>
    );
}
