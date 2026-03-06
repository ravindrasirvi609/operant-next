import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlacementHeNirf extends Document {
    intakeCount: number;
    admittedCount: number;
    lateralEntryCount: number;
    academicYear: string;
    graduatingCount: number;
    placedCount: number;
    medianSalary: number;
    salaryInWords?: string;
    heStudentsCount: number;
    school: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
}

const PlacementHeNirfSchema = new Schema<IPlacementHeNirf>(
    {
        intakeCount: {
            type: Number,
            required: [true, "Intake count is required"],
        },
        admittedCount: {
            type: Number,
            required: [true, "Admitted count is required"],
        },
        lateralEntryCount: {
            type: Number,
            default: 0,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        graduatingCount: {
            type: Number,
            required: [true, "Graduating count is required"],
        },
        placedCount: {
            type: Number,
            required: [true, "Placed count is required"],
        },
        medianSalary: {
            type: Number,
            required: [true, "Median salary is required"],
        },
        salaryInWords: {
            type: String,
        },
        heStudentsCount: {
            type: Number,
            required: [true, "Higher Education students count is required"],
        },
        school: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        type: {
            type: String,
            required: [true, "Program type is required"],
        },
    },
    {
        timestamps: true,
        collection: "placementhenirfs", // normalized from PlacemntAndHEForPriv3Year
    }
);

const PlacementHeNirf: Model<IPlacementHeNirf> =
    mongoose.models.PlacementHeNirf ||
    mongoose.model<IPlacementHeNirf>("PlacementHeNirf", PlacementHeNirfSchema);

export default PlacementHeNirf;
