import { db, mailDb } from "@/config/firebase"
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, query, where, arrayUnion, Timestamp } from "firebase/firestore"
import { sendFrontendNotificationEmail } from "./frontendNotificationEmail"
import { syncUICanvasBacklogMetrics } from "@/ui-canvas/uic_ui_canvas/services/uICanvasAnalyticsService";

async function getActiveProjectById(id: string) {
    const docRef = doc(db, "ui_canvas", id) 
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
        return docSnap.data()
    }
    else return null
}
async function getApiCanvas(id: string) {
    const docRef = doc(db, "api_canvas", id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
        // Always include id so consumers can pass it to APICanvasDetailsDrawer
        return { id: docSnap.id, ...docSnap.data() }
    }
    else return null
}
async function getApiJson(id: string) {
    const docRef = doc(db, "projects", id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
        return docSnap.data()
    }
    else return null
}
const getTasks = async (projectId: string) => {
    try {
        const snapshot = await getDocs(collection(db, `backlog_${projectId}`))
        const tasks: any[] = []
        snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }))
        return tasks?.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        });

    } catch (err) {
        console.error("Error loading tasks:", err)
        return []
    }
}
const subscribeTasks = (projectId: string, callback: (tasks: any[]) => void) => {
    const colRef = collection(db, `backlog_${projectId}`);
    const unsubscribe = onSnapshot(colRef, snapshot => {
        const tasks: any[] = [];
        snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
        tasks.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        });
        callback(tasks);
    });
    return unsubscribe;
}
const createIssue = async (projectId: string, data: any) => {
    const counterRef = doc(db, "backlog_counter", projectId);
    const docSnap = await getDoc(counterRef);
    let nextNo = 1
    if (!docSnap.exists()) {
        await setDoc(counterRef, { lastTaskNo: 1 });
    } else {
        nextNo = docSnap.data().lastTaskNo + 1;
        await updateDoc(counterRef, { lastTaskNo: nextNo });
    }
    data.no = nextNo;

    const docRef = await addDoc(collection(db, `backlog_${projectId}`), data)

    if (data?.uiCanvasId) {
        try {
            await syncUICanvasBacklogMetrics(projectId, data.uiCanvasId);
        } catch (syncError) {
            console.error("Error syncing UI canvas analytics after issue creation:", syncError);
        }
    }

    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const creatorId = data?.createdByUid || data?.createdByEmail || data?.createdBy;
        const recipients = Array.from(
            new Set([
                data?.assignee,
                creatorId,
            ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
        );

        for (const recipient of recipients) {
            await sendIssueActionNotification(
                projectId,
                docRef.id,
                docRef.id,
                data?.no || nextNo,
                recipient as string,
                userData?.uid || '',
                userData?.displayName || userData?.email || data?.createdBy || 'Unknown',
                'issue_created',
                { issueType: data?.type || '', parentNo: data?.parentNo || null },
                data?.description || ''
            );
        }
    } catch (error) {
        console.error('Error sending issue created notification:', error);
    }

    return docRef.id
}
const getTaskById = async (projectId: string, id: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? docSnap.data() : null;
}
const editComment = async (projectId: string, id: string, comment: string | any[], actionBy?: string, actionByName?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    const beforeIssueDoc = await getDoc(docRef)
    const beforeIssueData = beforeIssueDoc.exists() ? beforeIssueDoc.data() : {}
    const previousComments = Array.isArray(beforeIssueData?.comment)
        ? beforeIssueData.comment
        : (typeof beforeIssueData?.comment === 'string' && beforeIssueData.comment.trim() !== '' ? [beforeIssueData.comment] : [])

    await updateDoc(docRef, { comment })
    
    // Get user info from localStorage if not provided
    let finalActionBy = actionBy;
    let finalActionByName = actionByName;
    if (!finalActionBy || !finalActionByName) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!finalActionBy) finalActionBy = userData?.uid;
            if (!finalActionByName) finalActionByName = userData?.displayName || userData?.email;
        } catch (error) {
            console.error("Error getting user data from localStorage:", error);
        }
    }
    
    const sanitizeCommentText = (value: any) =>
        typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';

    const toCommentArray = (value: any): any[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') return [value];
        return [];
    };

    // Get issue data for history/notification
    if (finalActionBy && finalActionByName) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                const issueData = issueDoc.data();
                const assigneeId = issueData.assignee;
                const creatorIdFromHistory = Array.isArray(issueData.history)
                    ? issueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
                    : "";
                const creatorId = issueData.createdByUid || creatorIdFromHistory || issueData.createdByEmail || issueData.createdBy;

                const nextComments = toCommentArray(comment)
                const isCommentAdded = nextComments.length > previousComments.length
                const commentActionType = isCommentAdded ? 'comment_add' : 'comment_update'

                let latestCommentText = ''
                let previousCommentText = ''

                if (isCommentAdded) {
                    const latestComment = nextComments[nextComments.length - 1]
                    latestCommentText = typeof latestComment === 'string'
                        ? sanitizeCommentText(latestComment)
                        : sanitizeCommentText(latestComment?.content || '')
                } else {
                    const previousById = new Map<string, any>()
                    previousComments.forEach((item: any, index: number) => {
                        const itemId = item?.id || `idx-${index}`
                        previousById.set(itemId, item)
                    })

                    for (let i = 0; i < nextComments.length; i += 1) {
                        const nextItem = nextComments[i]
                        const nextId = nextItem?.id || `idx-${i}`
                        const prevItem = previousById.get(nextId) ?? previousComments[i]

                        const oldText = typeof prevItem === 'string'
                            ? sanitizeCommentText(prevItem)
                            : sanitizeCommentText(prevItem?.content || '')
                        const newText = typeof nextItem === 'string'
                            ? sanitizeCommentText(nextItem)
                            : sanitizeCommentText(nextItem?.content || '')

                        if (oldText !== newText) {
                            previousCommentText = oldText
                            latestCommentText = newText
                            break
                        }
                    }
                }

                const shorten = (text: string) => `${text?.substring(0, 100) || ''}${text && text.length > 100 ? '...' : ''}`
                const historyDetails = isCommentAdded
                    ? `Added comment: ${shorten(latestCommentText)}`
                    : `Updated comment: ${shorten(previousCommentText)} -> ${shorten(latestCommentText)}`

                // History should be written even if assignee is empty
                await addIssueHistory(projectId, id, {
                    action: isCommentAdded ? "added a Comment" : "updated a Comment",
                    user: finalActionByName,
                    details: historyDetails
                });

                if (assigneeId) {
                    await sendIssueActionNotification(
                        projectId,
                        id,
                        id,
                        issueData.no || 0,
                        assigneeId,
                        finalActionBy,
                        finalActionByName,
                        commentActionType,
                        { commentPreview: shorten(latestCommentText) },
                        issueData.description
                    );

                    // Also notify the issue creator if different from assignee and commenter
                    const creatorUid = issueData.createdByUid
                        || await resolveNotificationRecipientUid(issueData.createdByEmail || issueData.createdBy || '');
                    if (
                        creatorUid &&
                        creatorUid !== finalActionBy
                    ) {
                        const assigneeUid = await resolveNotificationRecipientUid(assigneeId);
                        if (creatorUid !== assigneeUid) {
                            await sendIssueActionNotification(
                                projectId,
                                id,
                                id,
                                issueData.no || 0,
                                creatorUid,
                                finalActionBy,
                                finalActionByName,
                                commentActionType,
                                { commentPreview: shorten(latestCommentText) },
                                issueData.description
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error sending comment notification:", error);
        }
    }
}
const updateShEh = async (projectId: string, id: string, sh: any, eh: any, actionBy?: string, actionByName?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    await updateDoc(docRef, { sh, eh })
    try {
        const issueSnap = await getDoc(docRef)
        const uiCanvasId = issueSnap.exists() ? issueSnap.data()?.uiCanvasId : ""
        if (uiCanvasId) {
            await syncUICanvasBacklogMetrics(projectId, uiCanvasId)
        }
    } catch (syncError) {
        console.error("Error syncing UI canvas analytics after SH/EH update:", syncError)
    }
}
const updateClosedDate = async (projectId: string, id: string, date: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    await updateDoc(docRef, { closedDate: date })
}
const updateDescription = async (projectId: string, id: string, desc: string, actionBy?: string, actionByName?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    await updateDoc(docRef, { description: desc })

    const issueDoc = await getDoc(docRef)
    if (!issueDoc.exists()) return

    const issueData = issueDoc.data()
    const actorId = actionBy || JSON.parse(localStorage.getItem('userData') || '{}')?.uid || ""
    const actorName = actionByName || JSON.parse(localStorage.getItem('userData') || '{}')?.displayName || JSON.parse(localStorage.getItem('userData') || '{}')?.email || "Unknown"
    await sendIssueActionNotification(
        projectId,
        id,
        id,
        issueData.no || 0,
        issueData.assignee,
        actorId,
        actorName,
        'description_changed',
        {},
        desc
    )
}
const updateImageUrl = async (projectId: string, id: string, imageUrl: any[]) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    const beforeIssueDoc = await getDoc(docRef)
    const previousImageUrls = beforeIssueDoc.exists() && Array.isArray(beforeIssueDoc.data()?.imageUrl)
        ? beforeIssueDoc.data().imageUrl
        : []

    await updateDoc(docRef, { imageUrl })

    const issueDoc = await getDoc(docRef)
    if (!issueDoc.exists()) return

    const issueData = issueDoc.data()
    const actorId = JSON.parse(localStorage.getItem('userData') || '{}')?.uid || ""
    const actorName = JSON.parse(localStorage.getItem('userData') || '{}')?.displayName || JSON.parse(localStorage.getItem('userData') || '{}')?.email || "Unknown"

    const nextImageUrls = Array.isArray(imageUrl) ? imageUrl : []
    const getFileName = (item: any, index: number) => {
        if (!item) return `Attachment ${index + 1}`
        if (typeof item === 'string') return item.split('/').pop() || `Attachment ${index + 1}`
        return item.name || item.url?.split('/')?.pop() || `Attachment ${index + 1}`
    }
    const toAttachmentMeta = (item: any, index: number) => ({
        name: getFileName(item, index),
        url: typeof item === 'string' ? item : (item?.url || ''),
    })

    const previousKeys = new Set(previousImageUrls.map((item: any, idx: number) => item?.url || item || `prev-${idx}`))
    const nextKeys = new Set(nextImageUrls.map((item: any, idx: number) => item?.url || item || `next-${idx}`))

    const addedItems = nextImageUrls.filter((item: any, idx: number) => !previousKeys.has(item?.url || item || `next-${idx}`))
    const removedItems = previousImageUrls.filter((item: any, idx: number) => !nextKeys.has(item?.url || item || `prev-${idx}`))

    const addedAttachments = addedItems.map((item: any, idx: number) => toAttachmentMeta(item, idx))
    const removedAttachments = removedItems.map((item: any, idx: number) => toAttachmentMeta(item, idx))
    const addedNames = addedAttachments.map((item: any) => item.name)
    const removedNames = removedAttachments.map((item: any) => item.name)

    let historyAction = "updated Attachments"
    let historyDetails: any = {
        summary: `Attachments updated (${previousImageUrls.length} -> ${nextImageUrls.length})`,
        added: addedAttachments,
        removed: removedAttachments,
    }
    if (addedItems.length > 0 && removedItems.length === 0) {
        historyAction = "added an Attachment"
        historyDetails = {
            summary: `Added attachment${addedNames.length > 1 ? 's' : ''}: ${addedNames.join(', ')}`,
            added: addedAttachments,
            removed: [],
        }
    } else if (removedItems.length > 0 && addedItems.length === 0) {
        historyAction = "removed an Attachment"
        historyDetails = {
            summary: `Removed attachment${removedNames.length > 1 ? 's' : ''}: ${removedNames.join(', ')}`,
            added: [],
            removed: removedAttachments,
        }
    } else if (addedItems.length > 0 || removedItems.length > 0) {
        historyDetails = {
            summary: `Attachments updated. Added: ${addedNames.join(', ') || 'none'}. Removed: ${removedNames.join(', ') || 'none'}.`,
            added: addedAttachments,
            removed: removedAttachments,
        }
    }

    await addIssueHistory(projectId, id, {
        action: historyAction,
        user: actorName,
        oldValue: String(previousImageUrls.length),
        newValue: String(nextImageUrls.length),
        details: historyDetails,
    })

    if (addedItems.length > 0) {
        const creatorIdFromHistory = Array.isArray(issueData.history)
            ? issueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
            : "";
        const creatorId = issueData.createdByUid || creatorIdFromHistory || issueData.createdByEmail || issueData.createdBy;
        const recipients = Array.from(
            new Set([
                issueData.assignee,
                creatorId,
            ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
        );

        for (const recipient of recipients) {
            await sendIssueActionNotification(
                projectId,
                id,
                id,
                issueData.no || 0,
                recipient as string,
                actorId,
                actorName,
                'attachment_change',
                {
                    imageCount: nextImageUrls.length,
                    addedCount: addedItems.length,
                    removedCount: removedItems.length,
                },
                issueData.description
            )
        }
    }
}
const changeStatus = async (projectId: string, id: string, status: string, actionBy?: string, actionByName?: string, oldStatus?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    
    // Get old status if not provided
    let currentOldStatus = oldStatus;
    if (!currentOldStatus) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                currentOldStatus = issueDoc.data().status;
            }
        } catch (error) {
            console.error("Error getting old status:", error);
        }
    }
    
    await updateDoc(docRef, { status })
    
    // Get user info from localStorage if not provided
    let finalActionBy = actionBy;
    let finalActionByName = actionByName;
    if (!finalActionBy || !finalActionByName) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!finalActionBy) finalActionBy = userData?.uid;
            if (!finalActionByName) finalActionByName = userData?.displayName || userData?.email;
        } catch (error) {
            console.error("Error getting user data from localStorage:", error);
        }
    }
    
    // Send notification
    if (finalActionBy && finalActionByName) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                const issueData = issueDoc.data();
                const assigneeId = issueData.assignee;
                const creatorIdFromHistory = Array.isArray(issueData.history)
                    ? issueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
                    : "";
                const creatorId = issueData.createdByUid || creatorIdFromHistory || issueData.createdByEmail || issueData.createdBy;                
                // Always add history entry
                await addIssueHistory(projectId, id, {
                    action: "changed the Status",
                    user: finalActionByName,
                    oldValue: currentOldStatus || '',
                    newValue: status,
                    details: `Status changed from "${currentOldStatus || 'N/A'}" to "${status}"`
                });

                if (assigneeId) {
                    await sendIssueActionNotification(
                        projectId,
                        id,
                        id,
                        issueData.no || 0,
                        assigneeId,
                        finalActionBy,
                        finalActionByName,
                        'status_change',
                        { oldStatus: currentOldStatus, newStatus: status },
                        issueData.description
                    );
                }

                if (creatorId && creatorId !== assigneeId) {
                    await sendIssueActionNotification(
                        projectId,
                        id,
                        id,
                        issueData.no || 0,
                        creatorId,
                        finalActionBy,
                        finalActionByName,
                        'status_change',
                        { oldStatus: currentOldStatus, newStatus: status },
                        issueData.description
                    );
                }            }
        } catch (error) {
            console.error("❌ Error sending status change notification:", error);
        }
    } else {
        console.warn('⚠️ changeStatus - Missing user info:', {
            finalActionBy,
            finalActionByName
        });
    }
}
const changeType = async (projectId: string, id: string, type: string, actionBy?: string, actionByName?: string, oldType?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    
    // Get old type if not provided
    let currentOldType = oldType;
    if (!currentOldType) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                currentOldType = issueDoc.data().type;
            }
        } catch (error) {
            console.error("Error getting old type:", error);
        }
    }
    
    await updateDoc(docRef, { type })
    
    // Get user info from localStorage if not provided
    let finalActionBy = actionBy;
    let finalActionByName = actionByName;
    if (!finalActionBy || !finalActionByName) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!finalActionBy) finalActionBy = userData?.uid;
            if (!finalActionByName) finalActionByName = userData?.displayName || userData?.email;
        } catch (error) {
            console.error("Error getting user data from localStorage:", error);
        }
    }
    
    // Send notification
    if (finalActionBy && finalActionByName) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                const issueData = issueDoc.data();
                const assigneeId = issueData.assignee;
                const creatorIdFromHistory = Array.isArray(issueData.history)
                    ? issueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
                    : "";
                const creatorId = issueData.createdByUid || creatorIdFromHistory || issueData.createdByEmail || issueData.createdBy;
                const recipients = Array.from(
                    new Set([
                        assigneeId,
                        creatorId,
                    ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
                );

                // Always add history
                await addIssueHistory(projectId, id, {
                    action: "changed the Type",
                    user: finalActionByName,
                    oldValue: currentOldType || '',
                    newValue: type,
                    details: `Type changed from "${currentOldType || 'N/A'}" to "${type}"`
                });

                // Notify assignee + creator (sender skips self-recipient)
                for (const recipient of recipients) {
                    await sendIssueActionNotification(
                        projectId,
                        id,
                        id,
                        issueData.no || 0,
                        recipient as string,
                        finalActionBy,
                        finalActionByName,
                        'type_change',
                        { oldType: currentOldType, newType: type },
                        issueData.description
                    );
                }
            }
        } catch (error) {
            console.error("Error sending type change notification:", error);
        }
    }
}
const updateAssign = async (projectId: string, id: string, status: any, actionBy?: string, actionByName?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    
    // Get old values before update
    let oldAssignee = null;
    let oldStatus = null;
    try {
        const issueDoc = await getDoc(docRef);
        if (issueDoc.exists()) {
            oldAssignee = issueDoc.data().assignee;
            oldStatus = issueDoc.data().status;
        }
    } catch (error) {
        console.error("Error getting old assignee:", error);
    }
    
    const updatePayload: any = { status };
    if (status === "closed") {
        const now = new Date();
        updatePayload.closedDate = now.toISOString().replace("T", " ").slice(0, 19);
    }
    await updateDoc(docRef, updatePayload)
    
    // Get user info from localStorage if not provided
    let finalActionBy = actionBy;
    let finalActionByName = actionByName;
    if (!finalActionBy || !finalActionByName) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!finalActionBy) finalActionBy = userData?.uid;
            if (!finalActionByName) finalActionByName = userData?.displayName || userData?.email;
        } catch (error) {
            console.error("Error getting user data from localStorage:", error);
        }
    }
    if (finalActionBy && finalActionByName && status === "closed") {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                const issueData = issueDoc.data();
                const creatorIdFromHistory = Array.isArray(issueData.history)
                    ? issueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
                    : "";
                const creatorId = issueData.createdByUid || creatorIdFromHistory || issueData.createdByEmail || issueData.createdBy;
                const recipients = Array.from(
                    new Set([
                        issueData.assignee,
                        creatorId,
                    ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
                );
                
                // Add history entry
                await addIssueHistory(projectId, id, {
                    action: "closed and sent the Issue",
                    user: finalActionByName,
                    oldValue: oldStatus || '',
                    newValue: status,
                    details: `Issue closed and sent`
                });

                for (const recipient of recipients) {
                    await sendIssueActionNotification(
                        projectId,
                        id,
                        id,
                        issueData.no || 0,
                        recipient as string,
                        finalActionBy,
                        finalActionByName,
                        'status_change',
                        { oldStatus: oldStatus || '', newStatus: status },
                        issueData.description || ''
                    );
                }
                
            }
        } catch (error) {
            console.error("Error sending close and send notification:", error);
        }
    }
}
const updateForward = async (projectId: string, id: string, assignee: any, actionBy?: string, actionByName?: string, assigneeName?: string, assigneePhotoUrl?: string | null) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    
    // Get old assignee
    let oldAssignee = null;
    try {
        const issueDoc = await getDoc(docRef);
        if (issueDoc.exists()) {
            oldAssignee = issueDoc.data().assignee;
        }
    } catch (error) {
        console.error("Error getting old assignee:", error);
    }
    
    await updateDoc(docRef, { 
        assignee,
        ...(assigneeName ? { assigneeName } : {}),
        ...(assigneePhotoUrl !== undefined ? { assigneePhotoUrl } : {}),
    })
    
    // Get user info from localStorage if not provided
    let finalActionBy = actionBy;
    let finalActionByName = actionByName;
    if (!finalActionBy || !finalActionByName) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!finalActionBy) finalActionBy = userData?.uid;
            if (!finalActionByName) finalActionByName = userData?.displayName || userData?.email;
        } catch (error) {
            console.error("Error getting user data from localStorage:", error);
        }
    }
    
    // Send notification
    if (finalActionBy && finalActionByName) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                const issueData = issueDoc.data();
                const creatorIdFromHistory = Array.isArray(issueData.history)
                    ? issueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
                    : "";
                const creatorId = issueData.createdByUid || creatorIdFromHistory || issueData.createdByEmail || issueData.createdBy;
                const recipients = Array.from(
                    new Set([
                        assignee,
                        oldAssignee,
                        creatorId,
                    ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
                );
                
                // Add history entry
                await addIssueHistory(projectId, id, {
                    action: "changed the Assignee",
                    user: finalActionByName,
                    oldValue: oldAssignee || '',
                    newValue: assignee,
                    details: `Assignee changed`
                });

                // Notify new assignee, old assignee and creator (self-recipient is skipped in sender)
                for (const recipient of recipients) {
                    await sendIssueActionNotification(
                        projectId,
                        id,
                        id,
                        issueData.no || 0,
                        recipient as string,
                        finalActionBy,
                        finalActionByName,
                        'assignee_change',
                        { oldAssignee: oldAssignee || '', newAssignee: assignee || '' },
                        issueData.description
                    );
                }
            }
        } catch (error) {
            console.error("Error sending forward notification:", error);
        }
    }
}
const addApiRelations = async (projectId: string, id: string, description: string, api: string, actionBy?: string, actionByName?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    // Parse api value: format is "nameTid" or just id
    let apiCanvasId = api;
    let apiCanvasName = api;
    
    if (api && api.includes("T")) {
        const parts = api.split("T");
        apiCanvasName = parts[0];
        apiCanvasId = parts[1] || parts[0];
    }
    
    await updateDoc(docRef, { 
        api, 
        apiDescription: description || "",
        apiCanvasId: apiCanvasId,
        apiCanvasName: apiCanvasName
    })

}
const updateUICanvas = async (projectId: string, issueIds: string[], uiCanvasId: string, uiCanvasName: string, actionBy?: string, actionByName?: string) => {
    const updatePromises = issueIds.map(async (issueId) => {
        const docRef = doc(db, `backlog_${projectId}`, issueId);
        let oldCanvasName = '';
        let oldCanvasId = '';
        try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                oldCanvasName = snap.data()?.uiCanvas || '';
                oldCanvasId = snap.data()?.uiCanvasId || '';
            }
        } catch (e) {
            // ignore
        }

        await updateDoc(docRef, {
            uiCanvasId: uiCanvasId,
            uiCanvas: uiCanvasName
        });

        const finalUser = actionByName || (() => {
            try {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                return userData?.displayName || userData?.email || 'Unknown';
            } catch {
                return 'Unknown';
            }
        })();

        await addIssueHistory(projectId, issueId, {
            action: "updated Related UI Canvas",
            user: finalUser,
            oldValue: oldCanvasName || '',
            newValue: uiCanvasName || '',
            details: `Related UI Canvas updated`
        });

        const updatedIssueSnap = await getDoc(docRef);
        const updatedIssueData = updatedIssueSnap.exists() ? updatedIssueSnap.data() : {};

        const creatorIdFromHistory = Array.isArray(updatedIssueData.history)
            ? updatedIssueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
            : "";
        const creatorId = updatedIssueData.createdByUid || creatorIdFromHistory || updatedIssueData.createdByEmail || updatedIssueData.createdBy;
        const recipients = Array.from(
            new Set([
                updatedIssueData.assignee,
                creatorId,
            ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
        );

        for (const recipient of recipients) {
            await sendIssueActionNotification(
                projectId,
                issueId,
                issueId,
                updatedIssueData.no || 0,
                recipient as string,
                actionBy || "",
                finalUser,
                'ui_canvas_change',
                { oldCanvasName, newCanvasName: uiCanvasName },
                updatedIssueData.description || ""
            );
        }

        if (oldCanvasId && oldCanvasId !== uiCanvasId) {
            await syncUICanvasBacklogMetrics(projectId, oldCanvasId);
        }
        if (uiCanvasId) {
            await syncUICanvasBacklogMetrics(projectId, uiCanvasId);
        }
    });
    await Promise.all(updatePromises);
}

