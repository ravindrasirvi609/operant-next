import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Applies to every /admin route that does not define its own loading state. */
export default function Loading() {
    return <PageSkeleton stats={8} variant="split" />;
}
