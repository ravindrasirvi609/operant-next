import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Separator } from "@/components/ui/separator";
import { requireFaculty } from "@/lib/auth/user";

const navLinks = [
  { label: "Home", href: "/faculty" },
  { label: "Profile", href: "/faculty/profile" },
  { label: "PBAS", href: "/faculty/pbas" },
  { label: "AQAR", href: "/faculty/aqar" },
  { label: "SSR", href: "/faculty/ssr" },
  { label: "Curriculum", href: "/faculty/curriculum" },
  { label: "Teaching Learning", href: "/faculty/teaching-learning" },
  { label: "Research", href: "/faculty/research-innovation" },
  { label: "Infrastructure", href: "/faculty/infrastructure-library" },
  { label: "Student Support", href: "/faculty/student-support-governance" },
  { label: "CAS", href: "/faculty/cas" },
];

export default async function FacultyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const faculty = await requireFaculty();

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/90 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white">
              OP
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Operant Faculty</p>
              <p className="text-xs text-zinc-500">Academic Operations</p>
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
              <p className="font-medium text-zinc-900">{faculty.name}</p>
              <p>{faculty.department ?? "Department"}</p>
            </div>
            <NotificationCenter />
            <Badge variant="secondary">{faculty.role ?? "Faculty"}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
          </div>
        </div>

        <Separator className="lg:hidden" />
        <div className="flex w-full flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:hidden lg:px-8 xl:px-10">
          {navLinks.map((link) => (
            <Button key={link.href} variant="outline" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
      </header>

      {children}

      <footer className="border-t border-zinc-200 bg-white">
        <div className="flex w-full flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
          <div>
            <p className="font-medium text-zinc-900">Operant Faculty Suite</p>
            <p>Powered by the Academic Excellence Cell</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/profile">
              Settings
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/profile">
              Faculty Data
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/pbas">
              PBAS
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/ssr">
              SSR
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/curriculum">
              Curriculum
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/teaching-learning">
              Teaching Learning
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/research-innovation">
              Research
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/infrastructure-library">
              Infrastructure
            </Link>
            <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/faculty/student-support-governance">
              Student Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
