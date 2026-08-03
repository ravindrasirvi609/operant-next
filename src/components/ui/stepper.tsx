"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type StepDescriptor = {
    id: string;
    title: string;
    description?: string;
    icon?: LucideIcon;
};

export type StepperProps = {
    steps: StepDescriptor[];
    currentIndex: number;
    visitedSteps: number[] | Set<number>;
    /** Caller decides how "error" is derived (RHF errors, missing uploads, etc.) — kept form-library-agnostic. */
    hasErrors?: (index: number) => boolean;
    /** Omit to render a non-interactive, read-only breadcrumb (e.g. a Submission Summary header). */
    onStepChange?: (index: number) => void;
    className?: string;
};

/**
 * Generic wizard stepper. Modeled on AQARProgressStepper (aqar-dashboard.tsx)
 * but decoupled from any specific form's FieldErrors type — callers supply
 * `hasErrors(index)` however fits their validation shape.
 */
export function Stepper({ steps, currentIndex, visitedSteps, hasErrors, onStepChange, className }: StepperProps) {
    const visited = visitedSteps instanceof Set ? visitedSteps : new Set(visitedSteps);
    const interactive = typeof onStepChange === "function";

    return (
        <div className={cn("flex gap-3 overflow-x-auto pb-1", className)}>
            {steps.map((step, index) => {
                const isVisited = visited.has(index);
                const errored = isVisited && (hasErrors?.(index) ?? false);
                const active = index === currentIndex;
                const completed = isVisited && index < currentIndex && !errored;
                const Icon = step.icon;

                const stateClasses = active
                    ? "border-border bg-primary text-primary-foreground"
                    : completed
                      ? "border-success-border bg-success-muted text-success-muted-foreground"
                      : errored
                        ? "border-destructive-border bg-destructive-muted text-destructive-muted-foreground"
                        : "border-border bg-muted/50 text-foreground";

                const badgeClasses = active
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : completed
                      ? "bg-success-muted text-success-muted-foreground"
                      : errored
                        ? "bg-destructive-muted text-destructive-muted-foreground"
                        : "bg-card text-foreground";

                const circleClasses = active
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : completed
                      ? "bg-success-muted text-success-muted-foreground"
                      : errored
                        ? "bg-destructive-muted text-destructive-muted-foreground"
                        : "bg-card text-foreground";

                const content = (
                    <>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                                        circleClasses
                                    )}
                                >
                                    {index + 1}
                                </span>
                                {Icon ? <Icon className="h-4 w-4" /> : null}
                            </div>
                            <Badge className={badgeClasses}>
                                {active ? "Current" : completed ? "Done" : errored ? "Fix" : "Open"}
                            </Badge>
                        </div>
                        <p className="mt-4 font-semibold">{step.title}</p>
                        {step.description ? (
                            <p className={cn("mt-1 text-sm", active ? "text-primary-foreground/80" : "text-current/75")}>
                                {step.description}
                            </p>
                        ) : null}
                    </>
                );

                const sharedClassName = cn("min-w-[210px] rounded-2xl border p-4 text-left transition-colors", stateClasses);

                if (!interactive) {
                    return (
                        <div key={step.id} aria-current={active ? "step" : undefined} className={sharedClassName}>
                            {content}
                        </div>
                    );
                }

                return (
                    <button
                        type="button"
                        key={step.id}
                        onClick={() => onStepChange?.(index)}
                        aria-current={active ? "step" : undefined}
                        className={cn(sharedClassName, "hover:border-border hover:bg-card")}
                    >
                        {content}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Compact "Step X of N" indicator for tight header spots where the full
 * card-grid Stepper is too wide (e.g. mobile).
 */
export function StepperProgress({
    currentIndex,
    steps,
    className,
}: {
    currentIndex: number;
    steps: StepDescriptor[];
    className?: string;
}) {
    const total = steps.length;
    const value = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

    return (
        <div className={cn("space-y-2", className)}>
            <p className="text-xs font-medium text-muted-foreground">
                Step {Math.min(currentIndex + 1, total)} of {total}
                {steps[currentIndex] ? ` — ${steps[currentIndex].title}` : ""}
            </p>
            <Progress value={value} />
        </div>
    );
}
