import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrganization extends Document {
    name: string;
    type: 'School' | 'Department' | 'Center' | 'Office';
    shortName?: string;
    description?: string;
    headName?: string;
    email?: string;
    phone?: string;
    website?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
    {
        name: { type: String, required: true, trim: true, unique: true },
        type: {
            type: String,
            required: true,
            enum: ['School', 'Department', 'Center', 'Office'],
            index: true
        },
        shortName: { type: String, trim: true },
        description: { type: String },
        headName: { type: String },
        email: { type: String, lowercase: true, trim: true },
        phone: { type: String },
        website: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Organization: Model<IOrganization> =
    mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;
