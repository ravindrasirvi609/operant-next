import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import { requireAlumni } from "@/lib/auth/user";
import { getAlumniProfile } from "@/lib/alumni/service";

export default async function AlumniWorkspacePage() {
    const user = await requireAlumni();
    const { alumni } = await getAlumniProfile(user.id);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">Welcome back, {alumni.firstName}</CardTitle>
                        <Badge>{alumni.status}</Badge>
                    </div>
                    <CardDescription>
                        Your alumni workspace. Keep your contact and career details current so the institution can stay in touch.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                    <StatTile label="Enrollment No." value={alumni.enrollmentNo} />
                    <StatTile label="Graduation Year" value={alumni.graduationYear} />
                    <StatTile label="Current Employer" value={alumni.currentEmployer ?? "Not set"} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Keep your profile current</CardTitle>
                    <CardDescription>
                        Update your contact details and current career information any time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/alumni/profile">Open my profile</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
