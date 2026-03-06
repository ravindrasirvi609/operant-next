import mongoose, { Schema, Document, Model } from "mongoose";

/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */

export interface IAcfCollege extends Document {
    collegeName: string;
    principalName: string;
    district?: string;
    collegeCode: string;
    email: string;
    address?: string;
    mobile: string;
    programsOffered: string[];
    password: string;
    collegeCodeHash: string;
    isSubmitted: string[];
    createdAt: Date;
    updatedAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const AcfCollegeSchema = new Schema<IAcfCollege>(
    {
        collegeName: {
            type: String,
            required: [true, "College name is required"],
            trim: true,
        },

        principalName: {
            type: String,
            required: [true, "Principal name is required"],
            trim: true,
        },

        district: {
            type: String,
            trim: true,
            default: undefined,
        },

        collegeCode: {
            type: String,
            required: [true, "College code is required"],
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
        },

        address: {
            type: String,
            trim: true,
            default: undefined,
        },

        mobile: {
            type: String,
            required: [true, "Mobile number is required"],
            trim: true,
        },

        programsOffered: {
            type: [String],
            required: [true, "At least one program must be offered"],
            validate: {
                validator: (v: string[]) => v.length > 0,
                message: "programsOffered must contain at least one program",
            },
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            select: false, // never returned by default in queries
        },

        collegeCodeHash: {
            type: String,
            required: [true, "College code hash is required"],
            select: false,
        },

        isSubmitted: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
        collection: "acfcolleges", // preserve the original collection name
    }
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                            */
/* ------------------------------------------------------------------ */

AcfCollegeSchema.index({ email: 1 }, { unique: true });

/* ------------------------------------------------------------------ */
/*  Model (Next.js safe — prevents OverwriteModelError on hot reload)  */
/* ------------------------------------------------------------------ */

const AcfCollege: Model<IAcfCollege> =
    mongoose.models.AcfCollege ||
    mongoose.model<IAcfCollege>("AcfCollege", AcfCollegeSchema);

export default AcfCollege;
