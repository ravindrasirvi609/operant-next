import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IInstitutionalDistinctiveness extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    distinctFeatureTitle: string;
    description?: string;
    impactOnStudents?: string;
    societalImpact?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const InstitutionalDistinctivenessSchema = new Schema<IInstitutionalDistinctiveness>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesAssignment",
            required: true,
            index: true,
        },
        distinctFeatureTitle: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        impactOnStudents: { type: String, trim: true },
        societalImpact: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "institutional_distinctiveness" }
);

InstitutionalDistinctivenessSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    distinctFeatureTitle: 1,
});

const InstitutionalDistinctiveness: Model<IInstitutionalDistinctiveness> =
    mongoose.models.InstitutionalDistinctiveness ||
    mongoose.model<IInstitutionalDistinctiveness>(
        "InstitutionalDistinctiveness",
        InstitutionalDistinctivenessSchema
    );

export default InstitutionalDistinctiveness;
