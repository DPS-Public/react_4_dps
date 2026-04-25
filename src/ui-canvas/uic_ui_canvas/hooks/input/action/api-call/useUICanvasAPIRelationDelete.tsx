import {deleteField, doc, getDoc, updateDoc, serverTimestamp, arrayUnion, setDoc} from "firebase/firestore";
import {message} from "antd";
import {db} from "@/config/firebase.ts";

export default function useUICanvasAPIRelationDelete({selectedUICanvasId}) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const deleteAPIRelation = async (descriptionId, inputId) => {
        if (!selectedUICanvasId || !descriptionId) return false;

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
        try {
            const docSnap = await getDoc(uiCanvasDocRef);
            if (!docSnap.exists()) {
                message.error("UI Canvas document not found");
                return false;
            }

            // Get existing API relation data before deleting
            let deletedAPIRelationData = null;
            let inputName = '';
            
            if (docSnap.exists()) {
                deletedAPIRelationData = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId]?.apiCall?.[descriptionId] || null;
                const inputBlock = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId];
                inputName = inputBlock?.inputName || '';
            }

            await updateDoc(uiCanvasDocRef, {
                [`input.${selectedUICanvasId}.${inputId}.apiCall.${descriptionId}`]: deleteField(),
            });

            // Add to ui_canvas_history
            await addAPIRelationDeleteHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputId: inputId,
                inputName: inputName,
                apiRelationId: descriptionId,
                deletedAPIRelationData: deletedAPIRelationData,
            });

            message.success("API Call deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting API Call:", error);
            message.error("Failed to delete API Call");
            return false;
        }
    };

    // Add to ui_canvas_history
    const addAPIRelationDeleteHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputId: string;
        inputName: string;
        apiRelationId: string;
        deletedAPIRelationData: any;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'API_RELATION_DELETE',
                fieldName: 'api_relations',
                inputId: historyData.inputId,
                inputName: historyData.inputName,
                apiRelationId: historyData.apiRelationId,
                deletedAPIRelationData: historyData.deletedAPIRelationData,
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
                    api_relations: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    api_relations: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding API relation delete history record:', error);
        }
    };

    return {deleteAPIRelation}
}
