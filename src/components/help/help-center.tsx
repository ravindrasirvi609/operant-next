"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CircleHelp, Filter, ListChecks, MousePointerClick, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { getHelpForPath, type HelpAction, type HelpEntry } from "@/lib/ui/help";
import type { RoleKey } from "@/lib/ui/navigation";

export type HelpCenterProps = {
    role: RoleKey;
};

const FALLBACK_ENTRY: HelpEntry = {
    title: "Help",
    purpose: "Help isn't available for this page yet. Reach out to your administrator if you need assistance.",
};

export function HelpCenter({ role }: HelpCenterProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const entry = getHelpForPath(role, pathname) ?? FALLBACK_ENTRY;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <CircleHelp className="size-4" />
                    <span className="sr-only">Help</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
                <SheetHeader className="border-b border-border">
                    <SheetTitle>{entry.title}</SheetTitle>
                    <SheetDescription>{entry.purpose}</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="space-y-6 p-4">
                        <HelpSection
                            icon={ListChecks}
                            heading="Workflow"
                            items={entry.workflow}
                            renderItem={(item, index) => (
                                <li key={item} className="flex gap-2.5 text-sm text-foreground">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                        {index + 1}
                                    </span>
                                    <span className="pt-0.5">{item}</span>
                                </li>
                            )}
                        />

                        <HelpActionSection icon={MousePointerClick} heading="Actions & Buttons" items={entry.actions} />
                        <HelpActionSection icon={Filter} heading="Filters" items={entry.filters} />

                        <HelpSection
                            icon={TriangleAlert}
                            heading="Tips"
                            items={entry.tips}
                            renderItem={(item) => (
                                <li key={item} className="flex gap-2.5 text-sm text-foreground">
                                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                                    <span>{item}</span>
                                </li>
                            )}
                        />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

function HelpSection<T>({
    icon: Icon,
    heading,
    items,
    renderItem,
}: {
    icon: typeof ListChecks;
    heading: string;
    items?: T[];
    renderItem: (item: T, index: number) => ReactNode;
}) {
    if (!items?.length) return null;

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
            </div>
            <ul className="space-y-2.5">{items.map((item, index) => renderItem(item, index))}</ul>
        </section>
    );
}

function HelpActionSection({
    icon: Icon,
    heading,
    items,
}: {
    icon: typeof ListChecks;
    heading: string;
    items?: HelpAction[];
}) {
    return (
        <HelpSection
            icon={Icon}
            heading={heading}
            items={items}
            renderItem={(item) => (
                <li key={item.label} className="space-y-0.5 text-sm">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-muted-foreground">{item.description}</p>
                </li>
            )}
        />
    );
}
