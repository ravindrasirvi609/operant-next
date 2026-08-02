import Link from "next/link";
import { GraduationCap, ShieldCheck, UserRoundCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
    eyebrow,
    title,
    description,
    children,
    aside,
    footer,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: React.ReactNode;
    aside?: React.ReactNode;
    footer?: React.ReactNode;
}) {
    // Ambient backdrop. Built from theme tokens with color-mix so the tint
    // follows the brand accent and the whole thing survives dark mode — it was
    // previously a hardcoded #f8fafc/#fffdf7 gradient plus sky/amber blobs,
    // which stayed light-on-light when dark mode was enabled.
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_38%),radial-gradient(circle_at_bottom_right,color-mix(in_oklch,var(--chart-4)_14%,transparent),transparent_40%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px)] bg-[size:72px_72px] opacity-50" />
                <div className="absolute -left-24 top-16 size-72 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -right-16 bottom-0 size-80 rounded-full bg-chart-4/20 blur-3xl" />
            </div>
            <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
                <div className="order-2 lg:order-1">
                    {aside ?? <DefaultAside />}
                </div>

                <section className="order-1 flex items-center justify-center lg:order-2">
                    <div className="w-full max-w-2xl rounded-[32px] border border-border/80 bg-card/72 p-5 shadow-[0_30px_90px_-40px_color-mix(in_oklch,var(--foreground)_45%,transparent)] backdrop-blur xl:p-7">
                        <div className="mb-6 space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                                {eyebrow}
                            </p>
                            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                                {title}
                            </h2>
                            <p className="max-w-xl text-base leading-7 text-muted-foreground">
                                {description}
                            </p>
                        </div>
                        {children}
                        {footer ? <div className="mt-5">{footer}</div> : null}
                    </div>
                </section>
            </div>
        </div>
    );
}

function DefaultAside() {
    return (
        <Card className="flex h-full flex-col justify-between overflow-hidden rounded-[32px] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--card)_94%,transparent)_0%,color-mix(in_oklch,var(--muted)_88%,transparent)_100%)] shadow-[0_30px_90px_-40px_color-mix(in_oklch,var(--foreground)_45%,transparent)] backdrop-blur">
            <CardHeader className="gap-5 border-b border-border/80 px-6 py-6 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                            UMIS Software
                        </p>
                        <CardTitle className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                            Secure access for everyday academic operations.
                        </CardTitle>
                    </div>
                    <Badge className="border border-border bg-card text-foreground shadow-sm">
                        University Portal
                    </Badge>
                </div>
                <CardDescription className="max-w-2xl text-base leading-7 text-muted-foreground">
                    Bring student services, faculty workflows, and institutional operations into one reliable sign-in experience built for campus teams.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-6 py-6 sm:px-8">
                <div className="grid gap-4 sm:grid-cols-3">
                    <FeatureCard
                        icon={<ShieldCheck className="size-5" />}
                        title="Protected Access"
                        text="Secure entry for every protected workspace, record, and operational flow."
                    />
                    <FeatureCard
                        icon={<GraduationCap className="size-5" />}
                        title="Student Ready"
                        text="Supports account activation and day-to-day access for enrolled learners."
                    />
                    <FeatureCard
                        icon={<UserRoundCheck className="size-5" />}
                        title="Faculty Ready"
                        text="Keeps teaching, administration, and review responsibilities inside one portal."
                    />
                </div>
                <div className="grid gap-4 rounded-[24px] border border-border/80 bg-card/80 p-5 shadow-sm sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Access Scope
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Students, faculty, administrators, and academic leadership enter the right workspace from a shared identity layer.
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Operational Focus
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Registration, records, approvals, and institutional workflows stay aligned under one sign-in experience.
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-4 border-t border-border/80 bg-muted/70 px-6 py-5 text-sm text-muted-foreground sm:px-8">
                <span>Already onboarded?</span>
                <Link href="/login" className="font-medium text-foreground">
                    Sign in
                </Link>
            </CardFooter>
        </Card>
    );
}

function FeatureCard({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <Card className="border-border/80 bg-card/88 shadow-sm">
            <CardContent className="space-y-3 px-5 py-5">
                <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground shadow-sm">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
            </CardContent>
        </Card>
    );
}
