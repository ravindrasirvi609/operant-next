import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlacement extends Document {
    nameOfStudentPlaced: string;
    programGraduatedFrom?: string;
    nameOfEmployer: string;
    employerContactDetails: string;
    payPackageAnnum: string;
    academicYear?: string;
    otherUser?: string;
    uploadProof?: string;
    schoolName: string;
    alumniId?: string;
    typeOfPlacement?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PlacementSchema = new Schema<IPlacement>(
    {
        nameOfStudentPlaced: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        programGraduatedFrom: {
            type: String,
            trim: true,
        },
        nameOfEmployer: {
            type: String,
            required: [true, "Employer name is required"],
            trim: true,
        },
        employerContactDetails: {
            type: String,
            required: [true, "Employer contact is required"],
            trim: true,
        },
        payPackageAnnum: {
            type: String,
            required: [true, "Pay package is required"],
        },
        academicYear: {
            type: String,
            index: true,
        },
        otherUser: {
            type: String,
            trim: true,
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
        alumniId: {
            type: String,
            trim: true,
        },
        typeOfPlacement: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "placements",
    }
);

const Placement: Model<IPlacement> =
    mongoose.models.Placement ||
    mongoose.model<IPlacement>("Placement", PlacementSchema);

export default Placement;
