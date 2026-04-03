import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const infrastructureLibraryUsageTypeValues = [
    "ClassroomUtilization",
    "ResearchFacilityUtilization",
    "LibraryFootfall",
    "LibraryIssueReturn",
    "DigitalResourceUsage",
    "AutomationUsage",
    "Other",
] as const;

export type InfrastructureLibraryUsageType =
    (typeof infrastructureLibraryUsageTypeValues)[number];

export interface IInfrastructureLibraryUsage extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    usageType: InfrastructureLibraryUsageType;
    title: string;
    periodLabel?: string;
    usageCount?: number;
    satisfactionScore?: number;
    targetGroup?: string;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const InfrastructureLibraryUsageSchema =
    new Schema<IInfrastructureLibraryUsage>(
        {
            planId: {
                type: Schema.Types.ObjectId,
                ref: "InfrastructureLibraryPlan",
                required: true,
                index: true,
            },
            assignmentId: {
                type: Schema.Types.ObjectId,
                ref: "InfrastructureLibraryAssignment",
                required: true,
                index: true,
            },
            usageType: {
                type: String,
                enum: infrastructureLibraryUsageTypeValues,
                required: true,
                default: "LibraryFootfall",
                index: true,
            },
            title: { type: String, required: true, trim: true },
            periodLabel: { type: String, trim: true },
            usageCount: { type: Number, min: 0 },
            satisfactionScore: { type: Number, min: 0, max: 5 },
            targetGroup: { type: String, trim: true },
            remarks: { type: String, trim: true },
            documentId: { type: Schema.Types.ObjectId, ref: "Document" },
            displayOrder: { type: Number, required: true, min: 1, default: 1 },
        },
        { timestamps: true, collection: "infrastructure_library_usage" }
    );

InfrastructureLibraryUsageSchema.index(
    { assignmentId: 1, displayOrder: 1, usageType: 1, title: 1 }
);

const InfrastructureLibraryUsage: Model<IInfrastructureLibraryUsage> =
    mongoose.models.InfrastructureLibraryUsage ||
    mongoose.model<IInfrastructureLibraryUsage>(
        "InfrastructureLibraryUsage",
        InfrastructureLibraryUsageSchema
    );

export default InfrastructureLibraryUsage;
