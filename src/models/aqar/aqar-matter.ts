import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAqarMatter extends Document {
    academicYear: string;
    userType: string;
    matterType: string;
    school?: string;
    matter?: string;
}

const AqarMatterSchema = new Schema<IAqarMatter>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        userType: {
            type: String,
            required: [true, "User type is required"],
        },
        matterType: {
            type: String,
            required: [true, "Matter type is required"],
        },
        school: {
            type: String,
            trim: true,
            index: true,
        },
        matter: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "aqarmatters",
    }
);

const AqarMatter: Model<IAqarMatter> =
    mongoose.models.AqarMatter ||
    mongoose.model<IAqarMatter>("AqarMatter", AqarMatterSchema);

export default AqarMatter;
