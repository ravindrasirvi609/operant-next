import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFacultyAqar extends Document {
    userId: Types.ObjectId;
    submitted: string[];
    aqarData: string[];
    createdAt: Date;
    updatedAt: Date;
}

const FacultyAqarSchema = new Schema<IFacultyAqar>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: [true, "User reference is required"],
            ref: "User", // Assuming a generic User model exists
            index: true,
        },
        submitted: {
            type: [String],
            default: [],
        },
        aqarData: {
            type: [String],
            required: [true, "AQAR data is required"],
        },
    },
    {
        timestamps: true,
        collection: "facultyaqars",
    }
);

const FacultyAqar: Model<IFacultyAqar> =
    mongoose.models.FacultyAqar ||
    mongoose.model<IFacultyAqar>("FacultyAqar", FacultyAqarSchema);

export default FacultyAqar;
