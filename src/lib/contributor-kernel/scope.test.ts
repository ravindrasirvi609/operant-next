import { toWorkflowSubjectScope } from "@/lib/contributor-kernel/scope";

describe("toWorkflowSubjectScope", () => {
    it("stringifies ObjectId-like ids and passes through names", () => {
        const scope = toWorkflowSubjectScope({
            scopeDepartmentName: "Physics",
            scopeCollegeName: "Science College",
            scopeUniversityName: "State University",
            scopeDepartmentId: { toString: () => "dept-1" },
            scopeInstitutionId: { toString: () => "inst-1" },
            scopeOrganizationIds: [{ toString: () => "org-1" }, { toString: () => "org-2" }],
        });

        expect(scope).toMatchObject({
            subjectDepartmentName: "Physics",
            subjectCollegeName: "Science College",
            subjectUniversityName: "State University",
            subjectDepartmentId: "dept-1",
            subjectInstitutionId: "inst-1",
            subjectOrganizationIds: ["org-1", "org-2"],
        });
    });

    it("treats empty-string names as undefined", () => {
        const scope = toWorkflowSubjectScope({ scopeDepartmentName: "", scopeCollegeName: "" });
        expect(scope.subjectDepartmentName).toBeUndefined();
        expect(scope.subjectCollegeName).toBeUndefined();
    });

    it("defaults a missing organization-id list to an empty array", () => {
        expect(toWorkflowSubjectScope({}).subjectOrganizationIds).toEqual([]);
    });

    it("leaves absent optional ids undefined", () => {
        const scope = toWorkflowSubjectScope({ scopeDepartmentId: { toString: () => "d" } });
        expect(scope.subjectDepartmentId).toBe("d");
        expect(scope.subjectInstitutionId).toBeUndefined();
        expect(scope.subjectCollegeOrganizationId).toBeUndefined();
    });
});
