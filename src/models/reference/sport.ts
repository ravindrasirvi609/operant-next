import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISport extends Document {
    sportName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SportSchema = new Schema<ISport>(
    {
        sportName: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "sports" }
);

SportSchema.index({ sportName: 1 }, { unique: true });
SportSchema.index({ isActive: 1, sportName: 1 });

const Sport: Model<ISport> =
    mongoose.models.Sport ||
    mongoose.model<ISport>("Sport", SportSchema);

export default Sport;
