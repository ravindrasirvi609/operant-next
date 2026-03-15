import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IInternship extends Document {
    studentId: Types.ObjectId;
    companyName: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
    stipend?: number;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InternshipSchema = new Schema<IInternship>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        companyName: { type: String, required: true, trim: true },
        role: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        stipend: { type: Number, min: 0 },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "internships" }
);

InternshipSchema.index({ studentId: 1, companyName: 1, startDate: -1 });

const Internship: Model<IInternship> =
    mongoose.models.Internship ||
    mongoose.model<IInternship>("Internship", InternshipSchema);

export default Internship;
