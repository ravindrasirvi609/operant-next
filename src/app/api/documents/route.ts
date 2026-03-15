import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import dbConnect from "@/lib/dbConnect";
import DocumentModel from "@/models/reference/document";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const { fileName, fileUrl, fileType } = body ?? {};

        if (!fileName || !fileUrl) {
            return NextResponse.json({ message: "File name and URL are required." }, { status: 400 });
        }

        await dbConnect();

        const document = await DocumentModel.create({
            fileName,
            fileUrl,
            fileType,
            uploadedBy: user.id,
            uploadedAt: new Date(),
            verificationStatus: "Pending",
            verified: false,
        });

        return NextResponse.json({ document });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