// Sync backlog issues when UI canvas description is updated
const syncBacklogIssuesOnDescriptionUpdate = async (projectId: string, uiCanvasId: string, inputId: string, descId: string, key: string, updatedDescriptionData: any, updatedDescriptionText: string) => {
    try {
        if (!projectId || !uiCanvasId || !inputId || !descId || !key) {
            console.warn("Missing required parameters for backlog sync");
            return;
        }

        const backlogRef = collection(db, `backlog_${projectId}`);
        const snapshot = await getDocs(backlogRef);
        
        const matchingIssues: any[] = [];
        snapshot.forEach((doc) => {
            const issueData = { id: doc.id, ...doc.data() };
            // Match issues by uiCanvasId, inputId, key, and descId
            // For formAction, descId might be the action value, so we match by inputId and key
            const matchesCanvas = 'uiCanvasId' in issueData && issueData.uiCanvasId === uiCanvasId;
            const matchesInput = 'inputId' in issueData && issueData.inputId === inputId;
            const matchesKey = 'key' in issueData && issueData.key === key;
            
            // For formAction, match only by inputId and key (since each input has only one formAction)
            // For others, also match by descId
            let matchesDescId = true;
            if (key !== 'formAction') {
                matchesDescId = 'descId' in issueData && issueData.descId === descId;
            } else {
                // For formAction, descId might be stored as action value, so check both
                matchesDescId = ('descId' in issueData && (issueData.descId === descId || issueData.descId === updatedDescriptionData?.action));
            }
            
            if (matchesCanvas && matchesInput && matchesKey && matchesDescId) {
                matchingIssues.push(issueData);
            }
        });

        if (matchingIssues.length === 0) {            return;
        }

        // Update each matching issue
        const updatePromises = matchingIssues.map(async (issue) => {
            // Parse existing description to preserve form description
            let formDescription = issue.description || '';
            let existingFormDescription = '';
            
            if (issue.description?.includes('--- UI Canvas Input Description ---')) {
                const parts = issue.description.split('--- UI Canvas Input Description ---');
                existingFormDescription = parts[0]?.trim() || '';
                formDescription = existingFormDescription;
            }
            
            // Build new description with updated UI canvas description
            let finalDescription = '';
            if (formDescription && updatedDescriptionText) {
                finalDescription = `${formDescription}\n\n--- UI Canvas Input Description ---\n${updatedDescriptionText}`;
            } else if (formDescription) {
                finalDescription = formDescription;
            } else if (updatedDescriptionText) {
                finalDescription = updatedDescriptionText;
            }
            
            // Update issue with new description and description data
            const updateData: any = {
                description: finalDescription,
                uiCanvasDescriptionData: updatedDescriptionData ? JSON.stringify(updatedDescriptionData) : null,
            };

            // If API Canvas relation (apiCall key), add API Canvas fields to top level
            if (key === 'apiCall' && updatedDescriptionData) {
                updateData.apiCanvasId = updatedDescriptionData.api || null;
                updateData.apiCanvasName = updatedDescriptionData.apiName || null;
                updateData.apiCanvasDescription = updatedDescriptionData.description || null;
            }
            
            const docRef = doc(db, `backlog_${projectId}`, issue.id);
            await updateDoc(docRef, updateData);
        });

        await Promise.all(updatePromises);    } catch (error) {
        console.error("Error syncing backlog issues:", error);
    }
}

