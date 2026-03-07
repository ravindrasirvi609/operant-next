import { DirectorShell } from "@/components/director/director-shell";
import { requireDirector } from "@/lib/auth/user";

export default async function DirectorLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const director = await requireDirector();

    return <DirectorShell directorName={director.name}>{children}</DirectorShell>;
}
