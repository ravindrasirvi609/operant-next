import Link from "next/link";
import { GraduationCap, LibraryBig, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function AuthShell({
    eyebrow,
    title,
    description,
    children,
    footer,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-amber-50">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
                <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
            </div>
            <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
                <Card className="flex h-full flex-col justify-between border-zinc-200/80 bg-white/90 shadow-xl backdrop-blur">
                    <CardHeader className="gap-4 border-b border-zinc-100">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                                    UMIS Software
                                </p>
                                <CardTitle className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
                                    Authentication built for academic operations.
                                </CardTitle>
                            </div>
                            <Badge className="bg-zinc-900 text-white">Secure Portal</Badge>
                        </div>
                        <CardDescription className="max-w-2xl text-base leading-7 text-zinc-600">
                            Students and faculty can self-register, verify email,
                            recover access, and enter the protected UMIS workspace.
                            The home page is locked behind authenticated access.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FeatureCard
                                icon={<ShieldCheck className="size-5" />}
                                title="Protected Access"
                                text="HTTP-only cookie sessions, password hashing, email verification, and reset links."
                            />
                            <FeatureCard
                                icon={<GraduationCap className="size-5" />}
                                title="Role Aware"
                                text="Faculty and student registration flows collect the right academic identity data."
                            />
                            <FeatureCard
                                icon={<LibraryBig className="size-5" />}
                                title="UMIS Ready"
                                text="Works against your Mongo user model so future modules inherit the same auth layer."
                            />
                        </div>
                        <Separator />
                        <div className="grid gap-3 text-sm text-zinc-500">
                            <p>Modern auth stack with Resend, bcryptjs, jose, Zod, and React Hook Form.</p>
                            <div className="flex items-center gap-2">
                                <span>Already onboarded?</span>
                                <Link href="/login" className="font-medium text-zinc-950">
                                    Sign in
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-zinc-50/70 text-sm text-zinc-500">
                        Secure identity checks are required for every protected UMIS module.
                    </CardFooter>
                </Card>

                <section className="flex items-center justify-center">
                    <div className="w-full max-w-2xl">
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
        <Card className="border-zinc-200/80 bg-white/80 shadow-sm">
            <CardContent className="space-y-3">
                <div className="inline-flex size-11 items-center justify-center rounded-md bg-white text-zinc-700 shadow-sm">
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
