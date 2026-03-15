import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAcademicYear extends Document {
    yearStart: number;
    yearEnd: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AcademicYearSchema = new Schema<IAcademicYear>(
    {
        yearStart: { type: Number, required: true, min: 1900, index: true },
        yearEnd: { type: Number, required: true, min: 1901, index: true },
        isActive: { type: Boolean, default: false, index: true },
    },
    { timestamps: true, collection: "academic_years" }
);

AcademicYearSchema.index({ yearStart: 1, yearEnd: 1 }, { unique: true });

const AcademicYear: Model<IAcademicYear> =
    mongoose.models.AcademicYear ||
    mongoose.model<IAcademicYear>("AcademicYear", AcademicYearSchema);

export default AcademicYear;
