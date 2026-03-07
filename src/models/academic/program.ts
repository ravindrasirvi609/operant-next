import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgram extends Document {
    name: string;
    code?: string;
    collegeName: string;
    level: 'UG' | 'PG' | 'PhD' | 'Diploma' | 'Certificate';
    type: 'Regular' | 'SelfFinance' | 'Vocational';
    yearOfIntroduction: string;
    syllabusLink?: string;
    revisions: {
        year: string;
        percentageChange: string;
        link?: string;
    }[];
    isCBCS: boolean;
    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const ProgramSchema = new Schema<IProgram>(
    {
        name: { type: String, required: true, trim: true },
        code: { type: String, trim: true },
        collegeName: { type: String, required: true, index: true },
        level: { type: String, enum: ['UG', 'PG', 'PhD', 'Diploma', 'Certificate'], required: true },
        type: { type: String, enum: ['Regular', 'SelfFinance', 'Vocational'], default: 'Regular' },
        yearOfIntroduction: { type: String, required: true },
        syllabusLink: { type: String },
        revisions: [{
            year: { type: String },
            percentageChange: { type: String },
            link: { type: String },
        }],
        isCBCS: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Program: Model<IProgram> =
    mongoose.models.Program || mongoose.model<IProgram>("Program", ProgramSchema);

export default Program;
