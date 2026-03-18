import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyPbasEntry extends Document {
    pbasFormId: Types.ObjectId;
    pbasRevisionId?: Types.ObjectId;
    indicatorId: Types.ObjectId;
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    claimedScore: number;
    approvedScore?: number;
    evidenceDocumentId?: Types.ObjectId;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyPbasEntrySchema = new Schema<IFacultyPbasEntry>(
    {
        pbasFormId: { type: Schema.Types.ObjectId, ref: "FacultyPbasForm", required: true, index: true },
        pbasRevisionId: { type: Schema.Types.ObjectId, ref: "FacultyPbasRevision", index: true },
        indicatorId: { type: Schema.Types.ObjectId, ref: "PbasIndicatorMaster", required: true, index: true },
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        claimedScore: { type: Number, required: true, default: 0 },
        approvedScore: { type: Number },
        evidenceDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "faculty_pbas_entries" }
);

FacultyPbasEntrySchema.index(
    { pbasFormId: 1, indicatorId: 1 },
    { unique: true, partialFilterExpression: { pbasRevisionId: { $exists: false } } }
);
FacultyPbasEntrySchema.index(
    { pbasRevisionId: 1, indicatorId: 1 },
    { unique: true, partialFilterExpression: { pbasRevisionId: { $exists: true } } }
);
FacultyPbasEntrySchema.index({ facultyId: 1, academicYearId: 1 });

const existingModel = mongoose.models.FacultyPbasEntry as Model<IFacultyPbasEntry> | undefined;

if (existingModel && !existingModel.schema.path("pbasRevisionId")) {
    delete mongoose.models.FacultyPbasEntry;
}

const FacultyPbasEntry: Model<IFacultyPbasEntry> =
    (mongoose.models.FacultyPbasEntry as Model<IFacultyPbasEntry> | undefined) ||
    mongoose.model<IFacultyPbasEntry>("FacultyPbasEntry", FacultyPbasEntrySchema);

export default FacultyPbasEntry;
