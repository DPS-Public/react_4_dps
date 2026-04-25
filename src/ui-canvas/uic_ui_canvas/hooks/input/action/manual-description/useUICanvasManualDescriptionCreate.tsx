import {db} from '@/config/firebase.ts';
import {message} from 'antd';
import {doc, getDoc, updateDoc, serverTimestamp, arrayUnion, setDoc} from 'firebase/firestore';
import {v4 as uuidv4} from "uuid";

export default function useUICanvasManualDescriptionCreate({selectedUICanvasId, selectedInput}) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const createManualDescription = async (value) => {
        if (!selectedUICanvasId || !selectedInput?.id) {
            console.warn("selectedUICanvasId or selectedInput.id is not set");
            return false;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

        try {
            const docSnap = await getDoc(uiCanvasDocRef);
            if (!docSnap.exists()) {
                message.error("UI Canvas document not found");
                return false;
            }

            const inputId = selectedInput.id;
            const sanitizedValue = {
                event: value?.event ?? "",
                description: value?.description ?? "",
            };

            // Mevcut manualDescription entry’sini al
            const prevItem = docSnap.data()?.input?.[selectedUICanvasId]?.[selectedInput.id] || {}
            const existingManualDescription = prevItem?.manualDescription || {};

            const id = uuidv4();
            const order = Object.keys(existingManualDescription).length;

            const newEntry = {
                ...sanitizedValue,
                id,
                order,
                inputId,
                inputName: prevItem.inputName ?? selectedInput.inputName ?? "",
                uiId: selectedUICanvasId,
                uiName: selectedInput.uiName ?? "",
            };

            const updatedManualDescription = {
                ...existingManualDescription,
                [id]: newEntry,
            };

            // Dot-notation ile sadece ilgili manualDescription alanını ekle
            const updatePayload = {
                [`input.${selectedUICanvasId}.${inputId}.manualDescription`]: updatedManualDescription,
            };

            await updateDoc(uiCanvasDocRef, updatePayload);

            // Add to ui_canvas_history
            await addManualDescriptionHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputId: inputId,
                inputName: prevItem.inputName || selectedInput.inputName || '',
                manualDescriptionId: id,
                manualDescriptionValue: sanitizedValue,
                existingCount: order,
            });

            message.success("Manual Description created successfully");
            return true;
        } catch (error) {
            console.error("Error creating Manual Description:", error);
            message.error("Failed to create Manual Description");
            return false;
        }
    }

    // Add to ui_canvas_history
    const addManualDescriptionHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputId: string;
        inputName: string;
        manualDescriptionId: string;
        manualDescriptionValue: any;
        existingCount: number;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'MANUAL_DESCRIPTION_CREATE',
                fieldName: 'manual_descriptions',
                inputId: historyData.inputId,
                inputName: historyData.inputName,
                manualDescriptionId: historyData.manualDescriptionId,
                manualDescriptionValue: historyData.manualDescriptionValue,
                order: historyData.existingCount,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);
            
            if (!historyDocSnap.exists()) {
                // Create new document
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
            console.error('Error adding manual description history record:', error);
        }
    }

    return { createManualDescription }
}
