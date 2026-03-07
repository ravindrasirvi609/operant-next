import type { getFacultyWorkspace } from "@/lib/faculty/service";

type FacultyWorkspace = Awaited<ReturnType<typeof getFacultyWorkspace>>;

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 52;
const RIGHT = 543;
const TOP = 790;
const BOTTOM = 54;

function safe(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function wrap(text: string, max = 92) {
    const normalized = safe(text.replace(/\s+/g, " ").trim());
    if (!normalized) return [];
    const words = normalized.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= max) current = next;
        else {
            if (current) lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function makePdf(pages: string[]) {
    const objects: string[] = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "<< /Type /Pages /Kids [] /Count 0 >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>";

    const pageRefs: string[] = [];
    let nextId = 6;
    for (const content of pages) {
        const contentId = nextId++;
        const pageId = nextId++;
        objects[contentId] = `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`;
        objects[pageId] =
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
            `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`;
        pageRefs.push(`${pageId} 0 R`);
    }
    objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let i = 1; i < objects.length; i += 1) {
        offsets[i] = Buffer.byteLength(pdf, "utf8");
        pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
}

export function buildFacultyReportPdf(
    workspace: FacultyWorkspace,
    type: "cas" | "pbas",
    entryId: string
) {
    const { user, facultyRecord } = workspace;
    const commands: string[] = [];
    const pages: string[] = [];
    let y = TOP;

    const line = (text: string, font: "F1" | "F2" | "F3" = "F1", size = 10.5) => {
        commands.push(`BT /${font} ${size} Tf ${LEFT} ${y} Td (${safe(text)}) Tj ET`);
        y -= size >= 14 ? 20 : 14;
    };

    const para = (text: string) => {
        for (const row of wrap(text)) {
            line(row);
        }
    };

    const section = (title: string) => {
        if (y < BOTTOM + 80) {
            pages.push(commands.join("\n"));
            commands.length = 0;
            y = TOP;
        }
        line(title.toUpperCase(), "F2", 11.5);
        commands.push(`0.82 G ${LEFT} ${y + 6} m ${RIGHT} ${y + 6} l S 0 g`);
        y -= 6;
    };

    line(user.name, "F2", 20);
    line(user.designation || "Faculty Member", "F3", 12);
    para(
        [
            user.email,
            user.phone,
            user.department,
            user.collegeName,
            user.universityName,
        ]
            .filter(Boolean)
            .join(" | ")
    );

    if (type === "cas") {
        const cas = facultyRecord.casEntries.find((item) => item._id?.toString() === entryId);
        if (!cas) {
            throw new Error("Requested faculty report entry was not found.");
        }
        section("Career Advancement Scheme Report");
        para(`Promotion Path: ${cas.promotionFrom} to ${cas.promotionTo}`);
        para(`Assessment Period: ${cas.assessmentPeriodStart} to ${cas.assessmentPeriodEnd}`);
        para(`Current Stage: ${cas.currentStage || "-"} | Teaching Experience: ${cas.teachingExperienceYears || 0} years`);
        section("Academic Achievements");
        para(`Research papers: ${cas.publicationCount || 0}`);
        para(`Books/chapters: ${cas.bookCount || 0}`);
        para(`Conference participation: ${cas.conferenceCount || 0}`);
        para(`Workshops attended: ${cas.workshopCount || 0}`);
        para(`Research projects: ${cas.projectCount || 0}`);
        para(`PhD supervision: ${cas.phdSupervisionCount || 0}`);
        section("Administrative Responsibilities");
        para(cas.adminResponsibilitySummary || "No administrative responsibilities listed.");
        section("Research Summary");
        para(cas.researchSummary || "No research summary provided.");
        section("API Score");
        para(`Claimed API score: ${cas.apiScoreClaimed || 0}`);
    } else {
        const pbas = facultyRecord.pbasEntries.find((item) => item._id?.toString() === entryId);
        if (!pbas) {
            throw new Error("Requested faculty report entry was not found.");
        }
        section("Performance Based Appraisal System Report");
        para(`Academic Year: ${pbas.academicYear}`);
        section("Teaching Activities");
        para(`Teaching hours: ${pbas.teachingHours || 0}`);
        para(`Courses handled: ${(pbas.coursesHandled || []).join(", ") || "-"}`);
        para(`Mentoring count: ${pbas.mentoringCount || 0} | Lab supervision: ${pbas.labSupervisionCount || 0}`);
        section("Research and Academic Contribution");
        para(
            `Research papers: ${pbas.researchPaperCount || 0}, Journals: ${pbas.journalCount || 0}, Books: ${pbas.bookCount || 0}, Patents: ${pbas.patentCount || 0}, Conferences: ${pbas.conferenceCount || 0}`
        );
        section("Institutional Responsibilities");
        para(`Committee work: ${pbas.committeeWork || "-"}`);
        para(`Exam duties: ${pbas.examDuties || "-"}`);
        para(`Student guidance: ${pbas.studentGuidance || "-"}`);
        section("API Score");
        para(
            `Teaching: ${pbas.teachingScore || 0} | Research: ${pbas.researchScore || 0} | Institutional: ${pbas.institutionalScore || 0} | Total: ${pbas.totalApiScore || 0}`
        );
        para(`Remarks: ${pbas.remarks || "-"}`);
    }

    pages.push(commands.join("\n"));
    return makePdf(pages);
}
