import { buildProfileEditHref, pbasSourceSteps } from "@/lib/pbas/source-config";
import type {
    PbasCandidatePools,
    PbasDraftReferences,
    PbasReferenceKey,
    PbasSourceRow,
    PbasSourceTables,
} from "@/components/pbas/pbas-types";

/**
 * Turns the server's candidate pools plus the draft's saved references into the
 * rows each source step renders.
 *
 * This was a 240-line `useMemo` inside pbas-dashboard.tsx (lines 253–493) that
 * called the same five-argument `toRows(...)` nineteen times, each with a
 * hand-written pool path, reference key, and profile-section slug, and with the
 * one single-valued reference (`teachingSummaryId`) special-cased in an inline
 * ternary. Driving it from `pbasSourceSteps` makes it a loop, and moving it out
 * of the component makes it directly testable.
 */
export function buildPbasSourceTables(
    candidates: PbasCandidatePools,
    references: PbasDraftReferences,
    designationKey: string
): PbasSourceTables {
    const tables = {} as PbasSourceTables;

    for (const step of pbasSourceSteps) {
        tables[step.key] = {
            label: step.title,
            description: step.descriptionFor(designationKey),
            groups: step.groups.map((group) => ({
                title: group.title,
                rows: group.pool(candidates).map(
                    (option): PbasSourceRow => ({
                        id: option.id,
                        sourceType: group.sourceType,
                        title: option.label,
                        subtitle: option.sublabel,
                        note: option.note,
                        included: isReferenced(references, group.referenceKey, option.id, group.single),
                        referenceKey: group.referenceKey,
                        sourceHref: buildProfileEditHref(group.section, option.id),
                    })
                ),
            })),
        };
    }

    return tables;
}

function isReferenced(
    references: PbasDraftReferences,
    key: PbasReferenceKey,
    id: string,
    single?: boolean
): boolean {
    if (single || key === "teachingSummaryId") {
        return references.teachingSummaryId === id;
    }

    const value = references[key as keyof Omit<PbasDraftReferences, "teachingSummaryId">];
    return Array.isArray(value) && value.includes(id);
}

/**
 * Immutably toggles one source in or out of the draft.
 *
 * The dashboard previously had two near-identical handlers — `toggleReference`
 * for the sixteen array keys and `toggleTeachingSummary` for the single-valued
 * one — plus a `removeFromPbas` dispatcher that branched between them on the key
 * name. One function with a `single` flag covers all three.
 */
export function togglePbasReference(
    references: PbasDraftReferences,
    key: PbasReferenceKey,
    id: string
): PbasDraftReferences {
    if (key === "teachingSummaryId") {
        return {
            ...references,
            // Selecting the already-selected summary clears it, matching the
            // original toggle behaviour.
            teachingSummaryId: references.teachingSummaryId === id ? undefined : id,
        };
    }

    const arrayKey = key as keyof Omit<PbasDraftReferences, "teachingSummaryId">;
    const current = references[arrayKey] ?? [];
    const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];

    return { ...references, [arrayKey]: next };
}
