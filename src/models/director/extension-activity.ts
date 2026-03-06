import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IExtensionActivity extends Document {
    nameOfActivity: string;
    organisingUnit: string;
    nameOfScheme: string;
    yearOfActivity?: string;
    numberOfStudents: number;
    otherUser?: string;
    uploadProof?: string;
    schoolName: string;
    userId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ExtensionActivitySchema = new Schema<IExtensionActivity>(
    {
        nameOfActivity: {
            type: String,
            required: [true, "Activity name is required"],
            trim: true,
        },
        organisingUnit: {
            type: String,
            required: [true, "Organising unit is required"],
            trim: true,
        },
        nameOfScheme: {
            type: String,
            required: [true, "Scheme name is required"],
            trim: true,
        },
        yearOfActivity: {
            type: String,
            index: true,
        },
        numberOfStudents: {
            type: Number,
            required: [true, "Number of students is required"],
            min: [0, "Cannot be negative"],
        },
        otherUser: {
            type: String,
            trim: true,
        },
        uploadProof: {
            type: String,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        collection: "extensionactivitys", // preserving original collection name
    }
);

const ExtensionActivity: Model<IExtensionActivity> =
    mongoose.models.ExtensionActivity ||
    mongoose.model<IExtensionActivity>("ExtensionActivity", ExtensionActivitySchema);

export default ExtensionActivity;
