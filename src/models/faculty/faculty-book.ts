import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyBookType = "Textbook" | "Reference" | "Chapter";

export interface IFacultyBook extends Document {
    facultyId: Types.ObjectId;
    title: string;
    publisher?: string;
    isbn?: string;
    publicationDate?: Date;
    bookType: FacultyBookType;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyBookSchema = new Schema<IFacultyBook>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        title: { type: String, required: true, trim: true },
        publisher: { type: String, trim: true },
        isbn: { type: String, trim: true },
        publicationDate: { type: Date },
        bookType: {
            type: String,
            required: true,
            enum: ["Textbook", "Reference", "Chapter"],
            index: true,
        },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_books" }
);

FacultyBookSchema.index({ isbn: 1 }, { unique: true, sparse: true });
FacultyBookSchema.index({ facultyId: 1, title: 1, publicationDate: 1 });

const FacultyBook: Model<IFacultyBook> =
    mongoose.models.FacultyBook ||
    mongoose.model<IFacultyBook>("FacultyBook", FacultyBookSchema);

export default FacultyBook;
