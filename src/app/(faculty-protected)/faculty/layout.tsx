import { requireFaculty } from "@/lib/auth/user";
import { FacultyShell } from "@/components/faculty/faculty-shell";

export default async function FacultyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const faculty = await requireFaculty();

  return (
    <FacultyShell
      facultyName={faculty.name}
      department={faculty.department}
      designation={faculty.designation}
    >
      {children}
    </FacultyShell>
  );
}
