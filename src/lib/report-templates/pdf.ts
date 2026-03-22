const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 50;
const RIGHT = 545;
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

function wrap(text: string, max = 88) {
    const normalized = safe(text.replace(/\s+/g, " ").trim());
    if (!normalized) return [];
    const words = normalized.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= max) {
            current = next;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    }

    if (current) {
        lines.push(current);
    }

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
    for (let index = 1; index < objects.length; index += 1) {
        offsets[index] = Buffer.byteLength(pdf, "utf8");
        pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let index = 1; index < objects.length; index += 1) {
        pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
}

export function buildTemplatedPdf(options: {
    title: string;
    subtitle?: string;
    meta?: string;
    intro?: string;
    footer?: string;
    sections: Array<{
        title?: string;
        body?: string;
    }>;
}) {
    const commands: string[] = [];
    const pages: string[] = [];
    let y = TOP;

    const line = (text: string, font: "F1" | "F2" | "F3" = "F1", size = 10.5) => {
        commands.push(`BT /${font} ${size} Tf ${LEFT} ${y} Td (${safe(text)}) Tj ET`);
        y -= size >= 14 ? 20 : 14;
    };

    const para = (text?: string) => {
        if (!text?.trim()) {
            return;
        }

        for (const row of wrap(text)) {
            line(row);
        }
    };

    const section = (title: string) => {
        if (y < BOTTOM + 90) {
            pages.push(commands.join("\n"));
            commands.length = 0;
            y = TOP;
        }

        line(title.toUpperCase(), "F2", 11.5);
        commands.push(`0.82 G ${LEFT} ${y + 6} m ${RIGHT} ${y + 6} l S 0 g`);
        y -= 6;
    };

    line(options.title, "F2", 20);
    if (options.subtitle) {
        line(options.subtitle, "F3", 12);
    }
    para(options.meta);
    para(options.intro);

    for (const entry of options.sections) {
        if (!entry.title?.trim() && !entry.body?.trim()) {
            continue;
        }

        if (entry.title?.trim()) {
            section(entry.title.trim());
        }
        para(entry.body);
    }

    if (options.footer) {
        section("Notes");
        para(options.footer);
    }

    pages.push(commands.join("\n"));
    return makePdf(pages);
}
