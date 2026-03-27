import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IReportingStatus extends Document {
    reportType: 'AQAR' | 'NIRF';
    academicYearId?: Types.ObjectId;
    academicYear: string;
    collegeName: string;
    completedSections: string[];
    isLocked: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const ReportingStatusSchema = new Schema<IReportingStatus>(
    {
        reportType: { type: String, enum: ['AQAR', 'NIRF'], required: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', index: true },
        academicYear: { type: String, required: true },
        collegeName: { type: String, required: true, index: true },
        completedSections: { type: [String], default: [] },
        isLocked: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

ReportingStatusSchema.index({ reportType: 1, academicYearId: 1, collegeName: 1 }, { sparse: true });
ReportingStatusSchema.index({ reportType: 1, academicYear: 1, collegeName: 1 });

const ReportingStatus: Model<IReportingStatus> =
    mongoose.models.ReportingStatus ||
    mongoose.model<IReportingStatus>("ReportingStatus", ReportingStatusSchema);

export default ReportingStatus;
