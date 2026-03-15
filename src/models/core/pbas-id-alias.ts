import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPbasIdAlias extends Document {
    legacyPbasId: Types.ObjectId;
    canonicalPbasId: Types.ObjectId;
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PbasIdAliasSchema = new Schema<IPbasIdAlias>(
    {
        legacyPbasId: { type: Schema.Types.ObjectId, required: true },
        canonicalPbasId: { type: Schema.Types.ObjectId, required: true },
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    },
    { timestamps: true, collection: "pbas_id_aliases" }
);

PbasIdAliasSchema.index({ legacyPbasId: 1 }, { unique: true });
PbasIdAliasSchema.index({ canonicalPbasId: 1 });
PbasIdAliasSchema.index({ facultyId: 1, academicYearId: 1 });

const PbasIdAlias: Model<IPbasIdAlias> =
    mongoose.models.PbasIdAlias ||
    mongoose.model<IPbasIdAlias>("PbasIdAlias", PbasIdAliasSchema);

export default PbasIdAlias;
