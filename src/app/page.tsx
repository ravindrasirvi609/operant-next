import Link from "next/link";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { resolveAuthorizationProfile } from "@/lib/authorization/service";

type PortalLink = {
  label: string;
  href: string;
  description: string;
};

const publicPortalLinks: PortalLink[] = [
  {
    label: "Student and Faculty Login",
    href: "/login",
    description: "Use this for regular institutional sign-in.",
  },
  {
    label: "Leadership Login",
    href: "/director/login",
    description: "For HOD, IQAC, principal, and review board access.",
  },
  {
    label: "Admin Login",
    href: "/admin/login",
    description: "For system administration and governance operations.",
  },
];

function getSignedInLinks(role: string, hasLeadershipPortalAccess: boolean): PortalLink[] {
  const links: PortalLink[] = [];

  if (role === "Student") {
    links.push({
      label: "Open Student Workspace",
      href: "/student/records",
      description: "View records, profile, and student services.",
    });
  }

  if (role === "Faculty") {
    links.push({
      label: "Open Faculty Workspace",
      href: "/faculty",
      description: "Manage PBAS, CAS, AQAR, and faculty profile data.",
    });
  }

  if (hasLeadershipPortalAccess) {
    links.push({
      label: "Open Leadership Workspace",
      href: "/director",
      description: "Review governance dashboards and submissions.",
    });
  }

  if (role === "Admin") {
    links.push({
      label: "Open Admin Console",
      href: "/admin",
      description: "Configure system settings, users, and masters.",
    });
  }

  return links;
}

export default async function Home() {
  const user = await getCurrentUser();
  const authorizationProfile = user ? await resolveAuthorizationProfile(user) : null;
  const signedInLinks = user
    ? getSignedInLinks(user.role, authorizationProfile?.hasLeadershipPortalAccess ?? false)
    : [];

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <Badge>{user ? "Common Home" : "Public Landing Page"}</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Unified Management Information System
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600">
            This is now the common home page for everyone. It can be opened without login,
            and signed-in users can continue to their role workspaces from here.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {user ? (
              <>
                {signedInLinks.map((link) => (
                  <Button key={link.href} asChild>
                    <Link href={link.href}>
                      {link.label}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ))}
                <LogoutButton />
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/register">Create Account</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Portal Access</CardTitle>
              <CardDescription>
                Quick links for each portal from the same common home page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {publicPortalLinks.map((portal) => (
                <div
                  key={portal.href}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-900">{portal.label}</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={portal.href}>Open</Link>
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">{portal.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Status</CardTitle>
              <CardDescription>
                Common visibility for guests and authenticated users.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-700">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Current State
                </p>
                <p className="mt-2 font-medium text-zinc-950">
                  {user ? "Authenticated session active" : "Guest mode (no login required)"}
                </p>
              </div>
              {user ? (
                <>
                  <DetailRow label="Name" value={user.name} />
                  <DetailRow label="Role" value={user.role} />
                  <DetailRow label="Email" value={user.email} />
                  <DetailRow
                    label="Verification"
                    value={user.emailVerified ? "Verified" : "Pending"}
                  />
                </>
              ) : (
                <>
                  <DetailRow
                    label="Who can view this page"
                    value="Anyone, with or without login"
                  />
                  <DetailRow
                    label="Role dashboards"
                    value="Still protected and available after login"
                  />
                </>
              )}
              <div className="flex items-center gap-2 text-zinc-600">
                {user ? <UserRound className="size-4" /> : <ShieldCheck className="size-4" />}
                <span>{user ? "Signed-in user detected" : "Public access enabled"}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 font-medium text-zinc-950">{value}</p>
    </div>
  );
}
