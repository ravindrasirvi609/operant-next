export const DEGREE_TYPE_CHOICES = [
    { value: "BA", label: "B.A." },
    { value: "BSc", label: "B.Sc." },
    { value: "BCom", label: "B.Com." },
    { value: "BBA", label: "B.B.A." },
    { value: "BCA", label: "B.C.A." },
    { value: "BTech", label: "B.Tech" },
    { value: "MA", label: "M.A." },
    { value: "MSc", label: "M.Sc." },
    { value: "MCom", label: "M.Com." },
    { value: "MBA", label: "M.B.A." },
    { value: "MCA", label: "M.C.A." },
    { value: "MTech", label: "M.Tech" },
    { value: "PhD", label: "Ph.D." },
    { value: "Diploma", label: "Diploma" },
    { value: "Certificate", label: "Certificate" },
    { value: "Other", label: "Other" },
] as const;

export const DEGREE_TYPE_VALUES = DEGREE_TYPE_CHOICES.map((item) => item.value) as [
    (typeof DEGREE_TYPE_CHOICES)[number]["value"],
    ...(typeof DEGREE_TYPE_CHOICES)[number]["value"][],
];

export type DegreeType = (typeof DEGREE_TYPE_VALUES)[number];

const DEGREE_TYPE_ALIASES: Record<string, DegreeType> = {
    ba: "BA",
    "b.a": "BA",
    "b.a.": "BA",
    bsc: "BSc",
    "b.sc": "BSc",
    "b.sc.": "BSc",
    bcom: "BCom",
    "b.com": "BCom",
    "b.com.": "BCom",
    bba: "BBA",
    "b.b.a": "BBA",
    "b.b.a.": "BBA",
    bca: "BCA",
    "b.c.a": "BCA",
    "b.c.a.": "BCA",
    btech: "BTech",
    "b.tech": "BTech",
    "b.tech.": "BTech",
    ma: "MA",
    "m.a": "MA",
    "m.a.": "MA",
    msc: "MSc",
    "m.sc": "MSc",
    "m.sc.": "MSc",
    mcom: "MCom",
    "m.com": "MCom",
    "m.com.": "MCom",
    mba: "MBA",
    "m.b.a": "MBA",
    "m.b.a.": "MBA",
    mca: "MCA",
    "m.c.a": "MCA",
    "m.c.a.": "MCA",
    mtech: "MTech",
    "m.tech": "MTech",
    "m.tech.": "MTech",
    phd: "PhD",
    "ph.d": "PhD",
    "ph.d.": "PhD",
    diploma: "Diploma",
    certificate: "Certificate",
    other: "Other",
};

function normalizeAliasKey(value: string) {
    return value.toLowerCase().trim().replace(/\s+/g, "");
}

export function normalizeDegreeType(value: string): DegreeType | null {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) {
        return null;
    }

    const exactMatch = DEGREE_TYPE_VALUES.find(
        (option) => option.toLowerCase() === normalizedValue.toLowerCase()
    );
    if (exactMatch) {
        return exactMatch;
    }

    const aliasMatch = DEGREE_TYPE_ALIASES[normalizeAliasKey(normalizedValue)];
    return aliasMatch ?? null;
}

export function formatDegreeTypeLabel(value?: string | null) {
    const normalized = value ? normalizeDegreeType(value) : null;
    const fallback = String(value ?? "").trim();
    const selected = normalized ?? (fallback || "Other");
    const option = DEGREE_TYPE_CHOICES.find((item) => item.value === selected);
    return option?.label ?? selected;
}
