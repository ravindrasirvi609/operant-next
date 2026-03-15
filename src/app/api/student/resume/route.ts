import { getCurrentUser } from "@/lib/auth/user";

export async function GET() {
    const user = await getCurrentUser();

    if (!user || user.role !== "Student") {
        return new Response("Student access required.", { status: 403 });
    }

    return new Response(
        "Student resume export is not part of the current pre-provisioned accreditation flow.",
        { status: 410 }
    );
}
