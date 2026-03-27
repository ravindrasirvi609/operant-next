const mongoose = require("mongoose");

function toObjectId(value) {
  return value && mongoose.Types.ObjectId.isValid(String(value))
    ? new mongoose.Types.ObjectId(String(value))
    : null;
}

function uniqueObjectIds(values) {
  const seen = new Set();
  const next = [];

  for (const value of values) {
    const objectId = toObjectId(value);
    if (!objectId) continue;
    const key = objectId.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(objectId);
  }

  return next;
}

function inferAssignmentType(organization) {
  const normalizedName = String(organization.name || "").toLowerCase();
  const normalizedTitle = String(organization.headTitle || "").toLowerCase();

  if (organization.type === "Department") {
    return "HOD";
  }

  if (normalizedName.includes("iqac") || normalizedTitle.includes("iqac")) {
    return "IQAC_COORDINATOR";
  }

  if (normalizedName.includes("principal") || normalizedTitle.includes("principal")) {
    return "PRINCIPAL";
  }

  if (normalizedName.includes("director") || normalizedTitle.includes("director")) {
    return "DIRECTOR";
  }

  if (organization.type === "Office") {
    return "OFFICE_HEAD";
  }

  if (organization.type === "College" || organization.type === "University") {
    return "PRINCIPAL";
  }

  return null;
}

