"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Stepper, StepperProgress, type StepDescriptor } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";

/**
 * The multi-step form frame.
 *
 * PBAS, AQAR, and CAS each assembled this by hand and each got a different
 * subset right:
 *
 *   - **PBAS** rendered `<Stepper>` with no Prev/Next at all — the only way
 *     between steps was clicking a step card, which is unusable on a phone where
 *     the stepper is a horizontal scroller.
 *   - **CAS** had Prev/Next but put `<ChevronRight>` *before* the word "Next",
 *     and left the buttons in normal flow at the bottom of an 8-step form, so
 *     they sat below the fold on every step.
 *   - **AQAR** built its own `AQARProgressStepper` plus a `sticky top-4` header
 *     holding the nav — which then fought the RoleShell's own sticky header for
 *     the same screen edge.
 *
 * Here there is one implementation: the card `Stepper` from md up, the compact
 * `StepperProgress` below it, and a single floating action bar pinned to the
 * bottom of the viewport so Prev/Next/Submit are always reachable regardless of
 * step length.
 */

export type WizardProps = {
    steps: StepDescriptor[];
    currentIndex: number;
    visitedSteps: number[] | Set<number>;
    onStepChange: (index: number) => void;
    /** Same contract as `Stepper` — caller derives "errored" however it likes. */
    hasErrors?: (index: number) => boolean;
    /** Replaces Next on the final step, e.g. the Submit button. */
    finalAction?: React.ReactNode;
    /** Extra controls in the action bar, left of Prev (e.g. an explicit Save). */
    secondaryAction?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export function Wizard({
    steps,
    currentIndex,
    visitedSteps,
    onStepChange,
    hasErrors,
    finalAction,
    secondaryAction,
    children,
    className,
}: WizardProps) {
    const isLast = currentIndex >= steps.length - 1;
    const isFirst = currentIndex <= 0;
    const step = steps[currentIndex];

    const go = React.useCallback(
        (next: number) => onStepChange(Math.max(0, Math.min(steps.length - 1, next))),
        [onStepChange, steps.length]
    );

    return (
        <div className={cn("space-y-6", className)}>
            <Stepper
                className="hidden md:flex"
                steps={steps}
                currentIndex={currentIndex}
                visitedSteps={visitedSteps}
                hasErrors={hasErrors}
                onStepChange={onStepChange}
            />
            <StepperProgress className="md:hidden" steps={steps} currentIndex={currentIndex} />

            {step ? (
                <div className="space-y-1 md:hidden">
                    <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                    {step.description ? (
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                    ) : null}
                </div>
            ) : null}

            {/* `pb-20` reserves room for the floating bar so it never covers the
                last field on a short step. */}
            <div className="min-w-0 pb-20">{children}</div>

            <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => go(currentIndex - 1)}
                    disabled={isFirst}
                >
                    <ChevronLeft aria-hidden />
                    Back
                </Button>

                <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">
                    Step {Math.min(currentIndex + 1, steps.length)} of {steps.length}
                </span>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {secondaryAction}
                    {isLast ? (
                        finalAction
                    ) : (
                        <Button type="button" size="sm" onClick={() => go(currentIndex + 1)}>
                            Next
                            <ChevronRight aria-hidden />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Step index state with visit tracking, so a stepper can show "Fix" only on
 * steps the user has actually opened. All three dashboards hand-rolled this
 * pair, and PBAS/AQAR forgot to reset it when the selected record changed —
 * leaving step 4 of the previous application marked visited on a brand-new draft.
 */
export function useWizardSteps(resetKey?: unknown) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [visitedSteps, setVisitedSteps] = React.useState<Set<number>>(() => new Set([0]));

    React.useEffect(() => {
        setCurrentIndex(0);
        setVisitedSteps(new Set([0]));
    }, [resetKey]);

    const goToStep = React.useCallback((index: number) => {
        setCurrentIndex(index);
        setVisitedSteps((current) => {
            if (current.has(index)) return current;
            const next = new Set(current);
            next.add(index);
            return next;
        });
    }, []);

    return { currentIndex, visitedSteps, goToStep };
}
