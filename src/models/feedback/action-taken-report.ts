import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActionTakenReport extends Document {
    schoolName: string;
    academicYear: string;
    submitted: boolean;
    student?: string;
    teacher?: string;
    alumni?: string;
    employer?: string;
    parent?: string;
    expert?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ActionTakenReportSchema = new Schema<IActionTakenReport>(
    {
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        submitted: {
            type: Boolean,
            default: false,
        },
        student: {
            type: String,
        },
        teacher: {
            type: String,
        },
        alumni: {
            type: String,
        },
        employer: {
            type: String,
        },
        parent: {
            type: String,
        },
        expert: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "actiontakenreports",
    }
);

const ActionTakenReport: Model<IActionTakenReport> =
    mongoose.models.ActionTakenReport ||
    mongoose.model<IActionTakenReport>("ActionTakenReport", ActionTakenReportSchema);

export default ActionTakenReport;
