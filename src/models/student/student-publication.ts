import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentPublication extends Document {
    studentId: Types.ObjectId;
    title: string;
    journalName?: string;
    publisher?: string;
    publicationType?: "Journal" | "Conference" | "Book";
    publicationDate?: Date;
    doi?: string;
    indexedIn?: string;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentPublicationSchema = new Schema<IStudentPublication>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        title: { type: String, required: true, trim: true },
        journalName: { type: String, trim: true },
        publisher: { type: String, trim: true },
        publicationType: { type: String, enum: ["Journal", "Conference", "Book"], index: true },
        publicationDate: { type: Date },
        doi: { type: String, trim: true },
        indexedIn: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "student_publications" }
);

StudentPublicationSchema.index({ studentId: 1, publicationDate: -1 });

const StudentPublication: Model<IStudentPublication> =
    mongoose.models.StudentPublication ||
    mongoose.model<IStudentPublication>("StudentPublication", StudentPublicationSchema);

export default StudentPublication;
