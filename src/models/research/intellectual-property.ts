import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IIntellectualProperty extends Document {
    title: string;
    type: 'Patent' | 'EContent' | 'PolicyDocument' | 'Copyright' | 'IndustrialDesign';
    status: 'Published' | 'Granted' | 'UnderReview';
    registrationNo?: string;
    year: string;
    summary?: string;
    link?: string;
    uploadProof?: string;

    // Relationships
    userId: Types.ObjectId;
    schoolName: string;

    createdAt: Date;
    updatedAt: Date;
}

const IntellectualPropertySchema = new Schema<IIntellectualProperty>(
    {
        title: { type: String, required: true, trim: true },
        type: {
            type: String,
            required: true,
            enum: ['Patent', 'EContent', 'PolicyDocument', 'Copyright', 'IndustrialDesign'],
            index: true
        },
        status: {
            type: String,
            enum: ['Published', 'Granted', 'UnderReview'],
            default: 'Published'
        },
        registrationNo: { type: String, trim: true },
        year: { type: String, required: true, index: true },
        summary: { type: String },
        link: { type: String },
        uploadProof: { type: String },

        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        schoolName: { type: String, required: true, index: true },
    },
    { timestamps: true }
);

const IntellectualProperty: Model<IIntellectualProperty> =
    mongoose.models.IntellectualProperty ||
    mongoose.model<IIntellectualProperty>("IntellectualProperty", IntellectualPropertySchema);

export default IntellectualProperty;
