import { NotFoundView } from "@/components/common/not-found-view";

/**
 * Root 404 page.
 *
 * Rendered for unmatched routes and for any `notFound()` call that is not caught
 * by a more specific `not-found.tsx`. Uses the root layout, so `globals.css` and
 * the design tokens are available here.
 */
export default function NotFound() {
    return <NotFoundView />;
}