const updateCodeLine = async (projectId: string, issueId: string, codeLine: number | null) => {
    try {
        const docRef = doc(db, `backlog_${projectId}`, issueId);
        await updateDoc(docRef, { codeLine });
        const issueSnap = await getDoc(docRef);
        const uiCanvasId = issueSnap.exists() ? issueSnap.data()?.uiCanvasId : "";
        if (uiCanvasId) {
            await syncUICanvasBacklogMetrics(projectId, uiCanvasId);
        }
    } catch (error) {
        console.error("Error updating code line:", error);
        throw error;
    }
}

const buildIssueCreatedHistoryEntry = (issueNo: string | number, user?: string, userId?: string) => ({
    action: "created the Work item",
    user: user || "Unknown",
    userId: userId || "",
    details: `Issue #${issueNo} was created`
})

const EMAIL_COLLECTION_NAME = "mail";

const isValidEmail = (value: any) =>
    typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizeString = (value: any) =>
    typeof value === "string" ? value.trim() : "";

const escapeHtml = (value: any) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const resolveProjectName = async (projectId: string) => {
    const normalizedProjectId = normalizeString(projectId);
    if (!normalizedProjectId) return "";

    try {
        const projectDoc = await getDoc(doc(db, "projects", normalizedProjectId));
        if (projectDoc.exists()) {
            const projectName = projectDoc.data()?.name;
            if (typeof projectName === "string" && projectName.trim()) {
                return projectName.trim();
            }
        }
    } catch (error) {
        console.error("Error resolving project name:", error);
    }

    return normalizedProjectId;
};

