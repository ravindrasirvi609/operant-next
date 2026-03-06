import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScopusWos extends Document {
    type: string;
    scopus: string;
    webOfScience: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const ScopusWosSchema = new Schema<IScopusWos>(
    {
        type: {
            type: String,
            required: [true, "Type is required"],
        },
        scopus: {
            type: String,
            required: [true, "Scopus data is required"],
        },
        webOfScience: {
            type: String,
            required: [true, "Web of Science data is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "iilscopuswebofsciences",
    }
);

const ScopusWos: Model<IScopusWos> =
    mongoose.models.ScopusWos ||
    mongoose.model<IScopusWos>("ScopusWos", ScopusWosSchema);

export default ScopusWos;
