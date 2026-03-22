import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISkill extends Document {
    name: string;
    category: "Technical" | "SoftSkill" | "Domain" | "Language" | "Other";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SkillSchema = new Schema<ISkill>(
    {
        name: { type: String, required: true, trim: true },
        category: {
            type: String,
            required: true,
            enum: ["Technical", "SoftSkill", "Domain", "Language", "Other"],
            index: true,
        },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "skills" }
);

SkillSchema.index({ name: 1, category: 1 }, { unique: true });
SkillSchema.index({ isActive: 1, name: 1 });

const Skill: Model<ISkill> =
    mongoose.models.Skill ||
    mongoose.model<ISkill>("Skill", SkillSchema);

export default Skill;
