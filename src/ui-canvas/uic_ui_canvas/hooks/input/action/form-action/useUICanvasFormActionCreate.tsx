import {arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";

export default function useUICanvasFormActionCreate({selectedInput, selectedUICanvasId}) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const createFormAction = async (values) => {
        if (!selectedUICanvasId) {
            console.warn("selectedUICanvasId is not set");
            return false;
        }
        if (!selectedInput?.id) {
            console.error("selectedInput is missing id");
            return false;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

        try {
            const docSnap = await getDoc(uiCanvasDocRef);
            if (!docSnap.exists()) {
                message.error("UI Canvas document not found");
                return false;
            }
            const prevItem = docSnap.data()?.input?.[selectedUICanvasId]?.[selectedInput.id] || {};
            const inputId = selectedInput.id;

            const existingFormAction = prevItem?.formAction || {};
            const sanitizedValues = {
                action: values?.action ?? "",
                uiId: values?.uiId ?? "",
                condition: values?.condition ?? "",
            };

            const mergedFormAction = {
                ...existingFormAction,
                ...sanitizedValues,
                inputId,
                uiName: selectedInput.uiName ?? prevItem.uiName ?? "",
                inputName: prevItem.inputName ?? selectedInput.inputName ?? "",
            };

            const updatePayload = {
                [`input.${selectedUICanvasId}.${inputId}.formAction`]: mergedFormAction,
            };

            await updateDoc(uiCanvasDocRef, updatePayload);

            // Add to ui_canvas_history
            await addFormActionHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputId: inputId,
                inputName: prevItem.inputName || '',
                oldFormAction: existingFormAction,
                newFormAction: mergedFormAction,
            });

            message.success("Form Action created successfully");
            return true;
        } catch (e) {
            console.error("Error creating/updating Form Action:", e);
            message.error("Failed to create/update Form Action");
            return false;
        }
    }

    const addFormActionHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputId: string;
        inputName: string;
        oldFormAction: any;
        newFormAction: any;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: Object.keys(historyData.oldFormAction).length === 0 ? 'FORM_ACTION_CREATE' : 'FORM_ACTION_UPDATE',
                fieldName: 'form_actions',
                inputId: historyData.inputId,
                inputName: historyData.inputName,
                oldFormAction: historyData.oldFormAction,
                newFormAction: historyData.newFormAction,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);
            
            if (!historyDocSnap.exists()) {
                await setDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    form_actions: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    form_actions: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding form action history record:', error);
        }
    }

    return {createFormAction}
}
