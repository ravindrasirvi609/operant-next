import { BookOpenText, GraduationCap, ShieldCheck, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/user";
import Link from "next/link";

export default async function Home() {
  const user = await requireAuth();

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge>Protected Home Page</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
                Welcome to the UMIS workspace
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-500">
                This home page is no longer public. Access is restricted to authenticated,
                verified UMIS users only.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {user.role === "Admin" ? (
                <Button asChild>
                  <Link href="/admin">Open Admin Console</Link>
                </Button>
              ) : null}
              {user.role === "Director" ? (
                <Button asChild>
                  <Link href="/director">Open Director Portal</Link>
                </Button>
              ) : null}
              {user.role === "Faculty" ? (
                <>
                  <Button asChild>
                    <Link href="/faculty/profile">Open Faculty Workspace</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/faculty/cas">Open CAS Module</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/faculty/pbas">Open PBAS Module</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/faculty/aqar">Open AQAR Module</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/faculty/evidence">Open Shared Evidence</Link>
                  </Button>
                </>
              ) : null}
              <Button variant="secondary">Authenticated Session Active</Button>
              <LogoutButton />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Account overview</CardTitle>
              <CardDescription>
                Current signed-in identity and the minimum profile data now attached to your UMIS session.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <OverviewItem icon={<UserRound className="size-5" />} label="Name" value={user.name} />
              <OverviewItem icon={<ShieldCheck className="size-5" />} label="Role" value={user.role} />
              <OverviewItem icon={<GraduationCap className="size-5" />} label="University" value={user.universityName ?? "Not set"} />
              <OverviewItem icon={<BookOpenText className="size-5" />} label="Department" value={user.department ?? "Not set"} />
              <OverviewItem icon={<GraduationCap className="size-5" />} label="College" value={user.collegeName ?? "Not set"} />
              <OverviewItem icon={<ShieldCheck className="size-5" />} label="Email" value={user.email} />
              <OverviewItem icon={<UserRound className="size-5" />} label="Verification" value={user.emailVerified ? "Verified" : "Pending"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auth stack included</CardTitle>
              <CardDescription>
                The application now uses production-grade authentication building blocks.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-600">
              <FeatureLine text="bcryptjs password hashing with strong validation rules" />
              <FeatureLine text="Signed jose JWT session cookie stored as HTTP-only" />
              <FeatureLine text="Resend-driven email verification and password recovery" />
              <FeatureLine text="Faculty and student self-registration with role-specific fields" />
              <FeatureLine text="Forgot password, reset password, resend verification, logout" />
            </CardContent>
          </Card>
        </section>

        {user.role === "Student" && user.studentDetails ? (
          <section className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Student profile snapshot</CardTitle>
                <CardDescription>
                  Student registration fields captured during authentication onboarding.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <OverviewItem icon={<GraduationCap className="size-5" />} label="Roll No." value={user.studentDetails.rollNo} />
                <OverviewItem icon={<BookOpenText className="size-5" />} label="Course" value={user.studentDetails.course} />
                <OverviewItem icon={<UserRound className="size-5" />} label="Batch" value={user.studentDetails.batch} />
                <OverviewItem icon={<ShieldCheck className="size-5" />} label="Admission Year" value={user.studentDetails.admissionYear} />
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function OverviewItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 inline-flex size-10 items-center justify-center rounded-md bg-white text-zinc-700 shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function FeatureLine({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
      {text}
    </div>
  );
}
