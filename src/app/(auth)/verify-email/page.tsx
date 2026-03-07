import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResendVerificationForm } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyEmailToken } from "@/lib/auth/user";

type VerifyEmailPageProps = {
    searchParams: Promise<{
        token?: string;
    }>;
};

export default async function VerifyEmailPage({
    searchParams,
}: VerifyEmailPageProps) {
    const params = await searchParams;
    const result = params.token
        ? await verifyEmailToken(params.token)
        : {
              success: false,
              message: "Verification token is missing from the URL.",
          };

    return (
        <AuthShell
            eyebrow="Email Verification"
            title={result.success ? "Your email is verified" : "Verification could not be completed"}
            description="UMIS requires verified email access before a user can enter the protected home page."
        >
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div
                            className={`mb-4 inline-flex size-14 items-center justify-center rounded-2xl ${
                                result.success
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                            }`}
                        >
                            {result.success ? (
                                <CheckCircle2 className="size-7" />
                            ) : (
                                <CircleAlert className="size-7" />
                            )}
                        </div>
                        <CardTitle>{result.success ? "Account activated" : "Link expired or invalid"}</CardTitle>
                        <CardDescription>{result.message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/login">Go to Login</Link>
                        </Button>
                    </CardContent>
                </Card>

                {!result.success ? <ResendVerificationForm /> : null}
            </div>
        </AuthShell>
    );
}
