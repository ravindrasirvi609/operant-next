import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIctClassroom extends Document {
    roomNumberOrName: string;
    typeOfIctFacility: string;
    academicYear: string;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const IctClassroomSchema = new Schema<IIctClassroom>(
    {
        roomNumberOrName: {
            type: String,
            required: [true, "Room number or name is required"],
            trim: true,
        },
        typeOfIctFacility: {
            type: String,
            required: [true, "Facility type is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
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
    },
    {
        timestamps: true,
        collection: "ictclassrooms",
    }
);

const IctClassroom: Model<IIctClassroom> =
    mongoose.models.IctClassroom ||
    mongoose.model<IIctClassroom>("IctClassroom", IctClassroomSchema);

export default IctClassroom;
