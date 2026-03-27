export type AcademicYearRange = {
    start: number;
    end: number;
};

export function formatAcademicYearLabel(yearStart?: number, yearEnd?: number) {
    if (!yearStart || !yearEnd) {
        return "";
    }

    return `${yearStart}-${yearEnd}`;
}

export function parseAcademicYearLabel(value?: string | null): AcademicYearRange | null {
    const text = String(value ?? "").trim();
    const match = text.match(/(\d{4})\D+(\d{2,4})/);

    if (!match) {
        return null;
    }

    const start = Number(match[1]);
    const endValue = Number(match[2]);
    const end =
        endValue < 100
            ? Number(`${String(start).slice(0, 2)}${String(endValue).padStart(2, "0")}`)
            : endValue;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
    }

    return { start, end };
}

export function getAcademicYearReportingPeriod(value?: string | null) {
    const parsed = parseAcademicYearLabel(value);

    if (!parsed) {
        return null;
    }

    return {
        fromDate: `${parsed.start}-06-01`,
        toDate: `${parsed.end}-05-31`,
    };
}