import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Applies to every /faculty route that does not define its own loading state. */
export default function Loading() {
    return <PageSkeleton stats={6} variant="split" />;
}
