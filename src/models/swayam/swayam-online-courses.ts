import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISwayamOnlineCourses extends Document {
    portalName: string;
    offeredOnlineCourses: number;
    onlineCoursesWhichTransferredCredit: number;
    creditsTransferredToTranscript: number;
    academicYear: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SwayamOnlineCoursesSchema = new Schema<ISwayamOnlineCourses>(
    {
        portalName: {
            type: String,
            required: [true, "Portal name is required"],
            trim: true,
        },
        offeredOnlineCourses: {
            type: Number,
            required: [true, "Number of offered online courses is required"],
        },
        onlineCoursesWhichTransferredCredit: {
            type: Number,
            required: [true, "Number of courses with transferred credit is required"],
        },
        creditsTransferredToTranscript: {
            type: Number,
            required: [true, "Credits transferred to transcript is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "swayamdetailsofonlinecourses",
    }
);

const SwayamOnlineCourses: Model<ISwayamOnlineCourses> =
    mongoose.models.SwayamOnlineCourses ||
    mongoose.model<ISwayamOnlineCourses>(
        "SwayamOnlineCourses",
        SwayamOnlineCoursesSchema
    );

export default SwayamOnlineCourses;
