const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const awards = db.collection("awards");
  const skills = db.collection("skills");
  const sports = db.collection("sports");
  const culturalActivities = db.collection("cultural_activities");
  const socialPrograms = db.collection("social_programs");
  const events = db.collection("events");
  const masterData = db.collection("master_data");

  const result = {
    awardsActivated: 0,
    skillsActivated: 0,
    sportsActivated: 0,
    culturalActivitiesActivated: 0,
    socialProgramsActivated: 0,
    eventsActivated: 0,
    deprecatedMasterDataDeactivated: 0,
  };

  result.awardsActivated = (await awards.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } })).modifiedCount;
  result.skillsActivated = (await skills.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } })).modifiedCount;
  result.sportsActivated = (await sports.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } })).modifiedCount;
  result.culturalActivitiesActivated = (await culturalActivities.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } })).modifiedCount;
  result.socialProgramsActivated = (await socialPrograms.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } })).modifiedCount;
  result.eventsActivated = (await events.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } })).modifiedCount;

  result.deprecatedMasterDataDeactivated = (
    await masterData.updateMany(
      {
        category: {
          $in: [
            "university",
            "college",
            "department",
            "award",
            "skill",
            "sport",
            "cultural-activity",
            "event",
            "social-program",
          ],
        },
        isActive: true,
      },
      { $set: { isActive: false } }
    )
  ).modifiedCount;

  console.info(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
