import Link from "next/link";
import { CheckCircle2, Clock3, FileCheck2, ShieldAlert } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentPendingApprovalAccess } from "@/lib/auth/user";

export default async function StudentVerificationPendingPage() {
    const user = await requireStudentPendingApprovalAccess();
    const details = user.studentDetails;

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
                <div className="grid w-full gap-6">
                    <Card>
                        <CardHeader className="space-y-4">
                            <Badge className="w-fit">
                                Verification Pending
                            </Badge>
                            <div className="space-y-2">
                                <CardTitle className="text-3xl tracking-tight text-zinc-950">
                                    Your student account is waiting for HOD approval
                                </CardTitle>
                                <CardDescription className="max-w-3xl text-base text-zinc-600">
                                    Your profile has been submitted successfully. Until your assigned HOD verifies it in the leadership approvals queue, your UMIS account will remain blocked from the main dashboard.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <StatusItem
                                    icon={<Clock3 className="size-5" />}
                                    label="Current Status"
                                    value={details?.profileStatus ?? "PendingApproval"}
                                />
                                <StatusItem
                                    icon={<FileCheck2 className="size-5" />}
                                    label="Assigned HOD"
                                    value={details?.assignedHodName ?? "Not assigned"}
                                />
                                <StatusItem
                                    icon={<ShieldAlert className="size-5" />}
                                    label="Access State"
                                    value="Blocked Until Approval"
                                />
                                <StatusItem
                                    icon={<CheckCircle2 className="size-5" />}
                                    label="Next Step"
                                    value="Wait For HOD Review"
                                />
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-5 text-sm leading-7 text-zinc-600">
                                Your profile is available only to the mapped HOD in <span className="font-medium text-zinc-950">/director/approvals</span>. Once approved, your student account will automatically become active and you can access the normal UMIS home page and dashboard.
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button asChild variant="secondary">
                                    <Link href="/api/student/resume">Download Resume</Link>
                                </Button>
                                <LogoutButton />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}

function StatusItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                {icon}
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                {label}
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
