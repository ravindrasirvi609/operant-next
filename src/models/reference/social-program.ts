import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISocialProgram extends Document {
    name: string;
    type: "NSS" | "NCC" | "Social" | "Extension" | "Other";
    description?: string;
    isActive: boolean;
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
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "social_programs" }
);

SocialProgramSchema.index({ name: 1, type: 1 }, { unique: true });
SocialProgramSchema.index({ isActive: 1, name: 1 });

const SocialProgram: Model<ISocialProgram> =
    mongoose.models.SocialProgram ||
    mongoose.model<ISocialProgram>("SocialProgram", SocialProgramSchema);

export default SocialProgram;
