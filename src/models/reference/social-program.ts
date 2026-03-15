import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISocialProgram extends Document {
    name: string;
    type: "NSS" | "NCC" | "Social" | "Extension" | "Other";
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SocialProgramSchema = new Schema<ISocialProgram>(
    {
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            required: true,
            enum: ["NSS", "NCC", "Social", "Extension", "Other"],
            index: true,
        },
        description: { type: String, trim: true },
    },
    { timestamps: true, collection: "social_programs" }
);

SocialProgramSchema.index({ name: 1, type: 1 }, { unique: true });

const SocialProgram: Model<ISocialProgram> =
    mongoose.models.SocialProgram ||
    mongoose.model<ISocialProgram>("SocialProgram", SocialProgramSchema);

export default SocialProgram;
