import { db, mailDb } from "@/config/firebase";
import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

const FIREBASE_MAIL_COLLECTION = import.meta.env.VITE_FIREBASE_MAIL_COLLECTION || "mail";
const APP_BASE_URL = window.location.origin;

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

const resolveProjectName = async (projectId?: string) => {
    const normalized = normalizeString(projectId);
    if (!normalized) return "";

    try {
        const projectDoc = await getDoc(doc(db, "projects", normalized));
        if (projectDoc.exists()) {
            const projectName = projectDoc.data()?.name;
            if (typeof projectName === "string" && projectName.trim()) {
                return projectName.trim();
            }
        }
    } catch (error) {
        console.error("Error resolving project name for email:", error);
    }

    return normalized;
};

const resolveRecipientEmail = async (recipient: string) => {
    const normalized = normalizeString(recipient);
    if (!normalized) return "";

    if (isValidEmail(normalized)) {
        return normalized;
    }

    try {
        const directDoc = await getDoc(doc(db, "users", normalized));
        if (directDoc.exists()) {
            const email = directDoc.data()?.email;
            if (isValidEmail(email)) {
                return email.trim();
            }
        }
    } catch (error) {
        console.error("Error resolving email by direct uid:", error);
    }

    // getUserData funksiyası silindi, yalnız Firestore istifadə olunur

    try {
        const byDisplayName = await getDocs(
            query(collection(db, "users"), where("displayName", "==", normalized))
        );
        if (!byDisplayName.empty) {
            const email = byDisplayName.docs[0].data()?.email;
            if (isValidEmail(email)) {
                return email.trim();
            }
        }
    } catch (error) {
        console.error("Error resolving email by displayName:", error);
    }

    try {
        const byEmail = await getDocs(
            query(collection(db, "users"), where("email", "==", normalized))
        );
        if (!byEmail.empty) {
            const email = byEmail.docs[0].data()?.email;
            if (isValidEmail(email)) {
                return email.trim();
            }
        }
    } catch (error) {
        console.error("Error resolving email by exact email query:", error);
    }

    try {
        const allUsers = await getDocs(collection(db, "users"));
        const found = allUsers.docs.find((userDoc) => {
            const data = userDoc.data() || {};
            return [
                data?.uid,
                userDoc.id,
                data?.displayName,
                data?.name,
                data?.userName,
                data?.email,
            ].some((value) => normalizeString(value).toLowerCase() === normalized.toLowerCase());
        });

        if (found) {
            const email = found.data()?.email;
            if (isValidEmail(email)) {
                return email.trim();
            }
        }
    } catch (error) {
        console.error("Error resolving email by fallback lookup:", error);
    }

    return "";
};

export const canSendFrontendNotificationEmails = () =>
    Boolean(FIREBASE_MAIL_COLLECTION);

interface SendFrontendNotificationEmailParams {
    recipient: string;
    recipientEmail?: string;
    notificationTitle: string;
    notificationMessage: string;
    issueId?: string;
    issueNo?: number;
    actionType?: string;
    projectId?: string;
    actionByName?: string;
    issueDescription?: string;
}

export const sendFrontendNotificationEmail = async ({
    recipient,
    recipientEmail,
    notificationTitle,
    notificationMessage,
    issueId,
    issueNo,
    actionType,
    projectId,
    actionByName,
    issueDescription,
}: SendFrontendNotificationEmailParams) => {
    if (!canSendFrontendNotificationEmails()) {
        console.warn(
            "Frontend notification email skipped because EmailJS env variables are missing."
        );
        return false;
    }

    const resolvedRecipientEmail = isValidEmail(recipientEmail)
        ? recipientEmail!.trim()
        : await resolveRecipientEmail(recipient);

    if (!resolvedRecipientEmail) {
        console.warn("Frontend notification email skipped because recipient email was not resolved.", {
            recipient,
            issueId,
        });
        return false;
    }

    const issueRef = Number(issueNo || 0) > 0 ? `#${issueNo}` : issueId || "";
    const projectName = await resolveProjectName(projectId);
    const notificationsUrl = issueId
        ? `${APP_BASE_URL}/notifications?issueId=${encodeURIComponent(issueId)}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""}`
        : `${APP_BASE_URL}/notifications`;

    try {
        await addDoc(collection(mailDb, FIREBASE_MAIL_COLLECTION), {
            to: resolvedRecipientEmail,
            message: {
                subject: notificationTitle,
                html: `
                    <div style="margin:0; padding:24px; background:#f4f7fb; font-family:Arial, sans-serif; line-height:1.6; color:#111827;">
                        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                            <div style="padding:20px 24px; background:linear-gradient(135deg, #0f172a 0%, #2563eb 100%);">
                                <div style="display:inline-block; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.16); color:#dbeafe; font-size:12px; font-weight:700; letter-spacing:0.4px;">
                                    ISSUE NOTIFICATION
                                </div>
                                <h2 style="margin:12px 0 4px; color:#ffffff; font-size:26px; line-height:1.2;">${escapeHtml(notificationTitle)}</h2>
                                <p style="margin:0; color:#dbeafe; font-size:14px;">${escapeHtml(projectName || projectId || "-")}</p>
                            </div>

                            <div style="padding:24px;">
                                <p style="margin:0 0 18px; font-size:15px; color:#334155;">${escapeHtml(notificationMessage)}</p>

                                <div style="margin:16px 0 20px; padding:16px; border:1px solid #dbeafe; border-radius:12px; background:#f8fbff;">
                                    <p style="margin:0 0 8px;"><strong>Issue:</strong> ${escapeHtml(issueRef || "-")}</p>
                                    <p style="margin:0 0 8px;"><strong>Project:</strong> ${escapeHtml(projectName || projectId || "-")}</p>
                                    <p style="margin:0 0 8px;"><strong>Action Type:</strong> ${escapeHtml(actionType || "-")}</p>
                                    <p style="margin:0;"><strong>Description:</strong> ${escapeHtml(issueDescription || "-")}</p>
                                </div>

                                <p style="margin-top: 16px;">
                            <a href="${notificationsUrl}"
                               style="display:inline-block; padding:12px 18px; border-radius:10px; background:#2563eb; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700;">
                                Open issue
                            </a>
                                </p>
                            </div>
                        </div>
                    </div>
                `,
            },
            
            meta: {
                issueId: issueId || "",
                issueRef,
                projectId: projectId || "",
                actionType: actionType || "",
                actionByName: actionByName || "Unknown User",
            },
        });

        return true;
    } catch (error) {
        console.error("Firebase notification mail enqueue failed:", error);
        return false;
    }
};
