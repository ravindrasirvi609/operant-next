/**
 * Integration (characterization) tests for the DB-backed workflow engine.
 *
 * These run against a real in-memory MongoDB (see src/test/db.ts) and pin the
 * *current* behaviour of the persistence layer so the upcoming refactors
 * (repository pattern, event-driven side effects) can be proven behaviour-
 * preserving. They are intentionally descriptive of what the code does today,
 * not what it ideally should do.
 */
import {
    ensureWorkflowDefinitions,
    getActiveWorkflowDefinition,
    getWorkflowInstanceStatus,
    syncWorkflowInstanceState,
} from "@/lib/workflow/engine";
import WorkflowDefinition from "@/models/core/workflow-definition";
import WorkflowInstance from "@/models/core/workflow-instance";
import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";

/** Count of seeded module definitions — see DEFAULT_WORKFLOW_DEFINITIONS. */
const SEEDED_MODULE_COUNT = 11;

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    await teardownTestDatabase();
});

afterEach(async () => {
    await clearDatabase();
});

describe("ensureWorkflowDefinitions (integration)", () => {
    it("seeds one active definition for every module", async () => {
        await ensureWorkflowDefinitions();

        expect(await WorkflowDefinition.countDocuments()).toBe(SEEDED_MODULE_COUNT);
        expect(await WorkflowDefinition.countDocuments({ isActive: true })).toBe(
            SEEDED_MODULE_COUNT
        );
    });

    it("is idempotent — repeated calls never duplicate definitions", async () => {
        await ensureWorkflowDefinitions();
        await ensureWorkflowDefinitions();

        expect(await WorkflowDefinition.countDocuments()).toBe(SEEDED_MODULE_COUNT);
    });
});

describe("getActiveWorkflowDefinition (integration)", () => {
    it("returns the active PBAS definition with its ordered stages", async () => {
        const definition = await getActiveWorkflowDefinition("PBAS");

        expect(definition.moduleName).toBe("PBAS");
        expect(definition.isActive).toBe(true);
        expect(definition.stages).toHaveLength(3);
        expect(definition.stages[0]?.status).toBe("Submitted");
    });
});

describe("syncWorkflowInstanceState (integration)", () => {
    const recordId = "pbas-form-1";

    it("creates an active instance parked at the first review stage", async () => {
        const instance = await syncWorkflowInstanceState({
            moduleName: "PBAS",
            recordId,
            status: "Submitted",
            subjectDepartmentName: "Physics",
            action: "submit",
        });

        expect(instance).not.toBeNull();
        expect(instance!.status).toBe("Submitted");
        expect(instance!.isActive).toBe(true);
        expect(instance!.currentStageKind).toBe("review");
        expect(instance!.currentApproverRoles).toEqual(
            expect.arrayContaining(["DEPARTMENT_HEAD", "DIRECTOR"])
        );
        expect(instance!.completedAt).toBeFalsy();
    });

    it("upserts the same record instead of creating duplicates", async () => {
        await syncWorkflowInstanceState({ moduleName: "PBAS", recordId, status: "Submitted" });
        await syncWorkflowInstanceState({ moduleName: "PBAS", recordId, status: "Under Review" });

        expect(await WorkflowInstance.countDocuments({ moduleName: "PBAS", recordId })).toBe(1);

        const instance = await WorkflowInstance.findOne({ moduleName: "PBAS", recordId });
        expect(instance!.status).toBe("Under Review");
    });

    it("marks the instance completed once the status maps to no stage", async () => {
        await syncWorkflowInstanceState({ moduleName: "PBAS", recordId, status: "Submitted" });

        const instance = await syncWorkflowInstanceState({
            moduleName: "PBAS",
            recordId,
            status: "Approved",
            action: "approve",
        });

        expect(instance!.status).toBe("Approved");
        expect(instance!.isActive).toBe(false);
        expect(instance!.currentApproverRoles).toHaveLength(0);
        expect(instance!.completedAt).toBeTruthy();
    });

    it("keeps independent instances for different records", async () => {
        await syncWorkflowInstanceState({ moduleName: "PBAS", recordId: "a", status: "Submitted" });
        await syncWorkflowInstanceState({ moduleName: "PBAS", recordId: "b", status: "Submitted" });

        expect(await WorkflowInstance.countDocuments({ moduleName: "PBAS" })).toBe(2);
    });
});

describe("getWorkflowInstanceStatus (integration)", () => {
    it("returns null when no instance exists", async () => {
        expect(await getWorkflowInstanceStatus("PBAS", "missing")).toBeNull();
    });

    it("projects the current status of an existing instance", async () => {
        await syncWorkflowInstanceState({
            moduleName: "PBAS",
            recordId: "rec-x",
            status: "Submitted",
        });

        const status = await getWorkflowInstanceStatus("PBAS", "rec-x");

        expect(status).not.toBeNull();
        expect(status!.status).toBe("Submitted");
        expect(status!.moduleName).toBe("PBAS");
        expect(status!.recordId).toBe("rec-x");
    });
});
