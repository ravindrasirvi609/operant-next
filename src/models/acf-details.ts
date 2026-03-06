import mongoose, { Schema, Document, Model, Types } from "mongoose";

/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */

export interface IAcfDetails extends Document {
    collegeCode: string;
    programName: string;
    academicYear: string;
    collegeId: Types.ObjectId;
    courseName: number;
    subjectFees: number;
    annualConsultingFees: number;
    proposalFees: number;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const AcfDetailsSchema = new Schema<IAcfDetails>(
    {
        collegeCode: {
            type: String,
            required: [true, "College code is required"],
            uppercase: true,
            trim: true,
            index: true,
        },

        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },

        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            trim: true,
        },

        collegeId: {
            type: Schema.Types.ObjectId,
            required: [true, "College reference is required"],
            ref: "AcfCollege",
            index: true,
        },

        courseName: {
            type: Number,
            required: [true, "Course name is required"],
        },

        subjectFees: {
            type: Number,
            required: [true, "Subject fees are required"],
            min: [0, "Subject fees cannot be negative"],
        },

        annualConsultingFees: {
            type: Number,
            required: [true, "Annual consulting fees are required"],
            min: [0, "Annual consulting fees cannot be negative"],
        },

        proposalFees: {
            type: Number,
            required: [true, "Proposal fees are required"],
            min: [0, "Proposal fees cannot be negative"],
        },

        proof: {
            type: String,
            trim: true,
            default: undefined,
        },
    },
    {
        timestamps: true,
        collection: "acfdetails", // preserve the original collection name
    }
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                            */
/* ------------------------------------------------------------------ */

AcfDetailsSchema.index({ collegeCode: 1, academicYear: 1 });

/* ------------------------------------------------------------------ */
/*  Model (Next.js safe — prevents OverwriteModelError on hot reload)  */
/* ------------------------------------------------------------------ */

const AcfDetails: Model<IAcfDetails> =
    mongoose.models.AcfDetails ||
    mongoose.model<IAcfDetails>("AcfDetails", AcfDetailsSchema);

export default AcfDetails;
