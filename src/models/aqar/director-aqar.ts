import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDirectorAqar extends Document {
    schoolName: string;
    submitted: string[];
    aqarData: string[];
    createdAt: Date;
    updatedAt: Date;
}

const DirectorAqarSchema = new Schema<IDirectorAqar>(
    {
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        submitted: {
            type: [String],
            default: [],
        },
        aqarData: {
            type: [String],
            required: [true, "AQAR data is required"],
        },
    },
    {
        timestamps: true,
        collection: "directoraqars",
    }
);

const DirectorAqar: Model<IDirectorAqar> =
    mongoose.models.DirectorAqar ||
    mongoose.model<IDirectorAqar>("DirectorAqar", DirectorAqarSchema);

export default DirectorAqar;
