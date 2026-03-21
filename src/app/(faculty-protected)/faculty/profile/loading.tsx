import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 xl:py-10">
            <div className="space-y-6">
                <Card>
                    <CardContent className="space-y-3 p-4">
                        <Skeleton className="h-6 w-64" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    <Card>
                        <CardContent className="flex flex-col items-center gap-4 p-5">
                            <Skeleton className="size-28 rounded-xl" />
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-40" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-4 p-4">
                            <Skeleton className="h-10 w-full" />
                            <div className="grid gap-3 md:grid-cols-2">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                            <Skeleton className="h-72 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}

