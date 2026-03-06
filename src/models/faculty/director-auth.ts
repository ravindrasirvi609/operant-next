import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDirectorAuth extends Document {
    username: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DirectorAuthSchema = new Schema<IDirectorAuth>(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
    },
    {
        timestamps: true,
        collection: "directors", // preserving original collection name
    }
);

const DirectorAuth: Model<IDirectorAuth> =
    mongoose.models.DirectorAuth ||
    mongoose.model<IDirectorAuth>("DirectorAuth", DirectorAuthSchema);

export default DirectorAuth;
