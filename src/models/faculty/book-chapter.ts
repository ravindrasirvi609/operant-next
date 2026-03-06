import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IBookChapter extends Document {
    titleOfBook?: string;
    paperTitle?: string;
    chapterTitle: string;
    transType: string;
    titleOfProceeding?: string;
    conName?: string;
    isNat: string;
    publicationYear: string;
    issnNumber: string;
    aff: string;
    publisherName: string;
    type: string;
    year: string;
    proof?: string;
    studentId?: string;
    schoolName?: string;
    guideName?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BookChapterSchema = new Schema<IBookChapter>(
    {
        titleOfBook: {
            type: String,
            trim: true,
        },
        paperTitle: {
            type: String,
            trim: true,
        },
        chapterTitle: {
            type: String,
            default: "-",
        },
        transType: {
            type: String,
            default: "-",
        },
        titleOfProceeding: {
            type: String,
            trim: true,
        },
        conName: {
            type: String,
            trim: true,
        },
        isNat: {
            type: String,
            required: true,
        },
        publicationYear: {
            type: String,
            required: true,
        },
        issnNumber: {
            type: String,
            required: true,
        },
        aff: {
            type: String,
            required: true,
        },
        publisherName: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
        },
        year: {
            type: String,
            required: true,
            index: true,
        },
        proof: {
            type: String,
        },
        studentId: {
            type: String,
        },
        schoolName: {
            type: String,
            trim: true,
            index: true,
        },
        guideName: {
            type: String,
            trim: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "bookandchapters",
    }
);

const BookChapter: Model<IBookChapter> =
    mongoose.models.BookChapter ||
    mongoose.model<IBookChapter>("BookChapter", BookChapterSchema);

export default BookChapter;
