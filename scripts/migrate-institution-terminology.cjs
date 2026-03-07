/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnvFile(filename) {
    const filePath = path.join(process.cwd(), filename);

    if (!fs.existsSync(filePath)) {
        return;
    }

    const contents = fs.readFileSync(filePath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmed.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const rawValue = trimmed.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, "");

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

async function updateCollectionIfPresent(db, collections, candidates, pipeline) {
    const collectionName = candidates.find((name) => collections.has(name));

    if (!collectionName) {
        return { collectionName: candidates[0], matchedCount: 0, modifiedCount: 0, skipped: true };
    }

    const result = await db.collection(collectionName).updateMany({}, pipeline);

    return {
        collectionName,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        skipped: false,
    };
}

async function main() {
    loadEnvFile(".env.local");
    loadEnvFile(".env");

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("MONGODB_URI is required to run the terminology migration.");
    }

    await mongoose.connect(mongoUri, {
        bufferCommands: false,
    });

    const db = mongoose.connection.db;
    const collections = new Set(
        (await db.listCollections().toArray()).map((item) => item.name)
    );

    const renameSchoolToCollegePipeline = [
        {
            $set: {
                collegeName: {
                    $cond: [
                        { $ne: [{ $type: "$schoolName" }, "missing"] },
                        "$schoolName",
                        "$collegeName",
                    ],
                },
            },
        },
        { $unset: "schoolName" },
    ];

    const results = [];

    results.push(
        await updateCollectionIfPresent(db, collections, ["users"], [
            {
                $set: {
                    universityName: {
                        $ifNull: ["$universityName", "$collegeName"],
                    },
                    collegeName: {
                        $cond: [
                            { $ne: [{ $type: "$schoolName" }, "missing"] },
                            "$schoolName",
                            "$collegeName",
                        ],
                    },
                },
            },
            { $unset: "schoolName" },
        ])
    );

    results.push(
        await updateCollectionIfPresent(db, collections, ["organizations"], [
            {
                $set: {
                    type: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$type", "College"] }, then: "University" },
                                { case: { $eq: ["$type", "School"] }, then: "College" },
                            ],
                            default: "$type",
                        },
                    },
                    universityName: {
                        $ifNull: ["$universityName", "$collegeName"],
                    },
                    collegeName: {
                        $cond: [
                            { $ne: [{ $type: "$schoolName" }, "missing"] },
                            "$schoolName",
                            "$collegeName",
                        ],
                    },
                },
            },
            { $unset: "schoolName" },
        ])
    );

    results.push(
        await updateCollectionIfPresent(db, collections, ["master_data"], [
            {
                $set: {
                    category: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$category", "college"] }, then: "university" },
                                { case: { $eq: ["$category", "school"] }, then: "college" },
                            ],
                            default: "$category",
                        },
                    },
                    parentCategory: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$parentCategory", "college"] }, then: "university" },
                                { case: { $eq: ["$parentCategory", "school"] }, then: "college" },
                            ],
                            default: "$parentCategory",
                        },
                    },
                },
            },
        ])
    );

    const schoolCollections = [
        ["programs"],
        ["reports"],
        ["reportingstatuses"],
        ["campusevents"],
        ["studentactivities"],
        ["feedbacks", "feedback"],
        ["publications"],
        ["projects"],
        ["researchactivities"],
        ["intellectualproperties"],
    ];

    for (const candidates of schoolCollections) {
        results.push(
            await updateCollectionIfPresent(
                db,
                collections,
                candidates,
                renameSchoolToCollegePipeline
            )
        );
    }

    for (const result of results) {
        if (result.skipped) {
            console.log(`Skipped ${result.collectionName}: collection not found`);
            continue;
        }

        console.log(
            `Migrated ${result.collectionName}: matched=${result.matchedCount} modified=${result.modifiedCount}`
        );
    }

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error);
    try {
        await mongoose.disconnect();
    } catch {}
    process.exit(1);
});
