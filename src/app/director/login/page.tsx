import { AuthShell } from "@/components/auth/auth-shell";
import { DirectorLoginForm } from "@/components/director/director-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectDirectorIfAuthenticated } from "@/lib/auth/user";

export default async function DirectorLoginPage() {
    await redirectDirectorIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Director Portal"
            title="Director login"
            description="Directors sign in here to view their assigned colleges, departments, and reporting hierarchy."
        >
            <Card>
                <CardHeader>
                    <CardTitle>Director sign in</CardTitle>
                    <CardDescription>
                        Only users with the Director role or assigned leadership responsibility can open the leadership portal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DirectorLoginForm />
                </CardContent>
            </Card>
        </AuthShell>
    );
}
