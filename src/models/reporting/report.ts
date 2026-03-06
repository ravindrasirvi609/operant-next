import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IReport extends Document {
    type: 'AQAR' | 'NIRF' | 'AcademicAudit' | 'GeneralReport';
    academicYear: string;
    category: string; // e.g., "Criteria 1", "Student Strength"
    title: string;
    data: Schema.Types.Mixed; // Flexible data structure for various metrics
    uploadProof?: string;

    // Relationships
    schoolName: string;
    userId?: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
    {
        type: {
            type: String,
            required: true,
            enum: ['AQAR', 'NIRF', 'AcademicAudit', 'GeneralReport'],
            index: true
        },
        academicYear: { type: String, required: true, index: true },
        category: { type: String, required: true, index: true },
        title: { type: String, required: true },
        data: { type: Schema.Types.Mixed, default: {} },
        uploadProof: { type: String },

        schoolName: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

const Report: Model<IReport> =
    mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;
