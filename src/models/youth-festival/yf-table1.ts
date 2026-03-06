import mongoose, { Schema, Document, Model } from "mongoose";

export interface IYfTable1 extends Document {
    participantName: string;
    participantType: string;
    permanentAddress: string;
    mobileNo: string;
    dob: string;
    bloodGroup: string;
    gender: string;
    namesOfCompetition: string[];
    academicYear: string;
    photoURL?: string;
    college: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const YfTable1Schema = new Schema<IYfTable1>(
    {
        participantName: {
            type: String,
            required: [true, "Participant name is required"],
            trim: true,
        },
        participantType: {
            type: String,
            required: [true, "Participant type is required"],
        },
        permanentAddress: {
            type: String,
            required: [true, "Permanent address is required"],
        },
        mobileNo: {
            type: String,
            required: [true, "Mobile number is required"],
        },
        dob: {
            type: String,
            required: [true, "Date of birth is required"],
        },
        bloodGroup: {
            type: String,
            required: [true, "Blood group is required"],
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
        },
        namesOfCompetition: {
            type: [String],
            required: [true, "Competition names are required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        photoURL: {
            type: String,
        },
        college: {
            type: Schema.Types.ObjectId,
            ref: "YfCollege",
            required: [true, "College reference is required"],
        },
    },
    {
        timestamps: true,
        collection: "yftable1s",
    }
);

const YfTable1: Model<IYfTable1> =
    mongoose.models.YfTable1 ||
    mongoose.model<IYfTable1>("YfTable1", YfTable1Schema);

export default YfTable1;
