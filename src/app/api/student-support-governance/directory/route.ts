import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { AuthError } from "@/lib/auth/errors";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/student/student";
import Faculty from "@/models/faculty/faculty";

/**
 * Lightweight roster for the Student Support & Governance contributor form's
 * student/mentor pickers. Any staff member filling in a report needs to be
 * able to search the full active roster, so this intentionally isn't scoped
 * to the caller's own department (contributors already have plan-level scope
 * enforcement elsewhere).
 */
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role === "Student") {
            throw new AuthError("Staff access is required.", 403);
        }

        await dbConnect();
        const [students, faculty] = await Promise.all([
            Student.find({ status: "Active" })
                .select("firstName lastName enrollmentNo")
                .sort({ firstName: 1 })
                .lean(),
            Faculty.find({ status: "Active" })
                .select("firstName lastName")
                .sort({ firstName: 1 })
                .lean(),
        ]);

        return NextResponse.json({
            students: students.map((student) => ({
                id: student._id.toString(),
                name: [student.firstName, student.lastName].filter(Boolean).join(" "),
                enrollmentNo: student.enrollmentNo,
            })),
            faculty: faculty.map((member) => ({
                id: member._id.toString(),
                name: [member.firstName, member.lastName].filter(Boolean).join(" "),
            })),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
