"use client";

import dynamic from "next/dynamic";

export const HierarchyManagerDynamic = dynamic(
    () => import("@/components/admin/hierarchy-manager").then((m) => m.HierarchyManager),
    { ssr: false, loading: () => <div className="animate-pulse h-64 rounded-md bg-muted" /> }
);
