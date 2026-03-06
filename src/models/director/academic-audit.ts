import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAcademicAudit extends Document {
    schoolName: string;
    submitted: string[];
    aaaData: string[];
    createdAt: Date;
    updatedAt: Date;
}

const AcademicAuditSchema = new Schema<IAcademicAudit>(
    {
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        submitted: {
            type: [String],
            default: [],
        },
        aaaData: {
            type: [String],
            required: [true, "AAA data is required"],
        },
    },
    {
        timestamps: true,
        collection: "academicaudits",
    }
);

const AcademicAudit: Model<IAcademicAudit> =
    mongoose.models.AcademicAudit ||
    mongoose.model<IAcademicAudit>("AcademicAudit", AcademicAuditSchema);

export default AcademicAudit;
