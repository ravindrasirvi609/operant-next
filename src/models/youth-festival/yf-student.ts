import mongoose, { Schema, Document, Model } from "mongoose";

export interface IYfStudent extends Document {
    participantName: string;
    permanentAddress: string;
    mobileNo: string;
    gender: string;
    dob: string;
    age: string;
    bloodGroup: string;
    academicYear: string;
    photoURL?: string;
    competitions?: mongoose.Types.ObjectId[];
    college: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const YfStudentSchema = new Schema<IYfStudent>(
    {
        participantName: {
            type: String,
            required: [true, "Participant name is required"],
            trim: true,
        },
        permanentAddress: {
            type: String,
            required: [true, "Permanent address is required"],
        },
        mobileNo: {
            type: String,
            required: [true, "Mobile number is required"],
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
        },
        dob: {
            type: String,
            required: [true, "Date of birth is required"],
        },
        age: {
            type: String,
            required: [true, "Age is required"],
        },
        bloodGroup: {
            type: String,
            required: [true, "Blood group is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        photoURL: {
            type: String,
        },
        competitions: [
            {
                type: Schema.Types.ObjectId,
                ref: "YfCompetition",
            },
        ],
        college: {
            type: Schema.Types.ObjectId,
            ref: "YfCollege",
            required: [true, "College reference is required"],
        },
    },
    {
        timestamps: true,
        collection: "yfstudents",
    }
);

const YfStudent: Model<IYfStudent> =
    mongoose.models.YfStudent ||
    mongoose.model<IYfStudent>("YfStudent", YfStudentSchema);

export default YfStudent;
