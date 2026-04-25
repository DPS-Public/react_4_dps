import {doc, getDoc, updateDoc, serverTimestamp, arrayUnion, setDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {v4 as uuidv4} from "uuid";
import {message} from "antd";

export default function useUICanvasAPICallRelationCreate({selectedInput, selectedUICanvasId}) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const createAPICallRelation = async ({event, description, api, apiName}: {
        event: string,
        description: string,
        api: string,
        apiName: string
    }) => {
        if (!selectedUICanvasId) {
            message.error("UI Canvas id is missing");
            return false;
        }

        if (!selectedInput?.id) {
            message.error("Input is not selected");
            return false;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
        try {
            const docSnap = await getDoc(uiCanvasDocRef);
            if (!docSnap.exists()) {
                message.error("UI Canvas document not found");
                return false;
            }

            const currentDoc = docSnap.data() || {};
            const id = uuidv4();
            const inputId = selectedInput.id;
            const prevInput = currentDoc.input || {};
            const prevItem = prevInput?.[selectedUICanvasId]?.[inputId] || {};
            const prevApiCall = prevItem.apiCall || {};
            const apiCallCount = Object.keys(prevApiCall).length;

            const newApiCall = {
                ...prevApiCall,
                [id]: {
                    event,
                    description,
                    api,
                    apiName,
                    inputId,
                    uiId: selectedUICanvasId,
                    uiName: selectedInput.uiName ?? "",
                    inputName: prevItem.inputName ?? selectedInput.inputName ?? "",
                    relId: id,
                    order: apiCallCount,
                }
            };

            const newStoryItem = {
                ...prevInput,
                [selectedUICanvasId]: {
                    ...prevInput[selectedUICanvasId],
                    [inputId]: {
                        ...prevItem,
                        apiCall: newApiCall,
                    }
                }
            };

            await updateDoc(uiCanvasDocRef, {
                input: newStoryItem,
            });

            // Add to ui_canvas_history
            await addAPICallRelationHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputId: inputId,
                inputName: prevItem.inputName || '',
                apiCallRelationId: id,
                event: event,
                description: description,
                api: api,
                apiName: apiName,
                existingCount: apiCallCount,
            });

            message.success("API Call Relation created successfully")
            return true;
        } catch (e) {
            console.error("Error creating API Call Relation:", e)
            message.error("Failed to create API Call Relation");
            return false;
        }
    }

    // Add to ui_canvas_history
    const addAPICallRelationHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputId: string;
        inputName: string;
        apiCallRelationId: string;
        event: string;
        description: string;
        api: string;
        apiName: string;
        existingCount: number;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'API_CALL_RELATION_CREATE',
                fieldName: 'api_call_relations',
                inputId: historyData.inputId,
                inputName: historyData.inputName,
                apiCallRelationId: historyData.apiCallRelationId,
                event: historyData.event,
                description: historyData.description,
                api: historyData.api,
                apiName: historyData.apiName,
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
            console.error('Error adding API call relation history record:', error);
        }
    }

    return {createAPICallRelation}
}
