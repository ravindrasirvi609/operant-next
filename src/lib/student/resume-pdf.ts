import type { getStudentProfile } from "@/lib/student/service";

type StudentWorkspace = Awaited<ReturnType<typeof getStudentProfile>>;

function escapePdfText(value: string) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function normalize(value?: string | number | null) {
    return escapePdfText(String(value ?? "-").replace(/\s+/g, " ").trim() || "-");
}

export function buildStudentResumePdf(workspace: StudentWorkspace) {
    const lines = [
        workspace.user.name,
        `Enrollment No.: ${workspace.student.enrollmentNo}`,
        `Institution Email: ${workspace.user.email}`,
        `Mobile: ${workspace.student.mobile ?? workspace.user.phone ?? "-"}`,
        `University: ${normalize((workspace.institution as { name?: string } | null)?.name)}`,
        `Department: ${normalize((workspace.department as { name?: string } | null)?.name)}`,
        `Program: ${normalize((workspace.program as { name?: string } | null)?.name)}`,
        `Degree Type: ${normalize((workspace.program as { degreeType?: string } | null)?.degreeType)}`,
        `Program Duration: ${
            (workspace.program as { durationYears?: number } | null)?.durationYears
                ? `${(workspace.program as { durationYears?: number }).durationYears} years`
                : "-"
        }`,
        `Admission Year: ${workspace.student.admissionYear}`,
        `Student Status: ${workspace.student.status}`,
        `Account Status: ${workspace.user.accountStatus}`,
    ];

    const content = [
        "BT",
        "/F1 18 Tf 52 790 Td",
        `(${normalize("Institutional Student Record")}) Tj`,
        "ET",
        ...lines.flatMap((line, index) => [
            "BT",
            `/F1 ${index === 0 ? 14 : 11} Tf 52 ${750 - index * 24} Td`,
            `(${normalize(line)}) Tj`,
            "ET",
        ]),
    ].join("\n");

    const streamLength = Buffer.byteLength(content, "utf8");

    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000248 00000 n 
0000000318 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${318 + streamLength + 33}
%%EOF`;

    return Buffer.from(pdf, "utf8");
}
