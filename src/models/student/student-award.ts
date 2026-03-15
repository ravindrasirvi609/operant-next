import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentAward extends Document {
    studentId: Types.ObjectId;
    awardId: Types.ObjectId;
    awardDate?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentAwardSchema = new Schema<IStudentAward>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        awardId: { type: Schema.Types.ObjectId, ref: "Award", required: true, index: true },
        awardDate: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "student_awards" }
);

StudentAwardSchema.index({ studentId: 1, awardId: 1, awardDate: 1 }, { unique: true, sparse: true });

const StudentAward: Model<IStudentAward> =
    mongoose.models.StudentAward ||
    mongoose.model<IStudentAward>("StudentAward", StudentAwardSchema);

export default StudentAward;
