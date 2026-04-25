import {doc, getDoc, updateDoc, serverTimestamp, arrayUnion} from "firebase/firestore";
import {db} from "@/config/firebase.ts";

export default function useUpdateCanvas({selectedUI}) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const updateCanvas = async (key: string, value) => {        
        if (!selectedUI?.id) {
            console.error("No UI Canvas ID provided");
            return;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUI.id);
        
        try {
            // Get current data before updating
            const docSnap = await getDoc(uiCanvasDocRef);
            const currentData = docSnap.exists() ? docSnap.data() : {};
            const oldValue = currentData[key];
            
            const payload = {
                ...selectedUI,
                [key]: value
            };
            
            await updateDoc(uiCanvasDocRef, payload);

            // Add to ui_canvas_history
            await addCanvasUpdateHistoryRecord({
                uiCanvasId: selectedUI.id,
                key: key,
                oldValue: oldValue,
                newValue: value,
            });

        } catch (error) {
            console.error("Error updating canvas:", error);
            throw error;
        }
    }

    // Add to ui_canvas_history
    const addCanvasUpdateHistoryRecord = async (historyData: {
        uiCanvasId: string;
        key: string;
        oldValue: any;
        newValue: any;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'CANVAS_FIELD_UPDATE',
                fieldName: historyData.key,
                oldValue: historyData.oldValue,
                newValue: historyData.newValue,
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
                    [historyData.key]: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                const updates: any = {
                    updatedAt: serverTimestamp(),
                    allChanges: arrayUnion(historyRecord),
                };
                
                // Add to specific field array
                updates[historyData.key] = arrayUnion(historyRecord);
                
                await updateDoc(uiCanvasHistoryDocRef, updates);
            }        } catch (error) {
            console.error('Error adding canvas update history record:', error);
        }
    }

    return {updateCanvas}
}
