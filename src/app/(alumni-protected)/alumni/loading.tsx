import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Applies to every /alumni route that does not define its own loading state. */
export default function Loading() {
    return <PageSkeleton stats={4} variant="split" />;
}
