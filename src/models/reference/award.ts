import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAward extends Document {
    title: string;
    category?: string;
    organizingBody?: string;
    level?: "College" | "State" | "National" | "International";
    createdAt: Date;
    updatedAt: Date;
}

const AwardSchema = new Schema<IAward>(
    {
        title: { type: String, required: true, trim: true },
        category: { type: String, trim: true },
        organizingBody: { type: String, trim: true },
        level: { type: String, enum: ["College", "State", "National", "International"] },
    },
    { timestamps: true, collection: "awards" }
);

AwardSchema.index({ title: 1, organizingBody: 1, level: 1 }, { unique: true, sparse: true });

const Award: Model<IAward> =
    mongoose.models.Award ||
    mongoose.model<IAward>("Award", AwardSchema);

export default Award;
