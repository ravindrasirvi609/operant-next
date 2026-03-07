import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { masterDataSchema, masterDataUpdateSchema } from "@/lib/admin/validators";
import MasterData from "@/models/core/master-data";

export const masterDataCategories = [
    {
        id: "college",
        label: "Colleges",
        description: "Top-level college or campus entities used across the UMIS tenant.",
    },
    {
        id: "school",
        label: "Schools",
        description: "Academic schools or faculties under a college.",
    },
    {
        id: "department",
        label: "Departments",
        description: "Departments mapped to schools and used in user onboarding.",
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
];

export const masterDataCategoryIds = masterDataCategories.map((item) => item.id);

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

    const category = slugify(input.category);
    const key = slugify(input.code?.trim() || input.label);

    const adminObjectId = new Types.ObjectId(adminUserId);

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
        item.category = slugify(input.category);
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
