import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgram extends Document {
    name: string;
    code?: string;
    institutionId?: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    startAcademicYearId?: mongoose.Types.ObjectId;
    degreeType: string;
    durationYears: number;
    collegeName?: string;
    level?: 'UG' | 'PG' | 'PhD' | 'Diploma' | 'Certificate';
    type?: 'Regular' | 'SelfFinance' | 'Vocational';
    yearOfIntroduction?: string;
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
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        startAcademicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        degreeType: {
            type: String,
            required: true,
            index: true,
        },
        durationYears: { type: Number, required: true, min: 1 },
        collegeName: { type: String, trim: true, index: true },
        level: { type: String, enum: ['UG', 'PG', 'PhD', 'Diploma', 'Certificate'] },
        type: { type: String, enum: ['Regular', 'SelfFinance', 'Vocational'], default: 'Regular' },
        yearOfIntroduction: { type: String },
        syllabusLink: { type: String },
        revisions: [{
            year: { type: String },
            percentageChange: { type: String },
            link: { type: String },
        }],
        isCBCS: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "programs" }
);

ProgramSchema.index({ departmentId: 1, name: 1 }, { unique: true });
ProgramSchema.index({ departmentId: 1, code: 1 }, { unique: true, sparse: true });
ProgramSchema.index({ institutionId: 1, degreeType: 1 });

const existingProgram = mongoose.models.Program as Model<IProgram> | undefined;
if (existingProgram && !existingProgram.schema.path("startAcademicYearId")) {
    // Ensure hot-reload doesn't keep an older schema without the new path.
    existingProgram.schema.add({
        startAcademicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
    });
}

const Program: Model<IProgram> =
    existingProgram || mongoose.model<IProgram>("Program", ProgramSchema);

export default Program;
