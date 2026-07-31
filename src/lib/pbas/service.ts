// Re-export shim — keeps existing imports from "@/lib/pbas/service" working.
// New code should import from specific sub-modules or from "@/lib/pbas".
export * from "./lifecycle";
export * from "./entries";
export * from "./notifications";
