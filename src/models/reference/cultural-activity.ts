import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICulturalActivity extends Document {
    name: string;
    category?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CulturalActivitySchema = new Schema<ICulturalActivity>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, trim: true },
    },
    { timestamps: true, collection: "cultural_activities" }
);

CulturalActivitySchema.index({ name: 1, category: 1 }, { unique: true });

const CulturalActivity: Model<ICulturalActivity> =
    mongoose.models.CulturalActivity ||
    mongoose.model<ICulturalActivity>("CulturalActivity", CulturalActivitySchema);

export default CulturalActivity;
