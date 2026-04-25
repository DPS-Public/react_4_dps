import {deleteField, doc, getDoc, updateDoc, serverTimestamp, arrayUnion} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";

export default function useUICanvasDescriptionsBulkDelete({
                                                              selectedDescriptions,
                                                              setSelectedDescriptions,
                                                              selectedUI,
                                                              selectedUICanvasId
                                                          }) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const descriptionsBulkDelete = async () => {
        if (!selectedUICanvasId || !selectedUI) return;
        if (!selectedDescriptions.length) return;

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

        try {
            // Get existing description data before deleting
            const docSnap = await getDoc(uiCanvasDocRef);
            const deletedDescriptionsData: any[] = [];
            
            if (docSnap.exists()) {
                const inputData = docSnap.data()?.input?.[selectedUICanvasId] || {};
                
                selectedDescriptions.forEach(item => {
                    const {id, inputId, key, type} = item;
                    if (!inputId || !key) return;

                    const inputItem = inputData[inputId];
                    const inputName = inputItem?.inputName || '';

                    let descriptionData = null;
                    
                    if (key === "apiCall") {
                        descriptionData = inputItem?.apiCall?.[id] || null;
                    } else if (key === "formAction") {
                        descriptionData = inputItem?.formAction || null;
                    } else if (key === "manualDescription") {
                        descriptionData = inputItem?.manualDescription?.[id] || null;
                    } else if (key === "templateDescription") {
                        descriptionData = inputItem?.templateDescription?.[id] || null;
                    }

                    if (descriptionData) {
                        deletedDescriptionsData.push({
                            descriptionId: id,
                            inputId: inputId,
                            inputName: inputName,
                            key: key,
                            type: type || key,
                            descriptionData: descriptionData,
                        });
                    }
                });
            }

            const updatePayload: Record<string, any> = {};

            selectedDescriptions.forEach(item => {
                const {id, inputId, key} = item;

                if (!inputId || !key) return;

                if (key === "apiCall") {
                    // apiCall için relId eşleşen entry’yi sil
                    updatePayload[`input.${selectedUICanvasId}.${inputId}.apiCall.${id}`] = deleteField();
                } else if (key === "formAction") {
                    // formAction tümüyle silinir
                    updatePayload[`input.${selectedUICanvasId}.${inputId}.formAction`] = deleteField();
                } else {
                    // diğer nested keyler (manualDescription, templateDescription vb.)
                    updatePayload[`input.${selectedUICanvasId}.${inputId}.${key}.${id}`] = deleteField();
                }
            });

            await updateDoc(uiCanvasDocRef, updatePayload);

            // Add to ui_canvas_history
            await addDescriptionsBulkDeleteHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                deletedDescriptionsData: deletedDescriptionsData,
            });

            setSelectedDescriptions([]);
            message.success("Descriptions deleted successfully");
        } catch (error) {
            console.error("Error deleting Descriptions:", error);
            message.error("Failed to delete Descriptions");
        }
    }

    // Add to ui_canvas_history
    const addDescriptionsBulkDeleteHistoryRecord = async (historyData: {
        uiCanvasId: string;
        deletedDescriptionsData: any[];
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'DESCRIPTIONS_BULK_DELETE',
                fieldName: 'bulk_descriptions',
                deletedDescriptionsData: historyData.deletedDescriptionsData,
                deletedCount: historyData.deletedDescriptionsData.length,
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
                    bulk_descriptions: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    bulk_descriptions: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding bulk descriptions delete history record:', error);
        }
    }

    return {descriptionsBulkDelete}
}
