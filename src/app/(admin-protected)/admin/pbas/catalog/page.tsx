import { PbasCatalogManager } from "@/components/admin/pbas-catalog-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/user";
import { getPbasCatalog, getPbasScoringSettings } from "@/lib/pbas/admin";

export default async function AdminPbasCatalogPage() {
    await requireAdmin();
    const [catalog, settings] = await Promise.all([getPbasCatalog(), getPbasScoringSettings()]);

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
                        initialSettings={JSON.parse(JSON.stringify(settings))}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
