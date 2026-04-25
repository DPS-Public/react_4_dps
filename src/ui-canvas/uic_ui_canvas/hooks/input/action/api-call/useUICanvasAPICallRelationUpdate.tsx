import {useSelector} from "react-redux";
import {RootState} from "@/store";
import {doc, getDoc, updateDoc, serverTimestamp, arrayUnion, setDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";
import services from "@/ui-canvas/uic_backlog_canvas/services/backlogService";

export default function useUICanvasAPICallRelationUpdate({selectedInput, selectedUICanvasId}) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const updateAPICallRelation = async (value, inputId) => {
        if (!selectedUICanvasId) {
            console.warn("selectedUICanvasId is not set");
            return false;
        }
        if (!selectedInput?.relId) {
            console.error("selectedInput.relId is not defined — nothing to update");
            return false;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
        try {
            const docSnap = await getDoc(uiCanvasDocRef);
            const docData = docSnap.data() || {};

            const payload = docData.input?.[selectedUICanvasId]?.[inputId] || {};
            const prevApiCallMap = payload.apiCall || {};

            const relId = selectedInput.relId;
            const oldEntry = prevApiCallMap[relId] || {};
            const mergedEntry = {
                ...oldEntry,
                ...value,
            };

            // Use dot notation to update only the nested apiCall entry
            const updatePayload: Record<string, any> = {
                [`input.${selectedUICanvasId}.${inputId}.apiCall.${relId}`]: mergedEntry,
            };

            await updateDoc(uiCanvasDocRef, updatePayload);

            // Add to ui_canvas_history
            await addAPICallRelationUpdateHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputId: inputId,
                apiCallRelationId: relId,
                oldValue: oldEntry,
                newValue: mergedEntry,
                inputName: payload.inputName || '',
            });

            // Build description text and data for backlog sync
            const descriptionText = mergedEntry.description || mergedEntry.label || '';
            const descriptionData = {
                key: 'apiCall',
                event: mergedEntry.event,
                description: mergedEntry.description || mergedEntry.label || '',
                api: mergedEntry.api,
                apiName: mergedEntry.apiName,
            };

            // Get inputName for backlog sync
            const inputBlock = docData.input?.[selectedUICanvasId]?.[inputId];
            if (inputBlock?.inputName) {
                descriptionData.inputName = inputBlock.inputName;
            }

            // Sync backlog issues
            if (currentProject?.id) {
                await services.syncBacklogIssuesOnDescriptionUpdate(
                    currentProject.id,
                    selectedUICanvasId,
                    inputId,
                    relId,
                    'apiCall',
                    descriptionData,
                    descriptionText
                );
            }

            message.success("API Relation updated successfully");
            return true;
        } catch (error) {
            console.error("Error updating API Relation:", error);
            message.error("Failed to update API Relation");
            return false;
        }
    }

    // Add to ui_canvas_history
    const addAPICallRelationUpdateHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputId: string;
        inputName: string;
        apiCallRelationId: string;
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
                actionType: 'API_CALL_RELATION_UPDATE',
                fieldName: 'api_call_relations',
                inputId: historyData.inputId,
                inputName: historyData.inputName,
                apiCallRelationId: historyData.apiCallRelationId,
                oldValue: historyData.oldValue,
                newValue: historyData.newValue,
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
                    api_call_relations: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    api_call_relations: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding API call relation update history record:', error);
        }
    }

    return {updateAPICallRelation}
}
