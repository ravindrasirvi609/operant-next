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
    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#fffdf7_100%)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/70 to-transparent" />
                <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(rgba(255,255,255,0.62)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.62)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
                <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl" />
                <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-amber-300/35 blur-3xl" />
            </div>
            <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
                <div className="order-2 lg:order-1">
                    {aside ?? <DefaultAside />}
                </div>

                <section className="order-1 flex items-center justify-center lg:order-2">
                    <div className="w-full max-w-2xl rounded-[32px] border border-white/80 bg-white/72 p-5 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.5)] backdrop-blur xl:p-7">
                        <div className="mb-6 space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                                {eyebrow}
                            </p>
                            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
                                {title}
                            </h2>
                            <p className="max-w-xl text-base leading-7 text-zinc-500">
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
        <Card className="flex h-full flex-col justify-between overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(250,250,249,0.88)_100%)] shadow-[0_30px_90px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
            <CardHeader className="gap-5 border-b border-zinc-100/80 px-6 py-6 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                            UMIS Software
                        </p>
                        <CardTitle className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
                            Secure access for everyday academic operations.
                        </CardTitle>
                    </div>
                    <Badge className="border border-zinc-200 bg-white text-zinc-700 shadow-sm">
                        University Portal
                    </Badge>
                </div>
                <CardDescription className="max-w-2xl text-base leading-7 text-zinc-600">
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
                <div className="grid gap-4 rounded-[24px] border border-zinc-200/80 bg-white/80 p-5 shadow-sm sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                            Access Scope
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                            Students, faculty, administrators, and academic leadership enter the right workspace from a shared identity layer.
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                            Operational Focus
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                            Registration, records, approvals, and institutional workflows stay aligned under one sign-in experience.
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-4 border-t border-zinc-100/80 bg-zinc-50/70 px-6 py-5 text-sm text-zinc-500 sm:px-8">
                <span>Already onboarded?</span>
                <Link href="/login" className="font-medium text-zinc-950">
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
        <Card className="border-zinc-200/80 bg-white/88 shadow-sm">
            <CardContent className="space-y-3 px-5 py-5">
                <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 shadow-sm">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-zinc-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
                </div>
            </CardContent>
        </Card>
    );
}
