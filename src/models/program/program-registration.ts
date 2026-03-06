import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgramRegistration extends Document {
    response: string;
    program: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ProgramRegistrationSchema = new Schema<IProgramRegistration>(
    {
        response: {
            type: String,
            required: [true, "Response is required"],
        },
        program: {
            type: Schema.Types.ObjectId,
            required: [true, "Program reference is required"],
            ref: "Program",
        },
    },
    {
        timestamps: true,
        collection: "programregistrations",
    }
);

const ProgramRegistration: Model<IProgramRegistration> =
    mongoose.models.ProgramRegistration ||
    mongoose.model<IProgramRegistration>(
        "ProgramRegistration",
        ProgramRegistrationSchema
    );

export default ProgramRegistration;
