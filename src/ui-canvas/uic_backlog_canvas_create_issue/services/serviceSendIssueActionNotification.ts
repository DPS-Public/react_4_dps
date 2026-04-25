import { db } from "@/config/firebase"
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore"
import { sendFrontendNotificationEmail } from "@/ui-canvas/uic_backlog_canvas/services/frontendNotificationEmail"

const isValidEmail = (value: any) =>
    typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizeString = (value: any) =>
    typeof value === "string" ? value.trim() : "";

const resolveProjectName = async (projectId: string) => {
    const normalizedProjectId = normalizeString(projectId)
    if (!normalizedProjectId) return ""

    try {
        const projectDoc = await getDoc(doc(db, "projects", normalizedProjectId))
        if (projectDoc.exists()) {
            const projectName = projectDoc.data()?.name
            if (typeof projectName === "string" && projectName.trim()) {
                return projectName.trim()
            }
        }
    } catch (error) {
        console.error("Error resolving project name:", error)
    }

    return normalizedProjectId
}

const resolveUserEmailByUid = async (uid: string) => {
    const normalized = normalizeString(uid)
    if (!normalized) return ""

    try {
        const directDoc = await getDoc(doc(db, "users", normalized))
        if (directDoc.exists()) {
            const email = directDoc.data()?.email
            if (isValidEmail(email)) {
                return email.trim()
            }
        }
    } catch {
        // ignore and continue
    }

    // getUserData funksiyası silindi, yalnız Firestore istifadə olunur

    return ""
}

const resolveNotificationRecipientUid = async (assigneeId: string) => {
    const normalized = normalizeString(assigneeId);
    if (!normalized) return "";
    const normalizedLower = normalized.toLowerCase();

    const extractUid = (userDoc: any) => {
        const data = (userDoc?.data?.() || {}) as any;
        return normalizeString(data?.uid) || normalizeString(userDoc?.id) || "";
    };

    const matchesCandidate = (userDoc: any) => {
        const data = (userDoc?.data?.() || {}) as any;
        const fields = [
            data?.uid,
            userDoc?.id,
            data?.displayName,
            data?.name,
            data?.userName,
            data?.email,
        ];
        return fields.some((value: any) => normalizeString(value).toLowerCase() === normalizedLower);
    };

    try {
        const directDoc = await getDoc(doc(db, "users", normalized));
        if (directDoc.exists()) {
            return extractUid(directDoc) || normalized;
        }
    } catch {
        // ignore and continue
    }

    try {
        const byDisplayName = await getDocs(query(collection(db, "users"), where("displayName", "==", normalized)));
        if (!byDisplayName.empty) {
            return extractUid(byDisplayName.docs[0]);
        }
    } catch {
        // ignore and continue
    }

    if (isValidEmail(normalized)) {
        try {
            const byEmail = await getDocs(query(collection(db, "users"), where("email", "==", normalized)));
            if (!byEmail.empty) {
                return extractUid(byEmail.docs[0]);
            }
        } catch {
            // ignore and continue
        }
    }

    // Case-insensitive fallback for legacy records storing displayName/email with different casing.
    try {
        const allUsers = await getDocs(collection(db, "users"));
        const found = allUsers.docs.find((userDoc) => matchesCandidate(userDoc));
        if (found) {
            return extractUid(found);
        }
    } catch {
        // ignore lookup errors and rely on fallback below
    }

    // Fallback: keep provided identifier (usually uid) to avoid dropping notifications
    // when users collection is not readable for current client.
    return normalized;
}

const issueActionLabelMap: Record<string, string> = {
    issue_created: "created a new issue",
    status_change: "changed issue status",
    type_change: "changed the issue type.",
    comment_add: "added a comment",
    comment_update: "updated the comment",
    description_changed: "updated issue description",
    priority_change: "changed the issue priority.",
    assignee_change: "changed issue assignee",
    attachment_change: "apload new file(s)",
    ui_canvas_change: "changed the Related UI Canvas",
};

