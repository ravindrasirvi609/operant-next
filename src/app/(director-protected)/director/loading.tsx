import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Applies to every /director route that does not define its own loading state. */
export default function Loading() {
    return <PageSkeleton stats={6} variant="split" />;
}
