import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICulturalActivity extends Document {
    name: string;
    category?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CulturalActivitySchema = new Schema<ICulturalActivity>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, trim: true },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "cultural_activities" }
);

CulturalActivitySchema.index({ name: 1, category: 1 }, { unique: true });
CulturalActivitySchema.index({ isActive: 1, name: 1 });

const CulturalActivity: Model<ICulturalActivity> =
    mongoose.models.CulturalActivity ||
    mongoose.model<ICulturalActivity>("CulturalActivity", CulturalActivitySchema);

export default CulturalActivity;
