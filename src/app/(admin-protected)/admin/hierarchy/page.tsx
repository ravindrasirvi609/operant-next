import { HierarchyManager } from "@/components/admin/hierarchy-manager";
import { getHierarchyData } from "@/lib/admin/hierarchy";

export default async function AdminHierarchyPage() {
    const data = await getHierarchyData();

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Organization hierarchy</h1>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-600">
                    Build and maintain the university-college-department structure from a single workspace, with clean ownership mapping and quick status controls.
                </p>
            </section>

            <HierarchyManager
                assignableUsers={JSON.parse(JSON.stringify(data.assignableUsers)) as never}
                initialOrganizations={JSON.parse(JSON.stringify(data.organizations)) as never}
                organizationTypes={data.organizationTypes}
            />
        </div>
    );
}
