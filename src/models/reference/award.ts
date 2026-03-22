import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAward extends Document {
    title: string;
    category?: string;
    organizingBody?: string;
    level?: "College" | "State" | "National" | "International";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AwardSchema = new Schema<IAward>(
    {
        title: { type: String, required: true, trim: true },
        category: { type: String, trim: true },
        organizingBody: { type: String, trim: true },
        level: { type: String, enum: ["College", "State", "National", "International"] },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "awards" }
);

AwardSchema.index({ title: 1, organizingBody: 1, level: 1 }, { unique: true, sparse: true });
AwardSchema.index({ isActive: 1, title: 1 });

const Award: Model<IAward> =
    mongoose.models.Award ||
    mongoose.model<IAward>("Award", AwardSchema);

export default Award;
