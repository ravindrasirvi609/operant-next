import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAlumniUser extends Document {
    salutation: string;
    photoURL: string;
    name: string;
    email: string;
    address?: string;
    dob?: string;
    doCompleted?: string;
    doStarted?: string;
    mobile: string;
    programGraduated: string[];
    schoolName: string;
    country?: string;
    cast?: string;
    abcNo?: string;
    religion?: string;
    gender: string;
    password?: string;
    stuExtraInfo?: any;
    Upload_Proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AlumniUserSchema = new Schema<IAlumniUser>(
    {
        salutation: {
            type: String,
            required: [true, "Salutation is required"],
        },
        photoURL: {
            type: String,
            required: [true, "Photo URL is required"],
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        dob: {
            type: String,
        },
        doCompleted: {
            type: String,
        },
        doStarted: {
            type: String,
        },
        mobile: {
            type: String,
            required: [true, "Mobile number is required"],
        },
        programGraduated: {
            type: [String],
            default: [],
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        country: {
            type: String,
            trim: true,
        },
        cast: {
            type: String,
            trim: true,
        },
        abcNo: {
            type: String,
            trim: true,
        },
        religion: {
            type: String,
            trim: true,
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
        stuExtraInfo: {
            type: Schema.Types.Mixed,
        },
        Upload_Proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "alumniUsers", // preserving original collection name
    }
);

const AlumniUser: Model<IAlumniUser> =
    mongoose.models.AlumniUser ||
    mongoose.model<IAlumniUser>("AlumniUser", AlumniUserSchema);

export default AlumniUser;
