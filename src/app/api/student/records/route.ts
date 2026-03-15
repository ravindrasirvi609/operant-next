import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import {
    getAllStudentRecords,
    createStudentRecord,
    deleteStudentRecord,
    updateStudentRecordDocument,
} from "@/lib/student/records-service";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const records = await getAllStudentRecords(user.id);
        return NextResponse.json(records);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const body = (await request.json()) as {
            type?: string;
            data?: unknown;
        };

        if (!body.type || !body.data) {
            return NextResponse.json(
                { message: "Missing type or data." },
                { status: 400 }
            );
        }

        const record = await createStudentRecord(user.id, body.type, body.data);

        return NextResponse.json({
            message: "Record created successfully.",
            record: JSON.parse(JSON.stringify(record)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const body = (await request.json()) as {
            type?: string;
            id?: string;
        };

        if (!body.type || !body.id) {
            return NextResponse.json(
                { message: "Missing type or id." },
                { status: 400 }
            );
        }

        await deleteStudentRecord(user.id, body.type, body.id);

        return NextResponse.json({ message: "Record deleted successfully." });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const body = (await request.json()) as {
            type?: string;
            id?: string;
            documentId?: string;
        };

        if (!body.type || !body.id || !body.documentId) {
            return NextResponse.json(
                { message: "Missing type, id, or documentId." },
                { status: 400 }
            );
        }

        const record = await updateStudentRecordDocument(
            user.id,
            body.type,
            body.id,
            body.documentId
        );

        return NextResponse.json({
            message: "Evidence linked successfully.",
            record: JSON.parse(JSON.stringify(record)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
