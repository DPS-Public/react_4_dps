import {doc, getDoc, updateDoc, serverTimestamp, arrayUnion, setDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";
import {v4 as uuidv4} from "uuid";

interface CreatedManualDescriptionEntry {
    event: string;
    description: string;
    id: string;
    order: number;
    inputId: string;
    inputName: string;
    uiId: string;
    uiName: string;
}

export default function useUICanvasTemplateDescriptionCreate({selectedUICanvasId, selectedInput}) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const templateDescriptionCreate = async (descriptionList) => {
        const inputId = selectedInput.id;
        if (!selectedUICanvasId || !inputId) {
            console.warn("selectedUICanvasId, inputId, or selectedInput.id is not set");
            return;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

        try {
            const docSnap = await getDoc(uiCanvasDocRef);
            if (!docSnap.exists()) {
                message.error("UI Canvas document not found");
                return;
            }
            const prevItem = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId]
            const existingManualDescription = prevItem?.manualDescription || {};

            const prevCount = Object.keys(existingManualDescription).length;

            const newDescriptions: Record<string, CreatedManualDescriptionEntry> = {};

            descriptionList.forEach((item, index) => {
                const newId = uuidv4();
                const descriptionText = item?.check
                    ? (item?.description || "")
                    : `${item?.label || ""} ${item?.description || ""}`.trim();

                newDescriptions[newId] = {
                    event: "",
                    description: descriptionText,
                    id: newId,
                    order: prevCount + index,
                    inputId,
                    inputName: prevItem.inputName || "",
                    uiId: selectedUICanvasId,
                    uiName: selectedInput.uiName || "",
                };
            });

            const mergedManualDescription = {
                ...existingManualDescription,
                ...newDescriptions,
            };

            const updatePayload = {
                [`input.${selectedUICanvasId}.${inputId}.manualDescription`]: mergedManualDescription,
            };

            await updateDoc(uiCanvasDocRef, updatePayload);

            await addTemplateDescriptionHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputId: inputId,
                inputName: prevItem.inputName || '',
                templateDescriptions: Object.values(newDescriptions),
                existingCount: prevCount,
                newCount: Object.keys(newDescriptions).length,
            });

            message.success("Template Description added as Manual Description successfully");
        } catch (error) {
            console.error("Error creating Template Description:", error);
            message.error("Failed to create Template Description ❌");
        }
    };

    // Add to ui_canvas_history - artıq var
    const addTemplateDescriptionHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputId: string;
        inputName: string;
        templateDescriptions: CreatedManualDescriptionEntry[];
        existingCount: number;
        newCount: number;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'MANUAL_DESCRIPTION_CREATE_FROM_TEMPLATE',
                fieldName: 'manual_descriptions',
                inputId: historyData.inputId,
                inputName: historyData.inputName,
                templateDescriptions: historyData.templateDescriptions,
                existingCount: historyData.existingCount,
                newCount: historyData.newCount,
                totalCount: historyData.existingCount + historyData.newCount,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);
            
            if (!historyDocSnap.exists()) {
                // Create new document with setDoc instead of updateDoc for non-existent document
                await setDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    manual_descriptions: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    manual_descriptions: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding template description history record:', error);
        }
    };

    return {templateDescriptionCreate}
}
