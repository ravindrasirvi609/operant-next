import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyAdminRole extends Document {
    facultyId: Types.ObjectId;
    roleName: string;
    committeeName?: string;
    academicYearId?: Types.ObjectId;
    responsibilityDescription?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyAdminRoleSchema = new Schema<IFacultyAdminRole>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        roleName: { type: String, required: true, trim: true, index: true },
        committeeName: { type: String, trim: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        responsibilityDescription: { type: String, trim: true },
    },
    { timestamps: true, collection: "faculty_admin_roles" }
);

FacultyAdminRoleSchema.index({ facultyId: 1, roleName: 1, academicYearId: 1, committeeName: 1 }, { unique: true, sparse: true });

const FacultyAdminRole: Model<IFacultyAdminRole> =
    mongoose.models.FacultyAdminRole ||
    mongoose.model<IFacultyAdminRole>("FacultyAdminRole", FacultyAdminRoleSchema);

export default FacultyAdminRole;
