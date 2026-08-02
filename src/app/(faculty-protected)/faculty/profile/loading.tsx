import { PageSkeleton } from "@/components/ui/page-skeleton";

/**
 * The profile page leads with a large form rather than a stat row, so it uses
 * the form variant instead of inheriting the faculty default.
 */
export default function Loading() {
    return <PageSkeleton stats={0} variant="form" />;
}
