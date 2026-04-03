import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const infrastructureLibraryResourceTypeValues = [
    "Book",
    "Journal",
    "EResource",
    "Database",
    "Thesis",
    "Multimedia",
    "Newspaper",
    "RareCollection",
    "Other",
] as const;

export const infrastructureLibraryResourceAccessModeValues = [
    "Print",
    "Digital",
    "Hybrid",
] as const;

export const infrastructureLibraryResourceStatusValues = [
    "Active",
    "Expired",
    "Archived",
    "Planned",
] as const;

export type InfrastructureLibraryResourceType =
    (typeof infrastructureLibraryResourceTypeValues)[number];
export type InfrastructureLibraryResourceAccessMode =
    (typeof infrastructureLibraryResourceAccessModeValues)[number];
export type InfrastructureLibraryResourceStatus =
    (typeof infrastructureLibraryResourceStatusValues)[number];

export interface IInfrastructureLibraryResource extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    resourceType: InfrastructureLibraryResourceType;
    title: string;
    category?: string;
    vendorPublisher?: string;
    accessionNumber?: string;
    isbnIssn?: string;
    copiesCount?: number;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    accessMode: InfrastructureLibraryResourceAccessMode;
    availabilityStatus: InfrastructureLibraryResourceStatus;
    usageCount?: number;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const InfrastructureLibraryResourceSchema =
    new Schema<IInfrastructureLibraryResource>(
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
            resourceType: {
                type: String,
                enum: infrastructureLibraryResourceTypeValues,
                required: true,
                default: "Book",
                index: true,
            },
            title: { type: String, required: true, trim: true },
            category: { type: String, trim: true },
            vendorPublisher: { type: String, trim: true },
            accessionNumber: { type: String, trim: true },
            isbnIssn: { type: String, trim: true },
            copiesCount: { type: Number, min: 0 },
            subscriptionStartDate: { type: Date },
            subscriptionEndDate: { type: Date },
            accessMode: {
                type: String,
                enum: infrastructureLibraryResourceAccessModeValues,
                required: true,
                default: "Print",
                index: true,
            },
            availabilityStatus: {
                type: String,
                enum: infrastructureLibraryResourceStatusValues,
                required: true,
                default: "Active",
                index: true,
            },
            usageCount: { type: Number, min: 0 },
            remarks: { type: String, trim: true },
            documentId: { type: Schema.Types.ObjectId, ref: "Document" },
            displayOrder: { type: Number, required: true, min: 1, default: 1 },
        },
        { timestamps: true, collection: "infrastructure_library_resources" }
    );

InfrastructureLibraryResourceSchema.index(
    { assignmentId: 1, displayOrder: 1, resourceType: 1, title: 1 }
);

const InfrastructureLibraryResource: Model<IInfrastructureLibraryResource> =
    mongoose.models.InfrastructureLibraryResource ||
    mongoose.model<IInfrastructureLibraryResource>(
        "InfrastructureLibraryResource",
        InfrastructureLibraryResourceSchema
    );

export default InfrastructureLibraryResource;
