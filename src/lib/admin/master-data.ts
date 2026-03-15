import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { masterDataSchema, masterDataUpdateSchema } from "@/lib/admin/validators";
import MasterData, { type IMasterData } from "@/models/core/master-data";

type MasterDataInput = import("zod").output<typeof masterDataSchema>;

export type MasterDataBulkFailure = {
    rowNumber: number;
    category?: string;
    label?: string;
    message: string;
};

export type MasterDataBulkResult = {
    created: IMasterData[];
    failed: MasterDataBulkFailure[];
};

export const masterDataCategories = [
    {
        id: "university",
        label: "Universities",
        description: "Top-level university or campus entities used across the UMIS tenant.",
    },
    {
        id: "college",
        label: "Colleges",
        description: "Academic colleges or faculties under a university.",
    },
    {
        id: "department",
        label: "Departments",
        description: "Departments mapped to colleges and used in user onboarding.",
    },
    {
        id: "academic-year",
        label: "Academic Years",
        description: "Selectable academic sessions for reporting and feedback.",
    },
    {
        id: "report-category",
        label: "Report Categories",
        description: "AQAR, NIRF, and internal reporting buckets.",
    },
    {
        id: "event-type",
        label: "Event Types",
        description: "Institutional events and engagement classifications.",
    },
    {
        id: "program-type",
        label: "Program Types",
        description: "Curriculum and offering-level classifications.",
    },
    {
        id: "notification-category",
        label: "Notification Categories",
        description: "Administrative categories for system alerts and notices.",
    },
    {
        id: "office",
        label: "Administrative Offices",
        description: "Non-academic units such as IQAC, Exam, Establishment, PRO, and Placement.",
    },
    {
        id: "award",
        label: "Awards & Achievements",
        description: "Student-facing award and achievement master list used in records.",
    },
    {
        id: "skill",
        label: "Skills & Certifications",
        description: "Skills and certification masters used in student records.",
    },
    {
        id: "sport",
        label: "Sports",
        description: "Sports master list used for student activity records.",
    },
    {
        id: "cultural-activity",
        label: "Cultural Activities",
        description: "Cultural activity master list for student records.",
    },
    {
        id: "event",
        label: "Events",
        description: "Events master list for student participation records.",
    },
    {
        id: "social-program",
        label: "Social Programs",
        description: "Social program master list (NSS, NCC, outreach, etc.).",
    },
];

export const masterDataCategoryIds = masterDataCategories.map((item) => item.id);
const masterDataCategorySet = new Set(masterDataCategoryIds);

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeMetadata(
    metadata: import("zod").infer<typeof masterDataSchema>["metadata"]
) {
    if (!metadata || typeof metadata === "string") {
        return {};
    }

    return metadata;
}

function assertKnownCategory(category: string) {
    if (!masterDataCategorySet.has(category)) {
        throw new Error(
            `Unsupported category "${category}". Use one of: ${masterDataCategoryIds.join(", ")}.`
        );
    }
}

function isDuplicateKeyError(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === 11000
    );
}

