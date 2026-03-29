import dbConnect from "@/lib/dbConnect";
import MasterData from "@/models/core/master-data";
import Award from "@/models/reference/award";
import CulturalActivity from "@/models/reference/cultural-activity";
import Event from "@/models/reference/event";
import Skill from "@/models/reference/skill";
import SocialProgram from "@/models/reference/social-program";
import Sport from "@/models/reference/sport";

export type StudentMasterDataType =
    | "awards"
    | "skills"
    | "sports"
    | "events"
    | "cultural"
    | "social";

const categoryMap: Record<StudentMasterDataType, string> = {
    awards: "award",
    skills: "skill",
    sports: "sport",
    events: "event",
    cultural: "cultural-activity",
    social: "social-program",
};

function readMetaString(meta: Record<string, unknown> | undefined, key: string) {
    const value = meta?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function getStudentMasterData(types: StudentMasterDataType[]) {
    await dbConnect();
    const includeAll = types.length === 0;
    const wants = (type: StudentMasterDataType) => includeAll || types.includes(type);

    const requestedCategories = (Object.keys(categoryMap) as StudentMasterDataType[])
        .filter((type) => wants(type))
        .map((type) => categoryMap[type]);

    const [
        items,
        awardsFromReferenceMaster,
        skillsFromReferenceMaster,
        sportsFromReferenceMaster,
        eventsFromReferenceMaster,
        culturalFromReferenceMaster,
        socialFromReferenceMaster,
    ] = await Promise.all([
        requestedCategories.length
            ? MasterData.find({
                  category: { $in: requestedCategories },
                  isActive: true,
              }).sort({ category: 1, sortOrder: 1, label: 1 })
            : Promise.resolve([]),
        wants("awards")
            ? Award.find({ isActive: true }).sort({ title: 1 }).lean()
            : Promise.resolve([]),
        wants("skills")
            ? Skill.find({ isActive: true }).sort({ name: 1 }).lean()
            : Promise.resolve([]),
        wants("sports")
            ? Sport.find({ isActive: true }).sort({ sportName: 1 }).lean()
            : Promise.resolve([]),
        wants("events")
            ? Event.find({ isActive: true }).sort({ title: 1, startDate: -1 }).lean()
            : Promise.resolve([]),
        wants("cultural")
            ? CulturalActivity.find({ isActive: true }).sort({ name: 1 }).lean()
            : Promise.resolve([]),
        wants("social")
            ? SocialProgram.find({ isActive: true }).sort({ name: 1 }).lean()
            : Promise.resolve([]),
    ]);

    const grouped = items.reduce<Record<string, typeof items>>((accumulator, item) => {
        accumulator[item.category] = accumulator[item.category]
            ? [...accumulator[item.category], item]
            : [item];
        return accumulator;
    }, {});

    const awards = wants("awards")
        ? awardsFromReferenceMaster.length > 0
            ? awardsFromReferenceMaster.map((entry) => ({
                  _id: entry._id,
                  title: entry.title,
                  category: entry.category,
                  level: entry.level,
                  organizingBody: entry.organizingBody,
              }))
            : (grouped[categoryMap.awards] ?? []).map((entry) => ({
                  _id: entry._id,
                  title: entry.label,
                  category: readMetaString(entry.metadata as Record<string, unknown>, "category") ?? entry.code ?? undefined,
                  level: readMetaString(entry.metadata as Record<string, unknown>, "level") ?? undefined,
                  organizingBody:
                      readMetaString(entry.metadata as Record<string, unknown>, "organizingBody") ??
                      readMetaString(entry.metadata as Record<string, unknown>, "organizedBy") ??
                      undefined,
              }))
        : [];

    const skills = wants("skills")
        ? skillsFromReferenceMaster.length > 0
            ? skillsFromReferenceMaster.map((entry) => ({
                  _id: entry._id,
                  name: entry.name,
                  category: entry.category,
              }))
            : (grouped[categoryMap.skills] ?? []).map((entry) => ({
                  _id: entry._id,
                  name: entry.label,
                  category: readMetaString(entry.metadata as Record<string, unknown>, "category") ?? entry.code ?? undefined,
              }))
        : [];

    const sports = wants("sports")
        ? sportsFromReferenceMaster.length > 0
            ? sportsFromReferenceMaster.map((entry) => ({
                  _id: entry._id,
                  sportName: entry.sportName,
              }))
            : (grouped[categoryMap.sports] ?? []).map((entry) => ({
                  _id: entry._id,
                  sportName: entry.label,
              }))
        : [];

    const events = wants("events")
        ? eventsFromReferenceMaster.length > 0
            ? eventsFromReferenceMaster.map((entry) => ({
                  _id: entry._id,
                  title: entry.title,
                  eventType: entry.eventType,
                  organizedBy: entry.organizedBy,
                  startDate: entry.startDate,
                  endDate: entry.endDate,
                  level: entry.level,
                  location: entry.location,
              }))
            : (grouped[categoryMap.events] ?? []).map((entry) => ({
                  _id: entry._id,
                  title: entry.label,
                  eventType:
                      readMetaString(entry.metadata as Record<string, unknown>, "eventType") ??
                      entry.code ??
                      undefined,
                  organizedBy: readMetaString(entry.metadata as Record<string, unknown>, "organizedBy") ?? undefined,
                  startDate: readMetaString(entry.metadata as Record<string, unknown>, "startDate") ?? undefined,
                  endDate: readMetaString(entry.metadata as Record<string, unknown>, "endDate") ?? undefined,
                  location: readMetaString(entry.metadata as Record<string, unknown>, "location") ?? undefined,
              }))
        : [];

    const culturalActivities = wants("cultural")
        ? culturalFromReferenceMaster.length > 0
            ? culturalFromReferenceMaster.map((entry) => ({
                  _id: entry._id,
                  name: entry.name,
                  category: entry.category,
              }))
            : (grouped[categoryMap.cultural] ?? []).map((entry) => ({
                  _id: entry._id,
                  name: entry.label,
                  category: readMetaString(entry.metadata as Record<string, unknown>, "category") ?? entry.code ?? undefined,
              }))
        : [];

    const socialPrograms = wants("social")
        ? socialFromReferenceMaster.length > 0
            ? socialFromReferenceMaster.map((entry) => ({
                  _id: entry._id,
                  name: entry.name,
                  type: entry.type,
              }))
            : (grouped[categoryMap.social] ?? []).map((entry) => ({
                  _id: entry._id,
                  name: entry.label,
                  type: readMetaString(entry.metadata as Record<string, unknown>, "type") ?? entry.code ?? undefined,
              }))
        : [];

    return {
        awards,
        skills,
        sports,
        events,
        culturalActivities,
        socialPrograms,
    };
}
