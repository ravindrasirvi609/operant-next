import { AlumniProfileForm } from "@/components/alumni/alumni-profile-form";
import { requireAlumni } from "@/lib/auth/user";
import { getAlumniProfile } from "@/lib/alumni/service";

export default async function AlumniProfilePage() {
    const user = await requireAlumni();
    const { alumni } = await getAlumniProfile(user.id);

    return (
        <AlumniProfileForm
            alumni={{
                firstName: alumni.firstName,
                lastName: alumni.lastName,
                enrollmentNo: alumni.enrollmentNo,
                email: alumni.email,
                mobile: alumni.mobile,
                graduationYear: alumni.graduationYear,
                currentEmployer: alumni.currentEmployer,
                currentDesignation: alumni.currentDesignation,
            }}
        />
    );
}
