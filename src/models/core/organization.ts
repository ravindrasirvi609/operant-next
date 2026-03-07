import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type OrganizationType = 'University' | 'College' | 'Department' | 'Center' | 'Office';

export interface IOrganization extends Document {
    name: string;
    type: OrganizationType;
    code?: string;
    shortName?: string;
    description?: string;
    parentOrganizationId?: Types.ObjectId;
    parentOrganizationName?: string;
    hierarchyLevel: number;
    universityName?: string;
    collegeName?: string;
    headUserId?: Types.ObjectId;
    headName?: string;
    headTitle?: string;
    headEmail?: string;
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
            enum: ['University', 'College', 'Department', 'Center', 'Office'],
            index: true
        },
        code: { type: String, trim: true },
        shortName: { type: String, trim: true },
        description: { type: String },
        parentOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
        parentOrganizationName: { type: String, trim: true },
        hierarchyLevel: { type: Number, default: 1, index: true },
        universityName: { type: String, trim: true, index: true },
        collegeName: { type: String, trim: true, index: true },
        headUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        headName: { type: String },
        headTitle: { type: String, trim: true },
        headEmail: { type: String, lowercase: true, trim: true },
        email: { type: String, lowercase: true, trim: true },
        phone: { type: String },
        website: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

OrganizationSchema.index({ type: 1, parentOrganizationId: 1, name: 1 });
OrganizationSchema.index({ headUserId: 1, isActive: 1 });

const Organization: Model<IOrganization> =
    mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;