const resolveUserEmailByUid = async (uid: string) => {
    if (!uid) return "";
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            const email = userDoc.data()?.email;
            if (isValidEmail(email)) return email.trim();
        }
    } catch (error) {
        console.error("Error resolving user email by uid:", error);
    }

    // getUserData funksiyası silindi, yalnız Firestore istifadə olunur

    return "";
};

const resolveUserEmailByDisplayName = async (displayName: string) => {
    if (!displayName) return "";
    try {
        const snap = await getDocs(query(collection(db, "users"), where("displayName", "==", displayName)));
        if (!snap.empty) {
            const email = snap.docs[0].data()?.email;
            if (isValidEmail(email)) return email.trim();
        }
    } catch (error) {
        console.error("Error resolving user email by displayName:", error);
    }
    return "";
};

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
        const directUserDoc = await getDoc(doc(db, "users", normalized));
        if (directUserDoc.exists()) {
            return extractUid(directUserDoc) || normalized;
        }
    } catch (error) {
        console.error("Error resolving notification recipient by uid:", error);
    }

    try {
        const byDisplayName = await getDocs(query(collection(db, "users"), where("displayName", "==", normalized)));
        if (!byDisplayName.empty) {
            return extractUid(byDisplayName.docs[0]);
        }
    } catch (error) {
        console.error("Error resolving notification recipient by displayName:", error);
    }

    if (isValidEmail(normalized)) {
        try {
            const byEmail = await getDocs(query(collection(db, "users"), where("email", "==", normalized)));
            if (!byEmail.empty) {
                return extractUid(byEmail.docs[0]);
            }
        } catch (error) {
            console.error("Error resolving notification recipient by email:", error);
        }
    }

    // Case-insensitive fallback for legacy records storing displayName/email with different casing.
    try {
        const allUsers = await getDocs(collection(db, "users"));
        const found = allUsers.docs.find((userDoc) => matchesCandidate(userDoc));
        if (found) {
            return extractUid(found);
        }
    } catch (error) {
        console.error("Error resolving notification recipient with case-insensitive lookup:", error);
    }

    // Fallback: keep provided identifier (usually uid) to avoid dropping notifications
    // when users collection is not readable for current client.
    return normalized;
};

