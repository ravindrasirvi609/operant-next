import { getCurrentUser } from "@/lib/auth/user";
import { getStudentProfile } from "@/lib/student/service";
import { buildStudentResumePdf } from "@/lib/student/resume-pdf";

export async function GET() {
    const user = await getCurrentUser();

    if (!user || user.role !== "Student") {
        return new Response("Student access required.", { status: 403 });
    }

    const student = await getStudentProfile(user.id);
    const pdf = buildStudentResumePdf(student);

    return new Response(pdf, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${student.name.replace(/\s+/g, "-").toLowerCase()}-resume.pdf"`,
        },
    });
}
