import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPublication extends Document {
    title: string;
    type: 'ResearchPaper' | 'Book' | 'BookChapter' | 'ConferencePaper' | 'Article';
    authors: string[];
    journalOrBookName: string;
    publisher?: string;
    year: string;
    issueNo?: string;
    volumeNo?: string;
    pageNumbers?: string;
    issnOrIsbn?: string;
    impactFactor?: string;
    indexing: ('Scopus' | 'WebOfScience' | 'UGC-CARE' | 'PeerReviewed')[];
    link?: string;
    doi?: string;
    uploadProof?: string;

    // Relationships
    userId: Types.ObjectId; // Link to Core/User
    schoolName: string;

    createdAt: Date;
    updatedAt: Date;
}

const PublicationSchema = new Schema<IPublication>(
    {
        title: { type: String, required: true, trim: true },
        type: {
            type: String,
            required: true,
            enum: ['ResearchPaper', 'Book', 'BookChapter', 'ConferencePaper', 'Article'],
            index: true
        },
        authors: { type: [String], default: [] },
        journalOrBookName: { type: String, required: true, trim: true },
        publisher: { type: String },
        year: { type: String, required: true, index: true },
        issueNo: { type: String },
        volumeNo: { type: String },
        pageNumbers: { type: String },
        issnOrIsbn: { type: String },
        impactFactor: { type: String },
        indexing: {
            type: [String],
            enum: ['Scopus', 'WebOfScience', 'UGC-CARE', 'PeerReviewed'],
            default: []
        },
        link: { type: String },
        doi: { type: String },
        uploadProof: { type: String },

        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        schoolName: { type: String, required: true, index: true },
    },
    { timestamps: true }
);

const Publication: Model<IPublication> =
    mongoose.models.Publication || mongoose.model<IPublication>("Publication", PublicationSchema);

export default Publication;
