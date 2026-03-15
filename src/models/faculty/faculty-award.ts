import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyAward extends Document {
    facultyId: Types.ObjectId;
    title: string;
    awardingBody?: string;
    awardLevel?: "College" | "State" | "National" | "International";
    awardDate?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyAwardSchema = new Schema<IFacultyAward>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        title: { type: String, required: true, trim: true },
        awardingBody: { type: String, trim: true },
        awardLevel: { type: String, enum: ["College", "State", "National", "International"], index: true },
        awardDate: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_awards" }
);

FacultyAwardSchema.index({ facultyId: 1, title: 1, awardDate: 1 });

const FacultyAward: Model<IFacultyAward> =
    mongoose.models.FacultyAward ||
    mongoose.model<IFacultyAward>("FacultyAward", FacultyAwardSchema);

export default FacultyAward;
