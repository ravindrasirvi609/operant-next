import { requireDirector } from "@/lib/auth/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DirectorApprovalsPage() {
    await requireDirector();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Student approval workflow retired</CardTitle>
                <CardDescription>
                    Student self-submission and HOD approval are no longer part of the accreditation identity flow.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-zinc-600">
                Student identities are now provisioned centrally by the institution. Students activate their pre-created accounts through First Time Student Login Setup, so there is no pending approval queue here anymore.
            </CardContent>
        </Card>
    );
}
