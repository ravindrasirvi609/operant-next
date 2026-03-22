const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const organizations = db.collection("organizations");
  const institutions = db.collection("institutions");
  const departments = db.collection("departments");

  const institutionDocs = await institutions.find({}).toArray();
  let linkedInstitutions = 0;
  let linkedDepartments = 0;

  for (const institution of institutionDocs) {
    const existingOrganization =
      (institution.organizationId &&
        (await organizations.findOne({ _id: institution.organizationId }))) ||
      (await organizations.findOne({
        type: "University",
        name: institution.name,
      }));

    const organizationId =
      existingOrganization?._id ||
      (
        await organizations.insertOne({
          name: institution.name,
          type: "University",
          code: institution.code || undefined,
          hierarchyLevel: 1,
          universityName: institution.name,
          email: institution.email || undefined,
          phone: institution.phone || undefined,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ).insertedId;

    await institutions.updateOne(
      { _id: institution._id },
      {
        $set: {
          organizationId,
          code: institution.code || undefined,
          email: institution.email || undefined,
          phone: institution.phone || undefined,
        },
      }
    );
    linkedInstitutions += 1;

    const departmentDocs = await departments
      .find({ institutionId: institution._id })
      .toArray();

    for (const department of departmentDocs) {
      const existingDepartmentOrganization =
        (department.organizationId &&
          (await organizations.findOne({ _id: department.organizationId }))) ||
        (await organizations.findOne({
          type: "Department",
          name: department.name,
          universityName: institution.name,
        }));

      const departmentOrganizationId =
        existingDepartmentOrganization?._id ||
        (
          await organizations.insertOne({
            name: department.name,
            type: "Department",
            code: department.code || undefined,
            parentOrganizationId: organizationId,
            parentOrganizationName: institution.name,
            hierarchyLevel: 2,
            universityName: institution.name,
            headName: department.hodName || undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ).insertedId;

      await departments.updateOne(
        { _id: department._id },
        {
          $set: {
            organizationId: departmentOrganizationId,
            institutionId: institution._id,
            code: department.code || undefined,
            hodName: department.hodName || undefined,
          },
        }
      );

      linkedDepartments += 1;
    }
  }

  console.info(
    JSON.stringify(
      {
        linkedInstitutions,
        linkedDepartments,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
