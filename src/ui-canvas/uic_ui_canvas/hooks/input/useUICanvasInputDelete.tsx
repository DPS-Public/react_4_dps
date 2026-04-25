import {deleteField, doc, getDoc, updateDoc, serverTimestamp, arrayUnion} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";

export default function useUICanvasInputDelete({selectedUICanvasId}) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const deleteInput = async (inputIds: string[]) => {
        if (!selectedUICanvasId || !inputIds.length) {
            console.warn("selectedUI, selectedUICanvasId, or inputId is not set");
            return;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

        try {
            // Get existing input data before deleting
            const docSnap = await getDoc(uiCanvasDocRef);
            const deletedInputsData: any[] = [];
            
            if (docSnap.exists()) {
                const inputData = docSnap.data()?.input?.[selectedUICanvasId] || {};
                
                for (const inputId of inputIds) {
                    const inputItem = inputData[inputId];
                    if (inputItem) {
                        deletedInputsData.push({
                            inputId: inputId,
                            inputName: inputItem.inputName || '',
                            componentType: inputItem.componentType || '',
                            inputType: inputItem.inputType || '',
                            hasLabel: inputItem.hasLabel || false,
                            cellNo: inputItem.cellNo || '',
                            content: inputItem.content || '',
                            manualDescription: inputItem.manualDescription || {},
                            templateDescription: inputItem.templateDescription || {},
                            apiCall: inputItem.apiCall || {},
                            databaseRelation: inputItem.databaseRelation || {},
                            formAction: inputItem.formAction || {},
                        });
                    }
                }
            }

            const deletePayload = {};
            for (const inputId of inputIds) {
                deletePayload[`input.${selectedUICanvasId}.${inputId}`] = deleteField();
            }

            // Dot-notation ile sadece ilgili input'u sil
            await updateDoc(uiCanvasDocRef, deletePayload);

            // Add to ui_canvas_history
            await addInputDeleteHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputIds: inputIds,
                deletedInputsData: deletedInputsData,
            });

            message.success("Input deleted successfully");
        } catch (error) {
            console.error("Error deleting Input:", error);
            message.error("Failed to delete Input");
        }
    }

    // Add to ui_canvas_history
    const addInputDeleteHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputIds: string[];
        deletedInputsData: any[];
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'INPUT_DELETE',
                fieldName: 'inputs',
                inputIds: historyData.inputIds,
                deletedInputsData: historyData.deletedInputsData,
                deletedCount: historyData.inputIds.length,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);
            
            if (!historyDocSnap.exists()) {
                // Create new document
                await updateDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    inputs: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    inputs: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding input delete history record:', error);
        }
    }

    return {deleteInput}
}
