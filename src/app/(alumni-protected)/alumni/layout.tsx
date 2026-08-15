import { AlumniShell } from "@/components/alumni/alumni-shell";
import { requireAlumni } from "@/lib/auth/user";

export default async function AlumniLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = await requireAlumni();

    return (
        <AlumniShell
            alumniName={user.name}
            alumniEmail={user.email}
            accountStatus={user.accountStatus}
        >
            {children}
        </AlumniShell>
    );
}