const buildIssueNotificationTitle = (
    actionType: keyof typeof issueActionLabelMap | string,
    issueRef: string | number
) => {
    if (actionType === "issue_created") {
        return `New issue #${issueRef} created`;
    }
    if (actionType === "comment_add") {
        return `Issue #${issueRef} has new comment`;
    }
    if (actionType === "comment_update") {
        return `Issue #${issueRef} comment updated`;
    }
    if (actionType === "status_change") {
        return `Issue #${issueRef} status changed`;
    }
    if (actionType === "description_changed") {
        return `Issue #${issueRef} description updated.`;
    }
    if (actionType === "assignee_change") {
        return `Issue #${issueRef} forwarded to new assignee`;
    }
    if (actionType === "attachment_change") {
        return `Issue #${issueRef} New file attached`;
    }
    if (actionType === "priority_change") {
        return `Issue #${issueRef} Priority changed.`;
    }
    if (actionType === "type_change") {
        return `Issue #${issueRef} Issue type changed.`;
    }
    if (actionType === "ui_canvas_change") {
        return `Issue #${issueRef} Related UI Canvas Changed`;
    }
    return `Issue #${issueRef} updated`;
};

export const serviceSendIssueActionNotification = async (
    projectId: string,
    issueId: string,
    issueKey: string,
    issueNo: number,
    assigneeId: string,
    actionBy: string,
    actionByName: string,
    actionType: 'issue_created' | 'comment_add' | 'comment_update' | 'status_change' | 'description_changed' | 'assignee_change' | 'attachment_change' | 'priority_change' | 'type_change' | 'ui_canvas_change',
    actionDetails?: any,
    issueDescription?: string
) => {
    try {
        if (!assigneeId || !issueId) return

        const recipientUid = await resolveNotificationRecipientUid(assigneeId)
        if (!recipientUid) {
            console.warn("Notification recipient could not be resolved", { issueId, assigneeId })
            return
        }

        const actorUid = normalizeString(actionBy)
        if (actorUid && recipientUid === actorUid) {
            return
        }

        const now = Timestamp.now()
        const normalizedIssueNo = Number(issueNo || 0)
        const issueRef = normalizedIssueNo || issueId
        let notificationTitle = buildIssueNotificationTitle(actionType, issueRef)
        let actionLabel = issueActionLabelMap[actionType] || "updated issue"

        if (actionType === 'status_change' && String((actionDetails as any)?.newStatus || '').toLowerCase() === 'closed') {
            notificationTitle = `Issue #${issueRef} Closed`
            actionLabel = "closed the issue."
        }

        if (actionType === 'issue_created' && Number((actionDetails as any)?.parentNo || 0) > 0) {
            const parentNo = Number((actionDetails as any).parentNo)
            notificationTitle = `Issue #${issueRef} New Child Issue Created`
            actionLabel = `created chilld issue from issue #${parentNo}`
        }

        if (actionType === 'attachment_change') {
            const addedCount = Number((actionDetails as any)?.addedCount || 0)
            if (addedCount > 0) {
                notificationTitle = `Issue #${issueRef} New file attached`
                actionLabel = "apload new file(s)"
            }
        }

        const notificationMessage = `${actionByName || "Unknown"} ${actionLabel}`
        const recipientEmail = await resolveUserEmailByUid(recipientUid)
        const projectName = await resolveProjectName(projectId)

        const notificationRef = await addDoc(collection(db, `${recipientUid}_notifications`), {
            type: "issue",
            title: notificationTitle,
            message: notificationMessage,
            projectId,
            projectName,
            userId: actionBy || "",
            assigneeId: recipientUid,
            read: false,
            createdAt: now,
            updatedAt: now,
            issueId,
            issueKey: issueKey || issueId,
            issueNo: normalizedIssueNo,
            actionType,
            actionDetails: actionDetails || {},
            description: issueDescription || "",
            body: issueDescription || "",
            emailSent: false,
        })
        const emailSent = await sendFrontendNotificationEmail({
            recipient: recipientUid,
            recipientEmail,
            notificationTitle,
            notificationMessage,
            issueId,
            issueNo: normalizedIssueNo,
            actionType,
            projectId,
            actionByName,
            issueDescription: issueDescription || "",
        })

        if (emailSent) {
            await updateDoc(notificationRef, { emailSent: true })
        }
    } catch (error: any) {
        console.error("❌ Error sending issue action notification:", error)
    }
}
