import { RootState, useAppSelector } from "@/store";
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import { v4 as uuidv4 } from "uuid";
import { message } from "antd";

export default function useUICanvasExternalLinkCreate({ type }) {
    const { currentCanvas } = useAppSelector((state: RootState) => state.auth);
    const currentProject = useAppSelector((state) => state.project.currentProject);
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");

    const createExternalLink = async ({
        title,
        url,
        file_name,
        code,
    }: {
        title: string;
        url?: string;
        file_name?: string;
        code?: string;
    }) => {
        const canvasId = localStorage.getItem("currentUI") || currentCanvas?.id;

        if (!currentProject?.id || !canvasId) {
            console.error("Project ID and UI Canvas ID are required");
            const error = new Error("Please select a UI Canvas first");
            message.error("Please select a UI Canvas first");
            throw error;
        }

        const dynamicId = uuidv4();
        const docRef = doc(db, "external_links", currentProject.id);
        const normalizedType = type === "embedded_code" ? "embed" : type;

        try {
            const docSnap = await getDoc(docRef);
            let nextOrder = 1;

            if (docSnap.exists()) {
                const data = docSnap.data();
                const canvasLinks = data?.links?.[canvasId];

                if (canvasLinks) {
                    nextOrder = Object.keys(canvasLinks).length + 1;
                }
            }

            const existingData = docSnap.exists() ? docSnap.data() : {};
            const existingLinks = existingData?.links || {};
            const existingCanvasLinks = existingLinks[canvasId] || {};
            const updatedExistingCanvasLinks = Object.fromEntries(
                Object.entries(existingCanvasLinks).map(([key, value]: [string, any]) => [
                    key,
                    {
                        ...value,
                        defaultView: false,
                    },
                ])
            );

            const newLinkData = {
                [dynamicId]: {
                    id: dynamicId,
                    type: normalizedType,
                    title,
                    ...(file_name ? { file_name } : {}),
                    ...(normalizedType === "image" ? { image: url } : {}),
                    ...(normalizedType === "embed" ? { code, url: code } : {}),
                    ...(normalizedType !== "image" && normalizedType !== "embed" ? { url } : {}),
                    defaultView: true,
                    order: nextOrder,
                    lastUpdated: new Date().toISOString(),
                },
            };

            const newData = {
                links: {
                    ...existingLinks,
                    [canvasId]: {
                        ...updatedExistingCanvasLinks,
                        ...newLinkData,
                    },
                },
            };

            await setDoc(docRef, newData, { merge: true });

            await addExternalLinkHistoryRecord({
                uiCanvasId: canvasId,
                externalLinkId: dynamicId,
                title,
                url: url || code || "",
                type: normalizedType,
                file_name,
            });

            message.success("External Link created successfully");
            return dynamicId;
        } catch (error) {
            console.error("Error while creating external link:", error);
            message.error("Something went wrong");
            throw error;
        }
    };

    const addExternalLinkHistoryRecord = async (historyData: {
        uiCanvasId: string;
        externalLinkId: string;
        title: string;
        url: string;
        type: string;
        file_name?: string;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, "ui_canvas_history", historyData.uiCanvasId);

            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || "unknown",
                userName: userData?.name || userData?.email || "Unknown User",
                userEmail: userData?.email || "Unknown Email",
                actionType: "EXTERNAL_LINK_CREATE",
                fieldName: "external_links",
                externalLinkId: historyData.externalLinkId,
                title: historyData.title,
                url: historyData.url,
                type: historyData.type,
                file_name: historyData.file_name || null,
                timestamp: new Date().toISOString(),
            };

            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);

            if (!historyDocSnap.exists()) {
                await setDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    external_links: [historyRecord],
                    allChanges: [historyRecord],
                    createdBy: userData?.uid || "",
                    createdByName: userData?.name || userData?.email || "Unknown User",
                    createdByEmail: userData?.email || "Unknown Email",
                });
            } else {
                await setDoc(
                    uiCanvasHistoryDocRef,
                    {
                        updatedAt: serverTimestamp(),
                        external_links: arrayUnion(historyRecord),
                        allChanges: arrayUnion(historyRecord),
                    },
                    { merge: true }
                );
            }
        } catch (error) {
            console.error("Error adding external link history record:", error);
        }
    };

    return { createExternalLink };
}
