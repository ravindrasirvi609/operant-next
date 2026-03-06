import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFacultyUser extends Document {
    salutation: string;
    photoURL: string;
    username: string;
    specialization?: string;
    name: string;
    email: string;
    promotionDate?: string;
    gradePay?: string;
    address?: string;
    mobile?: string;
    dob?: string;
    racDate?: string;
    cast?: string;
    designation: string;
    department: string;
    gender: string;
    orcidId?: string;
    scopusId?: string;
    researcherId?: string;
    googleScholarId?: string;
    personalWebsiteLink?: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyUserSchema = new Schema<IFacultyUser>(
    {
        salutation: {
            type: String,
            required: [true, "Salutation is required"],
        },
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
        specialization: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        promotionDate: {
            type: String,
        },
        gradePay: {
            type: String,
        },
        address: {
            type: String,
            trim: true,
        },
        mobile: {
            type: String,
            trim: true,
        },
        dob: {
            type: String,
        },
        racDate: {
            type: String,
        },
        cast: {
            type: String,
        },
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        department: {
            type: String,
            required: [true, "Department is required"],
            trim: true,
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
            enum: ["Male", "Female", "Other"],
        },
        orcidId: {
            type: String,
        },
        scopusId: {
            type: String,
        },
        researcherId: {
            type: String,
        },
        googleScholarId: {
            type: String,
        },
        personalWebsiteLink: {
            type: String,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
    },
    {
        timestamps: true,
        collection: "users", // preserving original collection name
    }
);

const FacultyUser: Model<IFacultyUser> =
    mongoose.models.FacultyUser ||
    mongoose.model<IFacultyUser>("FacultyUser", FacultyUserSchema);

export default FacultyUser;
