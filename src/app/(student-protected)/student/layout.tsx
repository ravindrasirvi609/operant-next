import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth/user";

export default async function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "Student") {
    redirect("/");
  }

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Profile", href: "/student/profile" },
    { label: "Records", href: "/student/records" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white">
              OP
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Operant Student</p>
              <p className="text-xs text-zinc-500">Academic Identity</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Button key={link.href} variant="ghost" size="sm" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden text-right text-xs text-zinc-500 sm:block">
              <p className="font-medium text-zinc-900">{user.name}</p>
              <p>{user.studentDetails?.course ?? "Student"}</p>
            </div>
            <Badge variant="secondary">{user.role ?? "Student"}</Badge>
            <Badge
              className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
            >
              {user.accountStatus}
            </Badge>
          </div>
        </div>

        <Separator className="lg:hidden" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:hidden lg:px-8">
          {navLinks.map((link) => (
            <Button key={link.href} variant="outline" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
      </header>

      {children}

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="font-medium text-zinc-900">Operant Student Suite</p>
            <p>Powered by the Academic Excellence Cell</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/student/profile">
              Profile
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/student/records">
              Records
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
