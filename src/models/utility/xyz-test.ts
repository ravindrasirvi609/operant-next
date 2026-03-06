import mongoose, { Schema, Document, Model } from "mongoose";

export interface IXyzTest extends Document {
    name: string;
    course: string;
    className: string;
    rollNo: string;
}

const XyzTestSchema = new Schema<IXyzTest>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
        },
        course: {
            type: String,
            required: [true, "Course is required"],
        },
        className: {
            type: String,
            required: [true, "Class is required"],
        },
        rollNo: {
            type: String,
            required: [true, "Roll number is required"],
        },
    },
    {
        timestamps: true,
        collection: "xyzs",
    }
);

const XyzTest: Model<IXyzTest> =
    mongoose.models.XyzTest ||
    mongoose.model<IXyzTest>("XyzTest", XyzTestSchema);

export default XyzTest;
