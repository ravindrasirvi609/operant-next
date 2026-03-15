import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyPatentStatus = "Filed" | "Published" | "Granted";

export interface IFacultyPatent extends Document {
    facultyId: Types.ObjectId;
    title: string;
    patentNumber?: string;
    status: FacultyPatentStatus;
    filingDate?: Date;
    grantDate?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyPatentSchema = new Schema<IFacultyPatent>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        title: { type: String, required: true, trim: true },
        patentNumber: { type: String, trim: true },
        status: {
            type: String,
            required: true,
            enum: ["Filed", "Published", "Granted"],
            default: "Filed",
            index: true,
        },
        filingDate: { type: Date },
        grantDate: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_patents" }
);

FacultyPatentSchema.index({ patentNumber: 1 }, { unique: true, sparse: true });
FacultyPatentSchema.index({ facultyId: 1, title: 1 });

const FacultyPatent: Model<IFacultyPatent> =
    mongoose.models.FacultyPatent ||
    mongoose.model<IFacultyPatent>("FacultyPatent", FacultyPatentSchema);

export default FacultyPatent;
