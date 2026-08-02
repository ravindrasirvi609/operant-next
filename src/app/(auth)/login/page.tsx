import { Building2, GraduationCap, ShieldCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfAuthenticated } from "@/lib/auth/user";

type LoginPageProps = {
    searchParams: Promise<{
        message?: string;
        email?: string;
    }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
    await redirectIfAuthenticated();

    const params = await searchParams;

    return (
        <AuthShell
            eyebrow="Operant Next University"
            title="Access the UMIS portal"
            description="Sign in to continue to academic services, faculty workflows, and protected institutional operations."
            aside={
                /* Inverted surface: this panel is intentionally dark in BOTH themes, so
                   its text and hairlines are literal white tints rather than theme
                   tokens. `text-foreground` / `bg-card` here would flip it to a light
                   panel in dark mode and make the copy unreadable. The gradient is
                   built from the brand primary so it tracks the accent color.
                   theme-codemod:ignore-surfaces */
                <Card className="flex h-full flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.30_0.10_284)_0%,oklch(0.22_0.06_286)_52%,oklch(0.27_0.09_300)_100%)] text-white shadow-[0_30px_90px_-40px_oklch(0.30_0.10_284_/_0.8)]">
                    <CardHeader className="gap-5 border-b border-white/10 px-6 py-6 sm:px-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/60">
                                    UMIS Software
                                </p>
                                <CardTitle className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                                    Operant Next University, one secure campus entry point.
                                </CardTitle>
                            </div>
                            <Badge className="border border-white/15 bg-white/10 text-white">
                                Secure Portal
                            </Badge>
                        </div>
                        <CardDescription className="max-w-2xl text-base leading-7 text-white/75">
                            UMIS connects student services, faculty work, and institutional operations in a single university access experience designed for everyday use.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 px-6 py-6 sm:px-8">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <LoginFeature
                                icon={<GraduationCap className="size-5" />}
                                title="Student Services"
                                text="Enrollment-linked access to records, requests, and academic workflows."
                            />
                            <LoginFeature
                                icon={<Building2 className="size-5" />}
                                title="Faculty Workspace"
                                text="A clean sign-in path for teaching, review, and operational responsibilities."
                            />
                            <LoginFeature
                                icon={<ShieldCheck className="size-5" />}
                                title="Trusted Access"
                                text="Only authorized university users can enter protected UMIS areas."
                            />
                        </div>
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.08] p-5">
                            <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
                                Built for campus flow
                            </p>
                            <p className="mt-3 text-sm leading-6 text-white/75">
                                From first-time activation to daily sign-in, the portal is tailored to how Operant Next University students, faculty, and teams actually work.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            }
        >
            <LoginForm
                defaultEmail={params.email}
                initialMessage={params.message}
            />
        </AuthShell>
    );
}

function LoginFeature({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        /* Sits on the inverted hero above — literal white tints are correct here. */
        <div className="rounded-[24px] border border-white/10 bg-white/[0.08] p-4">
            <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                {icon}
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
        </div>
    );
}
