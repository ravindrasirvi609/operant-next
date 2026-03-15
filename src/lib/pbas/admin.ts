import { Types } from "mongoose";
import { z } from "zod";

import dbConnect from "@/lib/dbConnect";
import PbasCategoryMaster from "@/models/core/pbas-category-master";
import PbasIndicatorMaster from "@/models/core/pbas-indicator-master";

const categoryCodeSchema = z
    .string()
    .trim()
    .min(1, "Category code is required.")
    .max(2, "Category code must be 1-2 characters.");

export const pbasCategorySchema = z.object({
    categoryCode: categoryCodeSchema,
    categoryName: z.string().trim().min(2, "Category name is required."),
    maxScore: z.coerce.number().min(0),
    displayOrder: z.coerce.number().min(0),
});

export const pbasCategoryUpdateSchema = pbasCategorySchema.partial();

export const pbasIndicatorSchema = z.object({
    categoryId: z.string().trim().min(1, "Category is required."),
    indicatorCode: z.string().trim().min(3, "Indicator code is required."),
    indicatorName: z.string().trim().min(2, "Indicator name is required."),
    description: z.string().trim().optional(),
    maxScore: z.coerce.number().min(0),
    naacCriteriaCode: z.string().trim().optional(),
});

export const pbasIndicatorUpdateSchema = pbasIndicatorSchema.partial();

function normalizeCode(value: string) {
    return value.trim().toUpperCase();
}

export async function getPbasCatalog() {
    await dbConnect();
    const categories = await PbasCategoryMaster.find({})
        .sort({ displayOrder: 1, categoryCode: 1 })
        .lean();
    const indicators = await PbasIndicatorMaster.find({})
        .populate("categoryId", "categoryCode categoryName")
        .sort({ indicatorCode: 1 })
        .lean();

    return { categories, indicators };
}

export async function getPbasCategories() {
    await dbConnect();
    return PbasCategoryMaster.find({})
        .sort({ displayOrder: 1, categoryCode: 1 })
        .lean();
}

export async function createPbasCategory(input: unknown) {
    await dbConnect();
    const data = pbasCategorySchema.parse(input);

    const category = await PbasCategoryMaster.create({
        categoryCode: normalizeCode(data.categoryCode),
        categoryName: data.categoryName.trim(),
        maxScore: data.maxScore,
        displayOrder: data.displayOrder,
    });

    return category;
}

export async function updatePbasCategory(id: string, input: unknown) {
    await dbConnect();
    const data = pbasCategoryUpdateSchema.parse(input);
    const update: Record<string, unknown> = {};

    if (data.categoryCode) {
        update.categoryCode = normalizeCode(data.categoryCode);
    }
    if (data.categoryName) {
        update.categoryName = data.categoryName.trim();
    }
    if (typeof data.maxScore === "number") {
        update.maxScore = data.maxScore;
    }
    if (typeof data.displayOrder === "number") {
        update.displayOrder = data.displayOrder;
    }

    const category = await PbasCategoryMaster.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
    );

    if (!category) {
        throw new Error("PBAS category not found.");
    }

    return category;
}

export async function getPbasIndicators(categoryId?: string) {
    await dbConnect();
    const filter = categoryId ? { categoryId: new Types.ObjectId(categoryId) } : {};
    return PbasIndicatorMaster.find(filter)
        .populate("categoryId", "categoryCode categoryName")
        .sort({ indicatorCode: 1 })
        .lean();
}

export async function createPbasIndicator(input: unknown) {
    await dbConnect();
    const data = pbasIndicatorSchema.parse(input);

    const indicator = await PbasIndicatorMaster.create({
        categoryId: new Types.ObjectId(data.categoryId),
        indicatorCode: normalizeCode(data.indicatorCode),
        indicatorName: data.indicatorName.trim(),
        description: data.description?.trim() || undefined,
        maxScore: data.maxScore,
        naacCriteriaCode: data.naacCriteriaCode?.trim().toUpperCase() || undefined,
    });

    return indicator.populate("categoryId", "categoryCode categoryName");
}

export async function updatePbasIndicator(id: string, input: unknown) {
    await dbConnect();
    const data = pbasIndicatorUpdateSchema.parse(input);
    const update: Record<string, unknown> = {};

    if (data.categoryId) {
        update.categoryId = new Types.ObjectId(data.categoryId);
    }
    if (data.indicatorCode) {
        update.indicatorCode = normalizeCode(data.indicatorCode);
    }
    if (data.indicatorName) {
        update.indicatorName = data.indicatorName.trim();
    }
    if (typeof data.description === "string") {
        update.description = data.description.trim();
    }
    if (typeof data.maxScore === "number") {
        update.maxScore = data.maxScore;
    }
    if (data.naacCriteriaCode) {
        update.naacCriteriaCode = data.naacCriteriaCode.trim().toUpperCase();
    }

    const indicator = await PbasIndicatorMaster.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
    ).populate("categoryId", "categoryCode categoryName");

    if (!indicator) {
        throw new Error("PBAS indicator not found.");
    }

    return indicator;
}
