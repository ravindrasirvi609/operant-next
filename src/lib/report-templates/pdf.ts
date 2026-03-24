const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 50;
const RIGHT = 545;
const TOP = 790;
const BOTTOM = 54;

function safe(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[^\x20-\x7E\n]/g, "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function normalizeText(value: string) {
    return value
        .normalize("NFKD")
        .replace(/\r/g, "")
        .replace(/[^\x20-\x7E\n]/g, "")
        .trim();
}

function wrap(text: string, max = 88) {
    const normalized = normalizeText(text).replace(/[ \t]+/g, " ");
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

function sectionBlocks(text?: string) {
    if (!text?.trim()) {
        return [];
    }

    const blocks: Array<{ type: "paragraph" | "bullet"; text: string }> = [];
    const paragraph: string[] = [];
    const rows = normalizeText(text).split("\n");

    const flushParagraph = () => {
        const value = paragraph.join(" ").trim();
        if (value) {
            blocks.push({ type: "paragraph", text: value });
        }
        paragraph.length = 0;
    };

    for (const row of rows) {
        const value = row.trim();

        if (!value) {
            flushParagraph();
            continue;
        }

        if (/^[-*]\s+/.test(value)) {
            flushParagraph();
            blocks.push({
                type: "bullet",
                text: value.replace(/^[-*]\s+/, "").trim(),
            });
            continue;
        }

        paragraph.push(value);
    }

    flushParagraph();
    return blocks;
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
    const pages: string[] = [];
    let commands: string[] = [];
    let y = TOP;

    const addCommand = (command: string) => {
        commands.push(command);
    };

    const drawText = (
        text: string,
        {
            font = "F1",
            size = 10.5,
            x = LEFT,
            fill = "0",
            spacing,
        }: {
            font?: "F1" | "F2" | "F3";
            size?: number;
            x?: number;
            fill?: string;
            spacing?: number;
        } = {}
    ) => {
        addCommand(`${fill} g BT /${font} ${size} Tf ${x} ${y} Td (${safe(text)}) Tj ET 0 g`);
        y -= spacing ?? (size >= 20 ? 24 : size >= 13 ? 18 : 14);
    };

    const footer = (pageNumber: number, pageCount: number) => [
        `0.84 G ${LEFT} 38 m ${RIGHT} 38 l S 0 g`,
        `BT /F1 9 Tf ${LEFT} 24 Td (${safe("UMIS Reporting Engine - Production Document Preview")}) Tj ET`,
        `BT /F1 9 Tf ${RIGHT - 60} 24 Td (${safe(`Page ${pageNumber} of ${pageCount}`)}) Tj ET`,
    ].join("\n");

    const startPage = (mode: "cover" | "body") => {
        commands = [];

        if (mode === "cover") {
            addCommand(`0.18 g 36 724 523 82 re f 0 g`);
            addCommand(`0.72 g 36 718 180 4 re f 0 g`);
            y = 775;
            drawText(options.title, { font: "F2", size: 22, x: 52, fill: "1", spacing: 24 });
            if (options.subtitle) {
                drawText(options.subtitle, { font: "F3", size: 12, x: 52, fill: "1", spacing: 18 });
            }
            y = 690;
            return;
        }

        addCommand(`0.85 G ${LEFT} 804 m ${RIGHT} 804 l S 0 g`);
        y = 790;
        drawText(options.title, { font: "F2", size: 10, x: LEFT, spacing: 16 });
        y -= 6;
    };

    const commitPage = () => {
        pages.push(commands.join("\n"));
    };

    const nextPage = () => {
        commitPage();
        startPage("body");
    };

    const ensureSpace = (height: number) => {
        if (y - height < BOTTOM + 10) {
            nextPage();
        }
    };

    const para = (text?: string) => {
        if (!text?.trim()) {
            return;
        }

        const blocks = sectionBlocks(text);
        for (const block of blocks) {
            const rows =
                block.type === "bullet"
                    ? wrap(block.text, 76).map((row, index) => `${index === 0 ? "- " : "  "}${row}`)
                    : wrap(block.text, 88);

            ensureSpace(rows.length * 14 + 8);

            for (const row of rows) {
                drawText(row, { font: "F1", size: 10.5 });
            }

            y -= 4;
        }
    };

    const section = (index: number, title: string) => {
        ensureSpace(44);

        addCommand(`0.94 g ${LEFT} ${y - 2} ${RIGHT - LEFT} 18 re f 0 g`);
        drawText(`${String(index).padStart(2, "0")}  ${title.toUpperCase()}`, {
            font: "F2",
            size: 11.5,
            x: LEFT + 8,
            spacing: 18,
        });
        addCommand(`0.78 G ${LEFT} ${y + 6} m ${RIGHT} ${y + 6} l S 0 g`);
        y -= 6;
    };

    startPage("cover");
    para(options.meta);
    para(options.intro);
    y -= 2;

    let sectionIndex = 1;
    for (const entry of options.sections) {
        if (!entry.title?.trim() && !entry.body?.trim()) {
            continue;
        }

        if (entry.title?.trim()) {
            section(sectionIndex, entry.title.trim());
            sectionIndex += 1;
        }
        para(entry.body);
        y -= 2;
    }

    if (options.footer) {
        section(sectionIndex, "Notes and Release Guidance");
        para(options.footer);
    }

    commitPage();
    return makePdf(pages.map((page, index) => `${page}\n${footer(index + 1, pages.length)}`));
}
