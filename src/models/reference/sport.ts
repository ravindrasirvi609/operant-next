import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISport extends Document {
    sportName: string;
    createdAt: Date;
    updatedAt: Date;
}

const SportSchema = new Schema<ISport>(
    {
        sportName: { type: String, required: true, trim: true },
    },
    { timestamps: true, collection: "sports" }
);

SportSchema.index({ sportName: 1 }, { unique: true });

const Sport: Model<ISport> =
    mongoose.models.Sport ||
    mongoose.model<ISport>("Sport", SportSchema);

export default Sport;
