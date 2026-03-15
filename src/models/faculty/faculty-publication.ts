import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyPublicationType = "Scopus" | "UGC" | "WebOfScience" | "Book";
export type FacultyAuthorPosition = "First" | "Second" | "Corresponding" | "CoAuthor" | "Other";

export interface IFacultyPublication extends Document {
    facultyId: Types.ObjectId;
    title: string;
    journalName?: string;
    publisher?: string;
    publicationType: FacultyPublicationType;
    impactFactor?: number;
    isbnIssn?: string;
    doi?: string;
    publicationDate?: Date;
    indexedIn?: string;
    authorPosition?: FacultyAuthorPosition;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyPublicationSchema = new Schema<IFacultyPublication>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        title: { type: String, required: true, trim: true },
        journalName: { type: String, trim: true },
        publisher: { type: String, trim: true },
        publicationType: {
            type: String,
            required: true,
            enum: ["Scopus", "UGC", "WebOfScience", "Book"],
            index: true,
        },
        impactFactor: { type: Number, min: 0 },
        isbnIssn: { type: String, trim: true },
        doi: { type: String, trim: true },
        publicationDate: { type: Date, index: true },
        indexedIn: { type: String, trim: true },
        authorPosition: {
            type: String,
            enum: ["First", "Second", "Corresponding", "CoAuthor", "Other"],
        },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_publications" }
);

FacultyPublicationSchema.index({ facultyId: 1, title: 1, publicationDate: 1 });
FacultyPublicationSchema.index({ doi: 1 }, { unique: true, sparse: true });

const FacultyPublication: Model<IFacultyPublication> =
    mongoose.models.FacultyPublication ||
    mongoose.model<IFacultyPublication>("FacultyPublication", FacultyPublicationSchema);

export default FacultyPublication;
