import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPublicationCitation extends Document {
    citationData: Record<string, any>;
    year: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PublicationCitationSchema = new Schema<IPublicationCitation>(
    {
        citationData: {
            type: Object,
            required: [true, "Citation data is required"],
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
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
        collection: "publicationcitations",
    }
);

const PublicationCitation: Model<IPublicationCitation> =
    mongoose.models.PublicationCitation ||
    mongoose.model<IPublicationCitation>(
        "PublicationCitation",
        PublicationCitationSchema
    );

export default PublicationCitation;
