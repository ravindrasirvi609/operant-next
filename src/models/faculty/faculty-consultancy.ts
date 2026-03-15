import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyConsultancy extends Document {
    facultyId: Types.ObjectId;
    clientName: string;
    projectTitle: string;
    revenueGenerated?: number;
    startDate?: Date;
    endDate?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyConsultancySchema = new Schema<IFacultyConsultancy>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        clientName: { type: String, required: true, trim: true },
        projectTitle: { type: String, required: true, trim: true },
        revenueGenerated: { type: Number, min: 0 },
        startDate: { type: Date },
        endDate: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_consultancy" }
);

FacultyConsultancySchema.index({ facultyId: 1, projectTitle: 1, clientName: 1 });

const FacultyConsultancy: Model<IFacultyConsultancy> =
    mongoose.models.FacultyConsultancy ||
    mongoose.model<IFacultyConsultancy>("FacultyConsultancy", FacultyConsultancySchema);

export default FacultyConsultancy;