const issueActionLabelMap: Record<string, string> = {
    status_change: "changed issue status",
    type_change: "changed the issue type.",
    comment_add: "added a comment",
    comment_update: "updated the comment",
    description_changed: "updated issue description",
    priority_change: "changed the issue priority.",
    assignee_change: "changed issue assignee",
    ui_canvas_change: "changed the Related UI Canvas",
    attachment_change: "apload new file(s)",
    issue_created: "created a new issue",
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

const resolveIssueHistoryEmailRecipients = async (issueData: any) => {
    const recipients = new Set<string>();

    const directCandidates = [
        issueData?.assigneeEmail,
        issueData?.createdByEmail,
        issueData?.assignee,
        issueData?.createdBy,
    ];

    directCandidates.forEach((candidate: any) => {
        if (isValidEmail(candidate)) {
            recipients.add(candidate.trim().toLowerCase());
        }
    });

    const assigneeUid = normalizeString(issueData?.assignee);
    const assigneeEmailByUid = await resolveUserEmailByUid(assigneeUid);
    if (assigneeEmailByUid) recipients.add(assigneeEmailByUid.toLowerCase());

    const assigneeName = normalizeString(issueData?.assigneeName);
    const assigneeEmailByName = await resolveUserEmailByDisplayName(assigneeName);
    if (assigneeEmailByName) recipients.add(assigneeEmailByName.toLowerCase());

    const createdByName = normalizeString(issueData?.createdBy);
    const createdByEmailByName = await resolveUserEmailByDisplayName(createdByName);
    if (createdByEmailByName) recipients.add(createdByEmailByName.toLowerCase());

    return Array.from(recipients);
};

const stringifyHistoryDetails = (details: any) => {
    if (!details) return "";
    if (typeof details === "string") return details;
    try {
        return JSON.stringify(details);
    } catch {
        return "";
    }
};

const enqueueIssueHistoryEmail = async (
    projectId: string,
    issueId: string,
    issueData: any,
    historyEntry: any
) => {
    try {
        const to = await resolveIssueHistoryEmailRecipients(issueData);
        if (!to.length) {
            return;
        }

        const issueNo = issueData?.no || issueId;
        const action = historyEntry?.action || "updated the issue";
        const actor = historyEntry?.user || "System";
        const details = stringifyHistoryDetails(historyEntry?.details);
        const projectName = await resolveProjectName(projectId);

        const issuePath = `/backlog-canvas?key=${issueId}`;
        const issueUrl = typeof window !== "undefined" && window.location?.origin
            ? `${window.location.origin}${issuePath}`
            : issuePath;

        const subject = `Issue #${issueNo} updated - ${action}`;
        const html = `
            <div style="margin:0; padding:24px; background:#f4f7fb; font-family:Arial, sans-serif; color:#0f172a;">
                <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                    <div style="padding:20px 24px; background:linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);">
                        <div style="display:inline-block; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.16); color:#dbeafe; font-size:12px; font-weight:700; letter-spacing:0.4px;">
                            BACKLOG UPDATE
                        </div>
                        <h2 style="margin:12px 0 4px; color:#ffffff; font-size:26px; line-height:1.2;">
                            Issue #${escapeHtml(issueNo)} updated
                        </h2>
                        <p style="margin:0; color:#dbeafe; font-size:14px;">
                            ${escapeHtml(projectName || projectId)}
                        </p>
                    </div>

                    <div style="padding:24px;">
                        <div style="margin-bottom:18px; padding:16px; border:1px solid #dbeafe; border-radius:12px; background:#f8fbff;">
                            <div style="font-size:14px; color:#334155; margin-bottom:8px;">
                                <strong style="color:#0f172a;">Action:</strong> ${escapeHtml(action)}
                            </div>
                            <div style="font-size:14px; color:#334155; margin-bottom:8px;">
                                <strong style="color:#0f172a;">By:</strong> ${escapeHtml(actor)}
                            </div>
                            <div style="font-size:14px; color:#334155;">
                                <strong style="color:#0f172a;">Project:</strong> ${escapeHtml(projectName || projectId)}
                            </div>
                        </div>

                        ${details ? `
                            <div style="margin-bottom:20px;">
                                <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#2563eb; margin-bottom:8px;">
                                    Details
                                </div>
                                <div style="padding:14px 16px; border-radius:12px; background:#f8fafc; border:1px solid #e2e8f0; color:#1e293b; font-size:14px; line-height:1.6; white-space:pre-wrap;">
                                    ${escapeHtml(details)}
                                </div>
                            </div>
                        ` : ""}

                        <a href="${issueUrl}"
                           style="display:inline-block; padding:12px 18px; border-radius:10px; background:#2563eb; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700;">
                            Open issue
                        </a>
                    </div>
                </div>
            </div>
        `;

        for (const recipientEmail of to) {
            await addDoc(collection(mailDb, EMAIL_COLLECTION_NAME), {
                to: recipientEmail,
                message: {
                    subject,
                    html,
                },
                meta: {
                    type: "issue_history_change",
                    projectId,
                    issueId,
                    issueNo,
                    action,
                },
                createdAt: Timestamp.now(),
            });
        }
    } catch (error) {
        console.error("Error queueing history email:", error);
    }
};

// Add history entry to issue
const addIssueHistory = async (projectId: string, issueId: string, historyEntry: any) => {
    try {
        const docRef = doc(db, `backlog_${projectId}`, issueId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const currentData = docSnap.data();
            const existingHistory = currentData.history || [];
            
            const newHistoryEntry = {
                ...historyEntry,
                timestamp: Timestamp.now(),
                id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            
            await updateDoc(docRef, {
                history: arrayUnion(newHistoryEntry),
                updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19)
            });

        }
    } catch (error) {
        console.error("Error adding issue history:", error);
        // Don't throw, just log the error
    }
}

// Send notification for issue action
const sendIssueActionNotification = async (
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
        if (!assigneeId || !issueId) {
            return;
        }

        const recipientUid = await resolveNotificationRecipientUid(assigneeId);
        if (!recipientUid) {
            console.warn("Notification recipient could not be resolved", { issueId, assigneeId });
            return;
        }

        const actorUid = normalizeString(actionBy);
        if (actorUid && recipientUid === actorUid) {
            return;
        }

        const now = Timestamp.now();
        const normalizedIssueNo = Number(issueNo || 0);
        const issueRef = normalizedIssueNo || issueId;
        let notificationTitle = buildIssueNotificationTitle(actionType, issueRef);
        let actionLabel = issueActionLabelMap[actionType] || "updated issue";

        if (actionType === 'status_change' && String((actionDetails as any)?.newStatus || '').toLowerCase() === 'closed') {
            notificationTitle = `Issue #${issueRef} Closed`;
            actionLabel = "closed the issue.";
        }

        if (actionType === 'issue_created' && Number((actionDetails as any)?.parentNo || 0) > 0) {
            const parentNo = Number((actionDetails as any).parentNo);
            notificationTitle = `Issue #${issueRef} New Child Issue Created`;
            actionLabel = `created chilld issue from issue #${parentNo}`;
        }

        if (actionType === 'attachment_change') {
            const addedCount = Number((actionDetails as any)?.addedCount || 0);
            if (addedCount > 0) {
                notificationTitle = `Issue #${issueRef} New file attached`;
                actionLabel = "apload new file(s)";
            }
        }
        const notificationMessage = `${actionByName || "Unknown"} ${actionLabel}`;
        const recipientEmail = await resolveUserEmailByUid(recipientUid);
        const projectName = await resolveProjectName(projectId);

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
        });
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
        });
        if (emailSent) {
            await updateDoc(notificationRef, { emailSent: true });
        }
    } catch (error: any) {
        console.error("❌ Error sending issue action notification:", error);
    }
}

