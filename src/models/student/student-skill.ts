import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentSkill extends Document {
    studentId: Types.ObjectId;
    skillId: Types.ObjectId;
    provider?: string;
    startDate?: Date;
    endDate?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSkillSchema = new Schema<IStudentSkill>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
        provider: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "student_skills" }
);

StudentSkillSchema.index({ studentId: 1, skillId: 1, provider: 1 });

const StudentSkill: Model<IStudentSkill> =
    mongoose.models.StudentSkill ||
    mongoose.model<IStudentSkill>("StudentSkill", StudentSkillSchema);

export default StudentSkill;
