import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { resolveWorkflowRoleRecipientIds } from "@/lib/governance/service";
import Notification, {
    type NotificationKind,
    type NotificationModuleName,
} from "@/models/core/notification";
import Organization from "@/models/core/organization";
import User from "@/models/core/user";
import Department from "@/models/reference/department";
import type { WorkflowApproverRole } from "@/models/core/workflow-definition";
import type { IWorkflowDefinitionStage } from "@/models/core/workflow-definition";
import { sendNotificationEmail } from "@/lib/notifications/email";

type NotificationActor = {
    id?: string;
    name?: string;
};

type NotificationRecordInput = {
    userId: string;
    kind: NotificationKind;
    moduleName?: NotificationModuleName;
    entityId?: string;
    href?: string;
    title: string;
    message: string;
    actor?: NotificationActor;
    metadata?: Record<string, unknown>;
};

type NotificationRecipient = {
    userId: string;
    role?: string;
};

export type NotificationListItem = {
    id: string;
    title: string;
    message: string;
    href?: string;
    kind: NotificationKind;
    moduleName?: NotificationModuleName;
    entityId?: string;
    actorName?: string;
    status: "delivered" | "read";
    createdAt: Date;
    readAt?: Date;
};

function dedupeUserIds(userIds: Array<string | undefined | null>) {
    return Array.from(
        new Set(
            userIds
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    );
}

function readNotificationDedupeMetadata(metadata?: Record<string, unknown>) {
    const rawKey = metadata?.dedupeKey;
    const dedupeKey =
        typeof rawKey === "string" && rawKey.trim().length > 0
            ? rawKey.trim()
            : undefined;
    const rawWindowHours = metadata?.dedupeWindowHours;
    const dedupeWindowHours =
        typeof rawWindowHours === "number" &&
        Number.isFinite(rawWindowHours) &&
        rawWindowHours > 0
            ? rawWindowHours
            : 24 * 30;

    return { dedupeKey, dedupeWindowHours };
}

async function filterExistingNotifications(records: NotificationRecordInput[]) {
    const seenBatchKeys = new Set<string>();

    const filtered = await Promise.all(
        records.map(async (record) => {
            const { dedupeKey, dedupeWindowHours } = readNotificationDedupeMetadata(record.metadata);

            if (!dedupeKey) {
                return record;
            }

            const batchKey = `${record.userId}:${dedupeKey}`;
            if (seenBatchKeys.has(batchKey)) {
                return null;
            }

            seenBatchKeys.add(batchKey);

            const existing = await Notification.exists({
                userId: new Types.ObjectId(record.userId),
                "metadata.dedupeKey": dedupeKey,
                createdAt: {
                    $gte: new Date(Date.now() - dedupeWindowHours * 60 * 60 * 1000),
                },
            });

            return existing ? null : record;
        })
    );

    return filtered.filter(Boolean) as NotificationRecordInput[];
}

function getEvidenceReviewerHref(role?: string) {
    return role === "Admin" ? "/admin/evidence" : "/director/evidence";
}

export async function createNotifications(records: NotificationRecordInput[]) {
    const sanitized = records
        .map((record) => ({
            ...record,
            userId: String(record.userId).trim(),
        }))
        .filter((record) => Boolean(record.userId) && record.title.trim() && record.message.trim());

    if (!sanitized.length) {
        return [];
    }

    await dbConnect();

    const filtered = await filterExistingNotifications(sanitized);

    if (!filtered.length) {
        return [];
    }

    const inserted = await Notification.insertMany(
        filtered.map((record) => ({
            userId: new Types.ObjectId(record.userId),
            kind: record.kind,
            moduleName: record.moduleName,
            entityId: record.entityId,
            href: record.href,
            title: record.title,
            message: record.message,
            actorId: record.actor?.id ? new Types.ObjectId(record.actor.id) : undefined,
            actorName: record.actor?.name,
            metadata: record.metadata,
            inApp: {
                status: "delivered",
                deliveredAt: new Date(),
            },
            email: {
                status: "pending",
            },
        }))
    );

    const userIds = dedupeUserIds(filtered.map((record) => record.userId));
    const users = await User.find({
        _id: { $in: userIds.map((userId) => new Types.ObjectId(userId)) },
    }).select("_id name email emailVerified");
    const userById = new Map(
        users.map((user) => [
            user._id.toString(),
            {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
            },
        ])
    );

    await Promise.all(
        inserted.map(async (notification) => {
            const recipient = userById.get(notification.userId.toString());

            if (!recipient?.email || !recipient.emailVerified) {
                await Notification.updateOne(
                    { _id: notification._id },
                    {
                        $set: {
                            email: {
                                status: "skipped",
                                failureReason: "Recipient email is unavailable or not verified.",
                            },
                        },
                    }
                );
                return;
            }

            const result = await sendNotificationEmail({
                to: recipient.email,
                name: recipient.name || "there",
                subject: notification.title,
                heading: notification.title,
                message: notification.message,
                actionLabel: notification.href ? "Open in UMIS" : undefined,
                actionUrl: notification.href,
                previewText: notification.moduleName
                    ? `New ${notification.moduleName} notification in UMIS.`
                    : "New UMIS notification.",
            });

            if (result.status === "sent") {
                await Notification.updateOne(
                    { _id: notification._id },
                    {
                        $set: {
                            email: {
                                status: "sent",
                                sentAt: result.sentAt,
                            },
                        },
                    }
                );
                return;
            }

            await Notification.updateOne(
                { _id: notification._id },
                {
                    $set: {
                        email: {
                            status: result.status,
                            failureReason: result.reason,
                        },
                    },
                }
            );
        })
    );

    return inserted;
}

export async function listNotificationsForUser(
    userId: string,
    options?: { limit?: number; unreadOnly?: boolean }
) {
    await dbConnect();

    const limit = Math.max(1, Math.min(50, options?.limit ?? 12));
    const filter: Record<string, unknown> = {
        userId: new Types.ObjectId(userId),
    };

    if (options?.unreadOnly) {
        filter["inApp.status"] = "delivered";
    }

    const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return notifications.map<NotificationListItem>((notification) => ({
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        href: notification.href,
        kind: notification.kind,
        moduleName: notification.moduleName,
        entityId: notification.entityId,
        actorName: notification.actorName,
        status: notification.inApp?.status ?? "delivered",
        createdAt: notification.createdAt,
        readAt: notification.inApp?.readAt,
    }));
}

export async function countUnreadNotifications(userId: string) {
    await dbConnect();

    return Notification.countDocuments({
        userId: new Types.ObjectId(userId),
        "inApp.status": "delivered",
    });
}

export async function markNotificationRead(userId: string, notificationId: string) {
    await dbConnect();

    await Notification.updateOne(
        {
            _id: notificationId,
            userId: new Types.ObjectId(userId),
        },
        {
            $set: {
                "inApp.status": "read",
                "inApp.readAt": new Date(),
            },
        }
    );
}

export async function markAllNotificationsRead(userId: string) {
    await dbConnect();

    await Notification.updateMany(
        {
            userId: new Types.ObjectId(userId),
            "inApp.status": "delivered",
        },
        {
            $set: {
                "inApp.status": "read",
                "inApp.readAt": new Date(),
            },
        }
    );
}

export async function getNotificationSummary(userId: string, options?: { limit?: number }) {
    const [notifications, unreadCount] = await Promise.all([
        listNotificationsForUser(userId, { limit: options?.limit ?? 12 }),
        countUnreadNotifications(userId),
    ]);

    return {
        notifications,
        unreadCount,
    };
}

export async function resolveNotificationRecipientsForApproverRoles(
    approverRoles: WorkflowApproverRole[],
    subjectDepartmentName?: string,
    subjectCollegeName?: string,
    subjectUniversityName?: string
) {
    await dbConnect();

    const recipientIds = new Set<string>();
    const subjectScope = {
        departmentName: subjectDepartmentName,
        collegeName: subjectCollegeName,
        universityName: subjectUniversityName,
    };

    if (approverRoles.includes("DEPARTMENT_HEAD") && subjectDepartmentName) {
        for (const userId of await resolveWorkflowRoleRecipientIds("DEPARTMENT_HEAD", subjectScope)) {
            recipientIds.add(userId);
        }
    }

    for (const role of approverRoles) {
        if (
            role === "DEPARTMENT_HEAD" ||
            role === "FACULTY"
        ) {
            continue;
        }

        for (const userId of await resolveWorkflowRoleRecipientIds(role, subjectScope)) {
            recipientIds.add(userId);
        }
    }

    for (const [role, pattern] of [
        ["IQAC", /iqac/i],
        ["PRINCIPAL", /principal/i],
    ] as const) {
        if (!approverRoles.includes(role)) {
            continue;
        }

        const organizations = await Organization.find({
            isActive: true,
            $or: [
                { name: pattern },
                { headTitle: pattern },
            ],
        }).select("headUserId");

        for (const organization of organizations) {
            if (organization.headUserId) {
                recipientIds.add(organization.headUserId.toString());
            }
        }
    }

    return Array.from(recipientIds);
}

export async function notifyWorkflowStageAssignees(options: {
    stage: Pick<IWorkflowDefinitionStage, "key" | "label" | "approverRoles">;
    subjectDepartmentName?: string;
    subjectCollegeName?: string;
    subjectUniversityName?: string;
    moduleName: NotificationModuleName;
    entityId: string;
    href: string;
    title: string;
    message: string;
    actor?: NotificationActor;
}) {
    const recipientIds = await resolveNotificationRecipientsForApproverRoles(
        options.stage.approverRoles,
        options.subjectDepartmentName,
        options.subjectCollegeName,
        options.subjectUniversityName
    );
    const deduped = dedupeUserIds(
        recipientIds.filter((userId) => userId !== options.actor?.id)
    );

    await createNotifications(
        deduped.map((userId) => ({
            userId,
            kind: "workflow",
            moduleName: options.moduleName,
            entityId: options.entityId,
            href: options.href,
            title: options.title,
            message: options.message,
            actor: options.actor,
            metadata: {
                stageKey: options.stage.key,
                stageLabel: options.stage.label,
            },
        }))
    );
}

export async function resolveEvidenceReviewerRecipients(departmentId?: string) {
    await dbConnect();

    const recipients = new Map<string, NotificationRecipient>();

    if (departmentId) {
        const department = await Department.findById(departmentId).select("name");

        if (department?.name) {
            const organization = await Organization.findOne({
                type: "Department",
                name: department.name,
                isActive: true,
            }).select("headUserId");

            if (organization?.headUserId) {
                const headUser = await User.findById(organization.headUserId).select("_id role isActive accountStatus");

                if (headUser?.isActive && headUser.accountStatus === "Active") {
                    recipients.set(headUser._id.toString(), {
                        userId: headUser._id.toString(),
                        role: headUser.role,
                    });
                }
            }
        }
    }

    return Array.from(recipients.values());
}

export async function notifyEvidencePendingReview(options: {
    documentId: string;
    departmentId?: string;
    studentName: string;
    recordLabel: string;
    actor?: NotificationActor;
}) {
    const recipients = await resolveEvidenceReviewerRecipients(options.departmentId);

    await createNotifications(
        recipients
            .filter((recipient) => recipient.userId !== options.actor?.id)
            .map((recipient) => ({
                userId: recipient.userId,
                kind: "document" as const,
                moduleName: "EVIDENCE" as const,
                entityId: options.documentId,
                href: getEvidenceReviewerHref(recipient.role),
                title: "Student evidence pending review",
                message: `${options.studentName} submitted ${options.recordLabel} evidence for verification.`,
                actor: options.actor,
                metadata: {
                    reviewStatus: "Pending",
                    dedupeKey: `evidence-pending:${options.documentId}`,
                    dedupeWindowHours: 24 * 45,
                },
            }))
    );
}

export async function notifyUser(options: {
    userId?: string;
    moduleName: NotificationModuleName;
    entityId: string;
    href: string;
    title: string;
    message: string;
    actor?: NotificationActor;
    kind?: NotificationKind;
    metadata?: Record<string, unknown>;
}) {
    if (!options.userId) {
        return;
    }

    await createNotifications([
        {
            userId: options.userId,
            kind: options.kind ?? "workflow",
            moduleName: options.moduleName,
            entityId: options.entityId,
            href: options.href,
            title: options.title,
            message: options.message,
            actor: options.actor,
            metadata: options.metadata,
        },
    ]);
}
