"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    href?: string;
    kind: string;
    moduleName?: string;
    actorName?: string;
    status: "delivered" | "read";
    createdAt: string;
    readAt?: string;
};

type NotificationSummary = {
    notifications: NotificationItem[];
    unreadCount: number;
};

async function getSummary() {
    const response = await fetch("/api/notifications?limit=12", {
        method: "GET",
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Unable to load notifications.");
    }

    return response.json() as Promise<NotificationSummary>;
}

export function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState<NotificationSummary>({
        notifications: [],
        unreadCount: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);

    async function refresh() {
        setIsLoading(true);

        try {
            setSummary(await getSummary());
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
    }, []);

    async function markAllRead() {
        setIsMutating(true);

        try {
            await fetch("/api/notifications/read-all", { method: "POST" });
            await refresh();
        } finally {
            setIsMutating(false);
        }
    }

    async function markOneRead(id: string) {
        await fetch(`/api/notifications/${id}/read`, { method: "POST" });
        setSummary((current) => ({
            unreadCount: Math.max(
                0,
                current.unreadCount - (current.notifications.find((item) => item.id === id)?.status === "delivered" ? 1 : 0)
            ),
            notifications: current.notifications.map((item) =>
                item.id === id ? { ...item, status: "read", readAt: new Date().toISOString() } : item
            ),
        }));
    }

    const unreadLabel = useMemo(() => {
        if (!summary.unreadCount) {
            return null;
        }

        return summary.unreadCount > 9 ? "9+" : String(summary.unreadCount);
    }, [summary.unreadCount]);

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                    void refresh();
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                    <Bell className="size-4" />
                    <span className="sr-only">Notifications</span>
                    {unreadLabel ? (
                        <span className="absolute -top-2 -right-2 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {unreadLabel}
                        </span>
                    ) : null}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[24rem] p-0">
                <PopoverHeader className="border-b border-zinc-200 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <PopoverTitle>Notifications</PopoverTitle>
                            <PopoverDescription>
                                Workflow handoffs, approvals, and review updates.
                            </PopoverDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={!summary.unreadCount || isMutating}
                            onClick={() => void markAllRead()}
                        >
                            <CheckCheck className="size-4" />
                            Mark all read
                        </Button>
                    </div>
                </PopoverHeader>

                <ScrollArea className="h-96">
                    <div className="p-3">
                        {isLoading ? (
                            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                Loading notifications...
                            </div>
                        ) : summary.notifications.length ? (
                            <div className="space-y-3">
                                {summary.notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`rounded-xl border p-3 ${
                                            notification.status === "delivered"
                                                ? "border-sky-200 bg-sky-50/60"
                                                : "border-zinc-200 bg-white"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-zinc-950">
                                                    {notification.title}
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-zinc-600">
                                                    {notification.message}
                                                </p>
                                                <p className="mt-2 text-[11px] text-zinc-500">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                    {notification.actorName ? ` · ${notification.actorName}` : ""}
                                                </p>
                                            </div>
                                            {notification.status === "delivered" ? (
                                                <span className="mt-1 size-2 rounded-full bg-sky-500" />
                                            ) : null}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            {notification.href ? (
                                                <Button asChild size="sm" variant="outline">
                                                    <Link
                                                        href={notification.href}
                                                        onClick={() => {
                                                            void markOneRead(notification.id);
                                                            setOpen(false);
                                                        }}
                                                    >
                                                        Open
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <span />
                                            )}
                                            {notification.status === "delivered" ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => void markOneRead(notification.id)}
                                                >
                                                    Mark read
                                                </Button>
                                            ) : (
                                                <span className="text-[11px] text-zinc-400">Read</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                                No notifications yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
