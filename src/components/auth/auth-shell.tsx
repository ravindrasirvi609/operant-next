import Link from "next/link";
import { GraduationCap, LibraryBig, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

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
        <div className="min-h-screen bg-zinc-50">
            <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
                <section className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-8 lg:px-10">
                    <div className="space-y-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                                    UMIS Software
                                </p>
                                <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
                                    Authentication built for academic operations.
                                </h1>
                            </div>
                            <Badge>Secure Portal</Badge>
                        </div>
                        <p className="max-w-2xl text-base leading-8 text-zinc-600">
                            Students and faculty can self-register, verify email,
                            recover access, and enter the protected UMIS workspace.
                            The home page is locked behind authenticated access.
                        </p>
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
                    </div>
                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-500">
                        <span>Modern auth stack with Resend, bcryptjs, jose, Zod, and React Hook Form.</span>
                        <Link href="/login" className="font-medium text-zinc-950">
                            Sign in
                        </Link>
                    </div>
                </section>

                <section className="flex items-center justify-center">
                    <div className="w-full max-w-2xl">
                        <div className="mb-6">
                            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                                {eyebrow}
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                                {title}
                            </h2>
                            <p className="mt-3 max-w-xl text-base leading-7 text-zinc-500">
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
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-md bg-white text-zinc-700 shadow-sm">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-zinc-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
        </div>
    );
}
