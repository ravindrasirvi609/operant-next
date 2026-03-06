import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRegistration extends Document {
    name: string;
    idObject: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        idObject: {
            type: Object,
            required: [true, "ID Object is required"],
        },
    },
    {
        timestamps: true,
        collection: "isregistrations", // preserving original collection name
    }
);

const Registration: Model<IRegistration> =
    mongoose.models.Registration ||
    mongoose.model<IRegistration>("Registration", RegistrationSchema);

export default Registration;
