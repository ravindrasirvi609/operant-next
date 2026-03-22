import { AuthShell } from "@/components/auth/auth-shell";
import { DirectorLoginForm } from "@/components/director/director-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectDirectorIfAuthenticated } from "@/lib/auth/user";

export default async function DirectorLoginPage() {
    await redirectDirectorIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Leadership Portal"
            title="Leadership login"
            description="Assigned HODs, principals, IQAC leaders, and review committee members sign in here to access governance workflows."
        >
            <Card>
                <CardHeader>
                    <CardTitle>Leadership sign in</CardTitle>
                    <CardDescription>
                        Only users with active leadership or governance responsibility can open the leadership portal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DirectorLoginForm />
                </CardContent>
            </Card>
        </AuthShell>
    );
}
