import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAlumniAssociation extends Document {
    institutionId: Types.ObjectId;
    name: string;
    isRegistered: boolean;
    registrationDate?: Date;
    isFunctional: boolean;
    description?: string;
    contactPersonName?: string;
    contactEmail?: string;
    website?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AlumniAssociationSchema = new Schema<IAlumniAssociation>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, unique: true, index: true },
        name: { type: String, required: true, trim: true },
        isRegistered: { type: Boolean, required: true, default: false },
        registrationDate: { type: Date },
        isFunctional: { type: Boolean, required: true, default: false },
        description: { type: String, trim: true },
        contactPersonName: { type: String, trim: true },
        contactEmail: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true },
    },
    { timestamps: true, collection: "alumni_associations" }
);

const AlumniAssociation: Model<IAlumniAssociation> =
    mongoose.models.AlumniAssociation ||
    mongoose.model<IAlumniAssociation>("AlumniAssociation", AlumniAssociationSchema);

export default AlumniAssociation;
