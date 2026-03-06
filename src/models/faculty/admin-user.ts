import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFacultyAdminUser extends Document {
    photoURL: string;
    username: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyAdminUserSchema = new Schema<IFacultyAdminUser>(
    {
        photoURL: {
            type: String,
            required: [true, "Photo URL is required"],
        },
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
        collection: "admins", // preserving original collection name
    }
);

const FacultyAdminUser: Model<IFacultyAdminUser> =
    mongoose.models.FacultyAdminUser ||
    mongoose.model<IFacultyAdminUser>("FacultyAdminUser", FacultyAdminUserSchema);

export default FacultyAdminUser;
