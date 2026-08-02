/**
 * Tone -> class mapping. This is the ONLY place in the app that decides which
 * classes a semantic color produces.
 *
 * Before this existed, ~24 components each carried their own copy of
 * `bg-emerald-100 text-emerald-700` style literals, which is why status colors
 * had drifted apart (amber-700 in one file, amber-800 in the next) and why none
 * of them worked in dark mode. Add a case here rather than a literal at a call
 * site.
 *
 * The underlying tokens live in src/app/globals.css — see the comment block at
 * the top of that file for the five-token contract per tone.
 */

export const TONES = ["success", "warning", "info", "danger", "neutral", "accent"] as const;

export type Tone = (typeof TONES)[number];

type ToneClasses = {
    /** Tinted pill: badges, chips. */
    badge: string;
    /** Tinted square holding an icon (StatCard, PageHeader, EmptyState). */
    chip: string;
    /** Small solid dot for legends and unread markers. */
    dot: string;
    /** Solid fill for progress bars and chart marks. */
    bar: string;
    /** Bordered block: alerts, callouts. */
    alert: string;
    /** Left accent stripe for list rows. */
    stripe: string;
    /** Foreground-only, for icons sitting directly on a card surface. */
    text: string;
    /** Focus/selection ring. */
    ring: string;
};

export const TONE_CLASSES: Record<Tone, ToneClasses> = {
    success: {
        badge: "bg-success-muted text-success-muted-foreground border-success-border",
        chip: "bg-success-muted text-success-muted-foreground",
        dot: "bg-success",
        bar: "bg-success",
        alert: "bg-success-muted text-success-muted-foreground border-success-border",
        stripe: "border-l-success",
        text: "text-success-muted-foreground",
        ring: "ring-success-border",
    },
    warning: {
        badge: "bg-warning-muted text-warning-muted-foreground border-warning-border",
        chip: "bg-warning-muted text-warning-muted-foreground",
        dot: "bg-warning",
        bar: "bg-warning",
        alert: "bg-warning-muted text-warning-muted-foreground border-warning-border",
        stripe: "border-l-warning",
        text: "text-warning-muted-foreground",
        ring: "ring-warning-border",
    },
    info: {
        badge: "bg-info-muted text-info-muted-foreground border-info-border",
        chip: "bg-info-muted text-info-muted-foreground",
        dot: "bg-info",
        bar: "bg-info",
        alert: "bg-info-muted text-info-muted-foreground border-info-border",
        stripe: "border-l-info",
        text: "text-info-muted-foreground",
        ring: "ring-info-border",
    },
    danger: {
        badge: "bg-destructive-muted text-destructive-muted-foreground border-destructive-border",
        chip: "bg-destructive-muted text-destructive-muted-foreground",
        dot: "bg-destructive",
        bar: "bg-destructive",
        alert: "bg-destructive-muted text-destructive-muted-foreground border-destructive-border",
        stripe: "border-l-destructive",
        text: "text-destructive-muted-foreground",
        ring: "ring-destructive-border",
    },
    neutral: {
        badge: "bg-neutral-muted text-neutral-muted-foreground border-neutral-border",
        chip: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
        bar: "bg-muted-foreground",
        alert: "bg-muted text-foreground border-border",
        stripe: "border-l-border",
        text: "text-muted-foreground",
        ring: "ring-border",
    },
    accent: {
        badge: "bg-accent text-accent-foreground border-transparent",
        chip: "bg-accent text-accent-foreground",
        dot: "bg-primary",
        bar: "bg-primary",
        alert: "bg-accent text-accent-foreground border-primary/20",
        stripe: "border-l-primary",
        text: "text-primary",
        ring: "ring-primary/30",
    },
};

export function toneClasses(tone: Tone): ToneClasses {
    return TONE_CLASSES[tone];
}

/**
 * Chart series colors, in the fixed categorical order defined in globals.css.
 * Index into this — never cycle past the end. A 6th series folds into "Other"
 * or becomes a separate faceted chart; generating a hue would break the
 * color-vision-deficiency separation the order guarantees.
 */
export const CHART_SERIES = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
] as const;

export const MAX_CHART_SERIES = CHART_SERIES.length;

export function chartColor(index: number): string {
    return CHART_SERIES[index % MAX_CHART_SERIES];
}
