import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISkillsEnhancement extends Document {
    nameOfCapacityDevelopmentSchemes: string;
    academicYear: string;
    dateOfImplementation?: string;
    numberOfStudentsEnrolled: number;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const SkillsEnhancementSchema = new Schema<ISkillsEnhancement>(
    {
        nameOfCapacityDevelopmentSchemes: {
            type: String,
            required: [true, "Scheme name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        dateOfImplementation: {
            type: String,
        },
        numberOfStudentsEnrolled: {
            type: Number,
            required: [true, "Number of students is required"],
            min: [0, "Cannot be negative"],
        },
        uploadProof: {
            type: String,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "skillsenhancementinitiatives",
    }
);

const SkillsEnhancement: Model<ISkillsEnhancement> =
    mongoose.models.SkillsEnhancement ||
    mongoose.model<ISkillsEnhancement>(
        "SkillsEnhancement",
        SkillsEnhancementSchema
    );

export default SkillsEnhancement;
