import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInstitution extends Document {
    organizationId?: mongoose.Types.ObjectId;
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    email?: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
}

const InstitutionSchema = new Schema<IInstitution>(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        name: { type: String, required: true, trim: true },
        code: { type: String, trim: true },
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
    },
    { timestamps: true, collection: "institutions" }
);

InstitutionSchema.index({ name: 1 }, { unique: true });
InstitutionSchema.index({ code: 1 }, { unique: true, sparse: true });

const Institution: Model<IInstitution> =
    mongoose.models.Institution ||
    mongoose.model<IInstitution>("Institution", InstitutionSchema);

export default Institution;
