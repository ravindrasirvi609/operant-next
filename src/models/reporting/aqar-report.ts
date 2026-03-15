import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAqarReport extends Document {
    institutionId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    status: "Draft" | "Submitted" | "Approved";
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AqarReportSchema = new Schema<IAqarReport>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        status: {
            type: String,
            required: true,
            enum: ["Draft", "Submitted", "Approved"],
            default: "Draft",
            index: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    },
    { timestamps: true, collection: "aqar_reports" }
);

AqarReportSchema.index({ institutionId: 1, academicYearId: 1 }, { unique: true });

const AqarReport: Model<IAqarReport> =
    mongoose.models.AqarReport ||
    mongoose.model<IAqarReport>("AqarReport", AqarReportSchema);

export default AqarReport;
