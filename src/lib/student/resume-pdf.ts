import type { getStudentProfile } from "@/lib/student/service";

type StudentProfileRecord = Awaited<ReturnType<typeof getStudentProfile>>;

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 52;
const RIGHT_MARGIN = 543;
const TOP_MARGIN = 790;
const BOTTOM_MARGIN = 54;

function sanitizeText(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function normalizeText(value?: string | null) {
    return sanitizeText(String(value ?? "").replace(/\s+/g, " ").trim());
}

function wrapText(text: string, maxChars: number) {
    const normalized = normalizeText(text);

    if (!normalized) {
        return [];
    }

    const words = normalized.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        const next = current ? `${current} ${word}` : word;

        if (next.length <= maxChars) {
            current = next;
            continue;
        }

        if (current) {
            lines.push(current);
        }

        current = word;
    }

    if (current) {
        lines.push(current);
    }

    return lines;
}

function makeBulletLines(items: string[], maxChars: number) {
    return items.flatMap((item) => {
        const wrapped = wrapText(item, maxChars);

        if (!wrapped.length) {
            return [];
        }

        return wrapped.map((line, index) => (index === 0 ? `- ${line}` : `  ${line}`));
    });
}

function buildPdf(pageContents: string[]) {
    const objects: string[] = [];

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "<< /Type /Pages /Kids [] /Count 0 >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>";

    const pageRefs: string[] = [];
    let nextObjectId = 6;

    for (const pageContent of pageContents) {
        const contentObjectId = nextObjectId++;
        const pageObjectId = nextObjectId++;
        const length = Buffer.byteLength(pageContent, "utf8");

        objects[contentObjectId] = `<< /Length ${length} >>\nstream\n${pageContent}\nendstream`;
        objects[pageObjectId] =
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
            `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ` +
            `/Contents ${contentObjectId} 0 R >>`;
        pageRefs.push(`${pageObjectId} 0 R`);
    }

    objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    for (let index = 1; index < objects.length; index += 1) {
        offsets[index] = Buffer.byteLength(pdf, "utf8");
        pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length}\n`;
    pdf += "0000000000 65535 f \n";

    for (let index = 1; index < objects.length; index += 1) {
        pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "utf8");
}

export function buildStudentResumePdf(user: StudentProfileRecord) {
    const personal = user.studentDetails?.personalInfo;
    const academic = user.studentDetails?.academicInfo;
    const career = user.studentDetails?.careerProfile;
    const projects = career?.projects ?? [];
    const internships = career?.internships ?? [];
    const skills = career?.skills ?? [];
    const certifications = career?.certifications ?? [];
    const achievements = career?.achievements ?? [];
    const languages = career?.languages ?? [];
    const interests = academic?.areasOfInterest ?? [];

    const pages: string[] = [];
    let commands: string[] = [];
    let cursorY = TOP_MARGIN;

    function flushPage() {
        if (commands.length) {
            pages.push(commands.join("\n"));
        }

        commands = [];
        cursorY = TOP_MARGIN;
    }

    function ensureSpace(height: number) {
        if (cursorY - height < BOTTOM_MARGIN) {
            flushPage();
        }
    }

    function drawText(text: string, x: number, y: number, font: "F1" | "F2" | "F3", size: number) {
        commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${text}) Tj ET`);
    }

    function drawParagraph(text: string, options?: { font?: "F1" | "F2" | "F3"; size?: number; maxChars?: number; gap?: number }) {
        const font = options?.font ?? "F1";
        const size = options?.size ?? 10.5;
        const gap = options?.gap ?? 14;
        const lines = wrapText(text, options?.maxChars ?? 90);

        if (!lines.length) {
            return;
        }

        ensureSpace(lines.length * gap + 4);

        for (const line of lines) {
            drawText(line, LEFT_MARGIN, cursorY, font, size);
            cursorY -= gap;
        }
    }

    function drawDivider() {
        commands.push(`0.82 G ${LEFT_MARGIN} ${cursorY} m ${RIGHT_MARGIN} ${cursorY} l S 0 g`);
        cursorY -= 16;
    }

    function addSection(title: string) {
        ensureSpace(34);
        drawText(normalizeText(title).toUpperCase(), LEFT_MARGIN, cursorY, "F2", 11.5);
        cursorY -= 8;
        drawDivider();
    }

    function addBulletBlock(items: string[]) {
        const lines = makeBulletLines(items, 92);

        if (!lines.length) {
            return;
        }

        ensureSpace(lines.length * 13 + 4);

        for (const line of lines) {
            drawText(normalizeText(line), LEFT_MARGIN, cursorY, "F1", 10.5);
            cursorY -= 13;
        }
    }

    const name = normalizeText(user.name || "Student Resume");
    const headline = normalizeText(career?.headline || "Student Profile");
    const contactLine = normalizeText(
        [user.email, user.phone, personal?.city, personal?.state].filter(Boolean).join("  |  ")
    );

    drawText(name, LEFT_MARGIN, cursorY, "F2", 21);
    cursorY -= 24;
    drawText(headline || "Student Profile", LEFT_MARGIN, cursorY, "F3", 12);
    cursorY -= 18;
    if (contactLine) {
        drawText(contactLine, LEFT_MARGIN, cursorY, "F1", 10.5);
        cursorY -= 16;
    }
    drawDivider();

    drawParagraph(
        [
            user.studentDetails?.course,
            academic?.currentSemester ? `Semester ${academic.currentSemester}` : "",
            user.studentDetails?.batch ? `Batch ${user.studentDetails.batch}` : "",
            academic?.cgpa ? `CGPA ${academic.cgpa}` : "",
        ]
            .filter(Boolean)
            .join(" | "),
        { font: "F1", size: 10.5 }
    );
    drawParagraph(
        `University: ${user.universityName || "-"} | College: ${user.collegeName || "-"} | Department: ${user.department || "-"}`,
        { font: "F1", size: 10.5 }
    );

    addSection("Professional Summary");
    drawParagraph(career?.summary || career?.careerObjective || "Profile summary not provided.", {
        maxChars: 94,
        gap: 14,
    });

    addSection("Core Skills");
    drawParagraph(skills.length ? skills.join(", ") : "Skills not provided.", { maxChars: 94 });

    if (interests.length || languages.length || certifications.length) {
        addSection("Highlights");
        if (interests.length) {
            drawParagraph(`Areas of Interest: ${interests.join(", ")}`, { maxChars: 92 });
        }
        if (languages.length) {
            drawParagraph(`Languages: ${languages.join(", ")}`, { maxChars: 92 });
        }
        if (certifications.length) {
            drawParagraph(`Certifications: ${certifications.join(", ")}`, { maxChars: 92 });
        }
    }

    if (projects.length) {
        addSection("Projects");
        for (const project of projects) {
            ensureSpace(42);
            drawText(normalizeText(project.title || "Project"), LEFT_MARGIN, cursorY, "F2", 10.8);
            cursorY -= 14;
            if (project.techStack?.length) {
                drawParagraph(`Tech Stack: ${project.techStack.join(", ")}`, { maxChars: 90 });
            }
            if (project.description) {
                drawParagraph(project.description, { maxChars: 92 });
            }
            if (project.link) {
                drawParagraph(`Link: ${project.link}`, { maxChars: 92 });
            }
            cursorY -= 4;
        }
    }

    if (internships.length) {
        addSection("Internships");
        for (const internship of internships) {
            ensureSpace(40);
            drawText(normalizeText(internship.organization || "Internship"), LEFT_MARGIN, cursorY, "F2", 10.8);
            cursorY -= 14;
            drawParagraph(
                [internship.role, internship.duration].filter(Boolean).join(" | "),
                { maxChars: 92 }
            );
            if (internship.description) {
                drawParagraph(internship.description, { maxChars: 92 });
            }
            cursorY -= 4;
        }
    }

    if (achievements.length) {
        addSection("Achievements");
        addBulletBlock(achievements);
    }

    addSection("Academic and Contact Details");
    drawParagraph(
        [
            user.studentDetails?.rollNo ? `Roll No: ${user.studentDetails.rollNo}` : "",
            personal?.dateOfBirth ? `Date of Birth: ${personal.dateOfBirth}` : "",
            academic?.section ? `Section: ${academic.section}` : "",
            academic?.mentorName ? `Mentor: ${academic.mentorName}` : "",
        ]
            .filter(Boolean)
            .join(" | "),
        { maxChars: 92 }
    );
    drawParagraph(
        [
            personal?.address,
            personal?.city,
            personal?.state,
            personal?.postalCode,
        ]
            .filter(Boolean)
            .join(", "),
        { maxChars: 92 }
    );
    drawParagraph(
        [
            career?.socialLinks?.linkedin ? `LinkedIn: ${career.socialLinks.linkedin}` : "",
            career?.socialLinks?.github ? `GitHub: ${career.socialLinks.github}` : "",
            career?.socialLinks?.portfolio ? `Portfolio: ${career.socialLinks.portfolio}` : "",
        ]
            .filter(Boolean)
            .join(" | "),
        { maxChars: 92 }
    );

    flushPage();

    return buildPdf(pages);
}
