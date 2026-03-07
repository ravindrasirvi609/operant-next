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
        <div className="relative min-h-screen overflow-hidden bg-[#f4efe6]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,176,128,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(31,41,55,0.14),_transparent_34%)]" />
            <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
                <section className="flex flex-col justify-between rounded-[34px] border border-[#e5ded3] bg-[#1f2937] px-6 py-8 text-white shadow-[0_32px_100px_rgba(31,41,55,0.22)] sm:px-8 lg:px-10">
                    <div className="space-y-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c8d6e5]">
                                    UMIS Software
                                </p>
                                <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                                    Authentication built for academic operations.
                                </h1>
                            </div>
                            <Badge className="border-white/20 bg-white/10 text-white">
                                Secure Portal
                            </Badge>
                        </div>
                        <p className="max-w-2xl text-base leading-8 text-[#d8e2ef]">
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
                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-sm text-[#c8d6e5]">
                        <span>Modern auth stack with Resend, bcryptjs, jose, Zod, and React Hook Form.</span>
                        <Link href="/login" className="font-semibold text-white underline decoration-white/35 underline-offset-4">
                            Sign in
                        </Link>
                    </div>
                </section>

                <section className="flex items-center justify-center">
                    <div className="w-full max-w-2xl">
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f5f36]">
                                {eyebrow}
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">
                                {title}
                            </h2>
                            <p className="mt-3 max-w-xl text-base leading-7 text-[#6b7280]">
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
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#f4d6ad]">
                {icon}
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#c8d6e5]">{text}</p>
        </div>
    );
}
