import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentResearchProject extends Document {
    studentId: Types.ObjectId;
    title: string;
    guideName?: string;
    startDate?: Date;
    endDate?: Date;
    status?: "Planned" | "Ongoing" | "Completed";
    description?: string;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentResearchProjectSchema = new Schema<IStudentResearchProject>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        title: { type: String, required: true, trim: true },
        guideName: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        status: { type: String, enum: ["Planned", "Ongoing", "Completed"], default: "Ongoing", index: true },
        description: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "research_projects" }
);

StudentResearchProjectSchema.index({ studentId: 1, title: 1 });

const StudentResearchProject: Model<IStudentResearchProject> =
    mongoose.models.StudentResearchProject ||
    mongoose.model<IStudentResearchProject>("StudentResearchProject", StudentResearchProjectSchema);

export default StudentResearchProject;
