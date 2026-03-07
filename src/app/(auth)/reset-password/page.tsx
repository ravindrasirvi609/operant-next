import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfAuthenticated } from "@/lib/auth/user";

type ResetPasswordPageProps = {
    searchParams: Promise<{
        token?: string;
    }>;
};

export default async function ResetPasswordPage({
    searchParams,
}: ResetPasswordPageProps) {
    await redirectIfAuthenticated();

    const params = await searchParams;

    return (
        <AuthShell
            eyebrow="Reset Password"
            title="Choose a new password"
            description="Reset links are single-use and time-limited for account safety."
        >
            {params.token ? (
                <ResetPasswordForm token={params.token} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Reset link missing</CardTitle>
                        <CardDescription>
                            Open the full password reset link from your email, or request a new one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/forgot-password">Request New Reset Link</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </AuthShell>
    );
}