// Common Descriptions functions
const getCommonDescriptions = async (projectId: string) => {
    try {
        const snapshot = await getDocs(collection(db, `common_descriptions_${projectId}`));
        const descriptions: any[] = [];
        snapshot.forEach(doc => {
            descriptions.push({ id: doc.id, ...doc.data() });
        });
        // Sort by usageCount descending, then by name
        return descriptions.sort((a, b) => {
            if (b.usageCount !== a.usageCount) {
                return (b.usageCount || 0) - (a.usageCount || 0);
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    } catch (error) {
        console.error("Error loading common descriptions:", error);
        return [];
    }
}

const addCommonDescription = async (projectId: string, name: string) => {
    try {
        // Check if description already exists
        const snapshot = await getDocs(
            query(collection(db, `common_descriptions_${projectId}`), where('name', '==', name))
        );
        
        if (!snapshot.empty) {
            // Update usage count if exists
            const existingDoc = snapshot.docs[0];
            const currentCount = existingDoc.data().usageCount || 0;
            await updateDoc(existingDoc.ref, { usageCount: currentCount + 1 });
            return existingDoc.id;
        } else {
            // Create new description
            const docRef = await addDoc(collection(db, `common_descriptions_${projectId}`), {
                name: name.trim(),
                usageCount: 1,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            return docRef.id;
        }
    } catch (error) {
        console.error("Error adding common description:", error);
        throw error;
    }
}

const updateCommonDescription = async (projectId: string, id: string, name: string) => {
    try {
        const docRef = doc(db, `common_descriptions_${projectId}`, id);
        await updateDoc(docRef, {
            name: name.trim(),
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Error updating common description:", error);
        throw error;
    }
}

const deleteCommonDescription = async (projectId: string, id: string) => {
    try {
        const docRef = doc(db, `common_descriptions_${projectId}`, id);
        await updateDoc(docRef, { deleted: true, updatedAt: Timestamp.now() });
    } catch (error) {
        console.error("Error deleting common description:", error);
        throw error;
    }
}

const incrementDescriptionUsage = async (projectId: string, name: string) => {
    try {
        const snapshot = await getDocs(
            query(collection(db, `common_descriptions_${projectId}`), where('name', '==', name))
        );
        
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const currentCount = snapshot.docs[0].data().usageCount || 0;
            await updateDoc(docRef, { 
                usageCount: currentCount + 1,
                updatedAt: Timestamp.now()
            });
        }
    } catch (error) {
        console.error("Error incrementing description usage:", error);
    }
}
const changePriority = async (projectId: string, id: string, priority: string, actionBy?: string, actionByName?: string, oldPriority?: string) => {
    const docRef = doc(db, `backlog_${projectId}`, id)
    
    // Get old priority if not provided
    let currentOldPriority = oldPriority;
    if (!currentOldPriority) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                currentOldPriority = issueDoc.data().priority;
            }
        } catch (error) {
            console.error("Error getting old priority:", error);
        }
    }
    
    await updateDoc(docRef, { priority })
    
    // Get user info from localStorage if not provided
    let finalActionBy = actionBy;
    let finalActionByName = actionByName;
    if (!finalActionBy || !finalActionByName) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!finalActionBy) finalActionBy = userData?.uid;
            if (!finalActionByName) finalActionByName = userData?.displayName || userData?.email;
        } catch (error) {
            console.error("Error getting user data from localStorage:", error);
        }
    }
    
    // Send notification
    if (finalActionBy && finalActionByName) {
        try {
            const issueDoc = await getDoc(docRef);
            if (issueDoc.exists()) {
                const issueData = issueDoc.data();
                const assigneeId = issueData.assignee;
                const creatorIdFromHistory = Array.isArray(issueData.history)
                    ? issueData.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
                    : "";
                const creatorId = issueData.createdByUid || creatorIdFromHistory || issueData.createdByEmail || issueData.createdBy;
                const recipients = Array.from(
                    new Set([
                        assigneeId,
                        creatorId,
                    ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
                );

                // Always add history
                await addIssueHistory(projectId, id, {
                    action: "changed the Priority",
                    user: finalActionByName,
                    oldValue: currentOldPriority || '',
                    newValue: priority,
                    details: `Priority changed from "${currentOldPriority || 'N/A'}" to "${priority}"`
                });

                // Notify assignee + creator (sender skips self-recipient)
                for (const recipient of recipients) {
                    await sendIssueActionNotification(
                        projectId,
                        id,
                        id,
                        issueData.no || 0,
                        recipient as string,
                        finalActionBy,
                        finalActionByName,
                        'priority_change',
                        { oldPriority: currentOldPriority, newPriority: priority },
                        issueData.description
                    );
                }
            }
        } catch (error) {
            console.error("Error sending priority change notification:", error);
        }
    }
}

const services = {
    getApiJson,
    getActiveProjectById,
    createIssue,
    getTasks,
    getTaskById,
    editComment,
    updateShEh,
    updateDescription,
    updateImageUrl,
    updateClosedDate,
    changeStatus,
    changeType,
    updateAssign,
    updateForward,
    addApiRelations,
    getApiCanvas,
    subscribeTasks,
    syncBacklogIssuesOnDescriptionUpdate,
    updateUICanvas,
    updateCodeLine,
    buildIssueCreatedHistoryEntry,
    addIssueHistory,
    sendIssueActionNotification,
    getCommonDescriptions,
    addCommonDescription,
    updateCommonDescription,
    deleteCommonDescription,
    incrementDescriptionUsage,
    changePriority
}

export default services
