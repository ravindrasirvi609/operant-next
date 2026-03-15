import { PbasCatalogManager } from "@/components/admin/pbas-catalog-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { getPbasCatalog } from "@/lib/pbas/admin";

export default async function AdminPbasCatalogPage() {
    await requireAdmin();
    const catalog = await getPbasCatalog();

    const safeCategories = JSON.parse(JSON.stringify(catalog.categories));
    const safeIndicators = JSON.parse(JSON.stringify(catalog.indicators));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>PBAS Master Catalog</CardTitle>
                    <CardDescription>
                        Configure PBAS categories and indicators used for dynamic scoring, evidence tagging, and NAAC reporting.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PbasCatalogManager
                        initialCategories={safeCategories}
                        initialIndicators={safeIndicators}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
