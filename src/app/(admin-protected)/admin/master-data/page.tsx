import { MasterDataManager } from "@/components/admin/admin-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    getMasterDataMap,
    masterDataCategories,
} from "@/lib/admin/master-data";

export default async function AdminMasterDataPage() {
    const data = await getMasterDataMap();
    const safeData = JSON.parse(JSON.stringify(data)) as Record<string, unknown[]>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Institutional master data</CardTitle>
                <CardDescription>
                    Centralize universities, colleges, departments, academic-year options, reporting categories, offices, and other enum-style configuration needed by UMIS modules.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <MasterDataManager
                        categories={masterDataCategories}
                        initialData={safeData as never}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
