import Link from "next/link";

/**
 * Shared 404 presentation.
 *
 * A dependency-light Server Component (no client hooks, no Radix Slot) so it can
 * be rendered directly from `not-found.tsx`. The "Return home" action is a plain
 * styled `<Link>` to avoid pulling any client-only component into the RSC tree.
 */
interface NotFoundViewProps {
    /** Heading text. */
    title?: string;
    /** Supporting description. */
    description?: string;
}

export function NotFoundView({
    title = "Page not found",
    description = "The page you are looking for does not exist or may have moved.",
}: NotFoundViewProps) {
    return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-[1440px] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
            <p className="max-w-md text-muted-foreground">{description}</p>
            <Link
                href="/"
                className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                Return home
            </Link>
        </main>
    );
}
