import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json(
        {
            message: "Faculty evidence workspace has been removed. Use /faculty/profile for category-wise faculty records.",
        },
        { status: 410 }
    );
}

export async function POST() {
    return NextResponse.json(
        {
            message: "Faculty evidence workspace has been removed. Use /faculty/profile for category-wise faculty records.",
        },
        { status: 410 }
    );
}