function getBulkErrorMessage(error: unknown) {
    if (isDuplicateKeyError(error)) {
        return "Duplicate entry: category + key/code already exists.";
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "Unable to create this row.";
}

function extractBulkRowNumber(rawEntry: unknown, index: number) {
    if (typeof rawEntry === "object" && rawEntry !== null) {
        const rowNumber = (rawEntry as { rowNumber?: unknown; _rowNumber?: unknown })
            .rowNumber;
        const alternateRowNumber = (
            rawEntry as { rowNumber?: unknown; _rowNumber?: unknown }
        )._rowNumber;

        if (typeof rowNumber === "number" && Number.isFinite(rowNumber)) {
            return Math.max(2, Math.floor(rowNumber));
        }

        if (
            typeof alternateRowNumber === "number" &&
            Number.isFinite(alternateRowNumber)
        ) {
            return Math.max(2, Math.floor(alternateRowNumber));
        }
    }

    // Header is row 1, so first payload row defaults to row 2.
    return index + 2;
}

function stripBulkMetaFields(rawEntry: unknown) {
    if (typeof rawEntry !== "object" || rawEntry === null) {
        return rawEntry;
    }

    const rest = {
        ...(rawEntry as Record<string, unknown> & {
            rowNumber?: unknown;
            _rowNumber?: unknown;
        }),
    };
    delete rest.rowNumber;
    delete rest._rowNumber;
    return rest;
}

function getRawString(
    rawEntry: unknown,
    key: "category" | "label"
): string | undefined {
    if (typeof rawEntry !== "object" || rawEntry === null) {
        return undefined;
    }

    const value = (rawEntry as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function insertMasterDataEntry(
    input: MasterDataInput,
    adminObjectId: Types.ObjectId
) {
    const category = slugify(input.category);
    assertKnownCategory(category);

    const key = slugify(input.code?.trim() || input.label);

    const item = await MasterData.create({
        category,
        key,
        label: input.label,
        code: input.code?.trim() || undefined,
        description: input.description?.trim() || undefined,
        parentCategory: input.parentCategory?.trim() || undefined,
        parentKey: input.parentKey?.trim() || undefined,
        metadata: normalizeMetadata(input.metadata),
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        createdBy: adminObjectId,
        updatedBy: adminObjectId,
    });

    return item;
}

export async function getMasterDataMap(categories?: string[]) {
    await dbConnect();

    const filter = categories?.length ? { category: { $in: categories } } : {};
    const items = await MasterData.find(filter).sort({
        category: 1,
        sortOrder: 1,
        label: 1,
    });

    return items.reduce<Record<string, typeof items>>((accumulator, item) => {
        const key = item.category;
        accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
        return accumulator;
    }, {});
}

export async function getActiveMasterDataOptions(categories: string[]) {
    await dbConnect();

    const items = await MasterData.find({
        category: { $in: categories },
        isActive: true,
    }).sort({ category: 1, sortOrder: 1, label: 1 });

    return items.reduce<Record<string, { key: string; label: string; code?: string }[]>>(
        (accumulator, item) => {
            accumulator[item.category] = accumulator[item.category]
                ? [
                      ...accumulator[item.category],
                      { key: item.key, label: item.label, code: item.code },
                  ]
                : [{ key: item.key, label: item.label, code: item.code }];
            return accumulator;
        },
        {}
    );
}

export async function createMasterDataEntry(
    rawInput: unknown,
    adminUserId: string
) {
    const input = masterDataSchema.parse(rawInput);
    await dbConnect();

    const adminObjectId = new Types.ObjectId(adminUserId);
    return insertMasterDataEntry(input, adminObjectId);
}

export async function createMasterDataEntriesBulk(
    rawEntries: unknown,
    adminUserId: string
): Promise<MasterDataBulkResult> {
    if (!Array.isArray(rawEntries)) {
        throw new Error("Bulk payload must provide an entries array.");
    }

    if (!rawEntries.length) {
        throw new Error("Add at least one row in the Excel file before uploading.");
    }

    if (rawEntries.length > 500) {
        throw new Error("Bulk upload supports up to 500 rows per file.");
    }

    await dbConnect();
    const adminObjectId = new Types.ObjectId(adminUserId);

    const created: IMasterData[] = [];
    const failed: MasterDataBulkFailure[] = [];

    for (let index = 0; index < rawEntries.length; index += 1) {
        const rawEntry = rawEntries[index];
        const rowNumber = extractBulkRowNumber(rawEntry, index);
        const sanitizedEntry = stripBulkMetaFields(rawEntry);
        const parsed = masterDataSchema.safeParse(sanitizedEntry);

        if (!parsed.success) {
            failed.push({
                rowNumber,
                category: getRawString(rawEntry, "category"),
                label: getRawString(rawEntry, "label"),
                message: parsed.error.issues[0]?.message ?? "Invalid row data.",
            });
            continue;
        }

        try {
            const item = await insertMasterDataEntry(parsed.data, adminObjectId);
            created.push(item);
        } catch (error) {
            failed.push({
                rowNumber,
                category: getRawString(rawEntry, "category"),
                label: getRawString(rawEntry, "label"),
                message: getBulkErrorMessage(error),
            });
        }
    }

    return { created, failed };
}

export async function updateMasterDataEntry(
    id: string,
    rawInput: unknown,
    adminUserId: string
) {
    const input = masterDataUpdateSchema.parse(rawInput);
    await dbConnect();

    const adminObjectId = new Types.ObjectId(adminUserId);

    const item = await MasterData.findById(id);

    if (!item) {
        throw new Error("Master data entry not found.");
    }

    if (input.category) {
        const category = slugify(input.category);
        assertKnownCategory(category);
        item.category = category;
    }

    if (input.label) {
        item.label = input.label;
        if (!input.code && !item.code) {
            item.key = slugify(input.label);
        }
    }

    if (input.code !== undefined) {
        item.code = input.code || undefined;
        item.key = slugify(input.code || item.label);
    }

    if (input.description !== undefined) {
        item.description = input.description || undefined;
    }

    if (input.parentCategory !== undefined) {
        item.parentCategory = input.parentCategory || undefined;
    }

    if (input.parentKey !== undefined) {
        item.parentKey = input.parentKey || undefined;
    }

    if (input.metadata !== undefined) {
        item.metadata = normalizeMetadata(input.metadata);
    }

    if (input.sortOrder !== undefined) {
        item.sortOrder = input.sortOrder;
    }

    if (input.isActive !== undefined) {
        item.isActive = input.isActive;
    }

    item.updatedBy = adminObjectId;
    await item.save();

    return item;
}
