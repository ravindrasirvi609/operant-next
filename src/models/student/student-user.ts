import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentUser extends Document {
    isAlumni?: boolean;
    isActiveStudent?: boolean;
    salutation?: string;
    photoURL?: string;
    uploadProof?: string;
    name?: string;
    email?: string;
    address?: string;
    dob?: string;
    mobile?: string;
    programGraduated?: string;
    programEnrolledOn?: string;
    programCompletedOn?: string;
    caste?: string;
    religion?: string;
    country?: string;
    eligibility?: string;
    schoolName?: string;
    currentIn?: string;
    gender?: string;
    password?: string;
    abcNo?: string;
    dateOfCompletion?: string;
    alumniProof?: string;
    researchGuide?: string;
    title?: string;
    dateOfRac?: string;
    receivesFellowship?: string;
    researchGuideId?: string;
    isCreatedByDirector: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const StudentUserSchema = new Schema<IStudentUser>(
    {
        isAlumni: { type: Boolean },
        isActiveStudent: { type: Boolean },
        salutation: { type: String },
        photoURL: { type: String },
        uploadProof: { type: String },
        name: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true, index: true },
        address: { type: String, trim: true },
        dob: { type: String },
        mobile: { type: String },
        programGraduated: { type: String },
        programEnrolledOn: { type: String },
        programCompletedOn: { type: String },
        caste: { type: String },
        religion: { type: String },
        country: { type: String },
        eligibility: { type: String },
        schoolName: { type: String, index: true },
        currentIn: { type: String },
        gender: { type: String },
        password: { type: String, select: false },
        abcNo: { type: String },
        dateOfCompletion: { type: String },
        alumniProof: { type: String },
        researchGuide: { type: String },
        title: { type: String },
        dateOfRac: { type: String },
        receivesFellowship: { type: String },
        researchGuideId: { type: String },
        isCreatedByDirector: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        collection: "studentusers",
    }
);

const StudentUser: Model<IStudentUser> =
    mongoose.models.StudentUser ||
    mongoose.model<IStudentUser>("StudentUser", StudentUserSchema);

export default StudentUser;