async function backfillLeadershipAssignments(db) {
  const organizations = db.collection("organizations");
  const assignments = db.collection("leadership_assignments");

  const headedOrganizations = await organizations
    .find({
      isActive: true,
      headUserId: { $exists: true, $ne: null },
    })
    .toArray();

  let createdAssignments = 0;

  for (const organization of headedOrganizations) {
    const assignmentType = inferAssignmentType(organization);
    if (!assignmentType) continue;

    const existing = await assignments.findOne({
      userId: organization.headUserId,
      organizationId: organization._id,
      assignmentType,
      isActive: true,
    });

    if (existing) {
      continue;
    }

    await assignments.insertOne({
      userId: organization.headUserId,
      organizationId: organization._id,
      assignmentType,
      title: organization.headTitle || undefined,
      organizationName: organization.name,
      organizationType: organization.type,
      universityName: organization.universityName || undefined,
      collegeName: organization.collegeName || undefined,
      isPrimary: true,
      isActive: true,
      notes: "Backfilled from legacy organization head mapping.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    createdAssignments += 1;
  }

  return { createdAssignments };
}

async function loadFacultyScopeContext(db, facultyIds) {
  const faculties = await db
    .collection("faculty")
    .find({ _id: { $in: facultyIds } })
    .project({ _id: 1, departmentId: 1, institutionId: 1 })
    .toArray();

  const facultyById = new Map(faculties.map((faculty) => [faculty._id.toString(), faculty]));
  const departmentIds = uniqueObjectIds(faculties.map((faculty) => faculty.departmentId));
  const institutionIds = uniqueObjectIds(faculties.map((faculty) => faculty.institutionId));

  const [departments, institutions] = await Promise.all([
    db
      .collection("departments")
      .find({ _id: { $in: departmentIds } })
      .project({ _id: 1, name: 1, organizationId: 1 })
      .toArray(),
    db
      .collection("institutions")
      .find({ _id: { $in: institutionIds } })
      .project({ _id: 1, name: 1, organizationId: 1 })
      .toArray(),
  ]);

  const departmentById = new Map(departments.map((department) => [department._id.toString(), department]));
  const institutionById = new Map(institutions.map((institution) => [institution._id.toString(), institution]));

  const organizationIds = uniqueObjectIds([
    ...departments.map((department) => department.organizationId),
    ...institutions.map((institution) => institution.organizationId),
  ]);

  const organizations = await db
    .collection("organizations")
    .find({ _id: { $in: organizationIds } })
    .project({ _id: 1, name: 1, type: 1, parentOrganizationId: 1, collegeName: 1, universityName: 1 })
    .toArray();

  const organizationById = new Map(organizations.map((organization) => [organization._id.toString(), organization]));

  const parentOrganizationIds = uniqueObjectIds(organizations.map((organization) => organization.parentOrganizationId));
  if (parentOrganizationIds.length) {
    const parentOrganizations = await db
      .collection("organizations")
      .find({ _id: { $in: parentOrganizationIds } })
      .project({ _id: 1, name: 1, type: 1, parentOrganizationId: 1 })
      .toArray();

    for (const organization of parentOrganizations) {
      organizationById.set(organization._id.toString(), organization);
    }
  }

  return { facultyById, departmentById, institutionById, organizationById };
}

function buildScopeSnapshot(context, facultyId) {
  const faculty = context.facultyById.get(facultyId);
  if (!faculty) {
    return null;
  }

  const department = faculty.departmentId
    ? context.departmentById.get(faculty.departmentId.toString())
    : null;
  const institution = faculty.institutionId
    ? context.institutionById.get(faculty.institutionId.toString())
    : null;
  const departmentOrganization = department?.organizationId
    ? context.organizationById.get(department.organizationId.toString())
    : null;
  const institutionOrganization = institution?.organizationId
    ? context.organizationById.get(institution.organizationId.toString())
    : null;
  const collegeOrganization =
    departmentOrganization?.parentOrganizationId &&
    context.organizationById.get(departmentOrganization.parentOrganizationId.toString())?.type === "College"
      ? context.organizationById.get(departmentOrganization.parentOrganizationId.toString())
      : null;

  const scopeOrganizationIds = uniqueObjectIds([
    departmentOrganization?._id,
    collegeOrganization?._id,
    institutionOrganization?._id,
  ]);

  return {
    departmentName: department?.name || undefined,
    collegeName: collegeOrganization?.name || departmentOrganization?.collegeName || undefined,
    universityName: institutionOrganization?.name || institution?.name || departmentOrganization?.universityName || undefined,
    scopeDepartmentId: department?._id || undefined,
    scopeInstitutionId: institution?._id || undefined,
    scopeDepartmentOrganizationId: departmentOrganization?._id || undefined,
    scopeCollegeOrganizationId: collegeOrganization?._id || undefined,
    scopeUniversityOrganizationId: institutionOrganization?._id || undefined,
    scopeOrganizationIds,
  };
}

async function backfillModuleScopes(db, collectionName, stats) {
  const collection = db.collection(collectionName);
  const records = await collection
    .find({ facultyId: { $exists: true, $ne: null } })
    .project({ _id: 1, facultyId: 1 })
    .toArray();

  const facultyIds = uniqueObjectIds(records.map((record) => record.facultyId));
  const context = await loadFacultyScopeContext(db, facultyIds);
  let updated = 0;

  for (const record of records) {
    const snapshot = buildScopeSnapshot(context, record.facultyId.toString());
    if (!snapshot) continue;

    await collection.updateOne(
      { _id: record._id },
      {
        $set: {
          scopeDepartmentId: snapshot.scopeDepartmentId,
          scopeInstitutionId: snapshot.scopeInstitutionId,
          scopeDepartmentOrganizationId: snapshot.scopeDepartmentOrganizationId,
          scopeCollegeOrganizationId: snapshot.scopeCollegeOrganizationId,
          scopeUniversityOrganizationId: snapshot.scopeUniversityOrganizationId,
          scopeOrganizationIds: snapshot.scopeOrganizationIds,
        },
      }
    );

    updated += 1;
  }

  stats[collectionName] = updated;
  return context;
}

async function backfillWorkflowInstances(db) {
  const workflowInstances = db.collection("workflow_instances");
  const moduleCollections = {
    PBAS: db.collection("faculty_pbas_forms"),
    CAS: db.collection("cas_applications"),
    AQAR: db.collection("aqar_applications"),
  };

  const instances = await workflowInstances
    .find({ moduleName: { $in: Object.keys(moduleCollections) } })
    .project({ _id: 1, moduleName: 1, recordId: 1 })
    .toArray();

  let updatedInstances = 0;

  for (const instance of instances) {
    const record = await moduleCollections[instance.moduleName].findOne(
      { _id: toObjectId(instance.recordId) },
      {
        projection: {
          scopeDepartmentId: 1,
          scopeInstitutionId: 1,
          scopeDepartmentOrganizationId: 1,
          scopeCollegeOrganizationId: 1,
          scopeUniversityOrganizationId: 1,
          scopeOrganizationIds: 1,
        },
      }
    );

    if (!record) {
      continue;
    }

    await workflowInstances.updateOne(
      { _id: instance._id },
      {
        $set: {
          scopeDepartmentId: record.scopeDepartmentId || undefined,
          scopeInstitutionId: record.scopeInstitutionId || undefined,
          scopeDepartmentOrganizationId: record.scopeDepartmentOrganizationId || undefined,
          scopeCollegeOrganizationId: record.scopeCollegeOrganizationId || undefined,
          scopeUniversityOrganizationId: record.scopeUniversityOrganizationId || undefined,
          scopeOrganizationIds: record.scopeOrganizationIds || [],
        },
      }
    );

    updatedInstances += 1;
  }

  return { updatedInstances };
}

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const leadership = await backfillLeadershipAssignments(db);
  const scopeStats = {};

  await backfillModuleScopes(db, "faculty_pbas_forms", scopeStats);
  await backfillModuleScopes(db, "cas_applications", scopeStats);
  await backfillModuleScopes(db, "aqar_applications", scopeStats);
  const workflow = await backfillWorkflowInstances(db);

  console.info(
    JSON.stringify(
      {
        ...leadership,
        scopeStats,
        ...workflow,
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
