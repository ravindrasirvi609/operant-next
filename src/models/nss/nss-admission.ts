import mongoose, { Schema, Document, Model } from "mongoose";

export interface INssAdmission extends Document {
    studentName: string;
    classes: string;
    caste: string;
    category: string;
    nss1Year: number;
    nss2Year: number;
    address: string;
    email: string;
    projectName: string;
    bloodGroup: string;
    dob: string;
    createdAt: Date;
    updatedAt: Date;
}

const NssAdmissionSchema = new Schema<INssAdmission>(
    {
        studentName: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        classes: {
            type: String,
            required: [true, "Class is required"],
        },
        caste: {
            type: String,
            required: [true, "Caste is required"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
        },
        nss1Year: {
            type: Number,
            required: [true, "NSS 1st Year is required"],
        },
        nss2Year: {
            type: Number,
            required: [true, "NSS 2nd Year is required"],
        },
        address: {
            type: String,
            required: [true, "Address is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
            index: true,
        },
        projectName: {
            type: String,
            required: [true, "Project name is required"],
        },
        bloodGroup: {
            type: String,
            required: [true, "Blood group is required"],
        },
        dob: {
            type: String, // Kept as string to match legacy, but could be Date
            required: [true, "Date of birth is required"],
        },
    },
    {
        timestamps: true,
        collection: "nssadmissions",
    }
);

const NssAdmission: Model<INssAdmission> =
    mongoose.models.NssAdmission ||
    mongoose.model<INssAdmission>("NssAdmission", NssAdmissionSchema);

export default NssAdmission;
