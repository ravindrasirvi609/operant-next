import dbConnect from "@/lib/dbConnect";
import MasterData from "@/models/core/master-data";

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

    const items = requestedCategories.length
        ? await MasterData.find({
              category: { $in: requestedCategories },
              isActive: true,
          }).sort({ category: 1, sortOrder: 1, label: 1 })
        : [];

    const grouped = items.reduce<Record<string, typeof items>>((accumulator, item) => {
        accumulator[item.category] = accumulator[item.category]
            ? [...accumulator[item.category], item]
            : [item];
        return accumulator;
    }, {});

    const awards = wants("awards")
        ? (grouped[categoryMap.awards] ?? []).map((entry) => ({
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
        ? (grouped[categoryMap.skills] ?? []).map((entry) => ({
              _id: entry._id,
              name: entry.label,
              category: readMetaString(entry.metadata as Record<string, unknown>, "category") ?? entry.code ?? undefined,
          }))
        : [];

    const sports = wants("sports")
        ? (grouped[categoryMap.sports] ?? []).map((entry) => ({
              _id: entry._id,
              sportName: entry.label,
          }))
        : [];

    const events = wants("events")
        ? (grouped[categoryMap.events] ?? []).map((entry) => ({
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
        ? (grouped[categoryMap.cultural] ?? []).map((entry) => ({
              _id: entry._id,
              name: entry.label,
              category: readMetaString(entry.metadata as Record<string, unknown>, "category") ?? entry.code ?? undefined,
          }))
        : [];

    const socialPrograms = wants("social")
        ? (grouped[categoryMap.social] ?? []).map((entry) => ({
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
