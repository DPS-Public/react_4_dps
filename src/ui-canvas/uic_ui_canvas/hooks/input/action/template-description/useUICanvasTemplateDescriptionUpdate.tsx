import {doc, getDoc, updateDoc, serverTimestamp, arrayUnion, setDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";
import {v4 as uuidv4} from "uuid";
import {RootState, useAppSelector} from "@/store";
import services from "@/ui-canvas/uic_backlog_canvas/services/backlogService";

export default function useUICanvasTemplateDescriptionUpdate({selectedUICanvasId, selectedInput,}) {
    const {currentProject} = useAppSelector((state: RootState) => state.project);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    const templateDescriptionUpdate = async (descriptionList) => {
        const inputId = selectedInput.id;
        if (!selectedUICanvasId || !inputId || !selectedInput?.id) {
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

            const existingTemplateDescription = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId]?.templateDescription || {};
            const inputBlock = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId];
            const inputName = inputBlock?.inputName || '';

            const prevCount = Object.keys(existingTemplateDescription).length;
            const oldTemplateDescriptions = {...existingTemplateDescription};

            const newDescriptions: Record<string, any> = {};

            descriptionList.forEach((item, index) => {
                const newId = uuidv4();
                newDescriptions[newId] = {
                    ...item,
                    id: newId,
                    templateDescId: item.id,
                    order: prevCount + index + 1,
                    inputId,
                    inputName: inputName || "",
                    uiId: selectedUICanvasId,
                    uiName: selectedInput.uiName || "",
                };
            });

            const mergedTemplateDescription = {
                ...newDescriptions,
            };

            const updatePayload = {
                [`input.${selectedUICanvasId}.${inputId}.templateDescription`]: mergedTemplateDescription,
            };

            await updateDoc(uiCanvasDocRef, updatePayload);

            // Add to ui_canvas_history
            await addTemplateDescriptionUpdateHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                inputId: inputId,
                inputName: inputName,
                oldTemplateDescriptions: oldTemplateDescriptions,
                newTemplateDescriptions: mergedTemplateDescription,
                oldCount: Object.keys(oldTemplateDescriptions).length,
                newCount: Object.keys(mergedTemplateDescription).length,
            });

            // Sync backlog issues for each template description
            if (currentProject?.id) {
                // Sync each template description
                for (const [descId, descItem] of Object.entries(mergedTemplateDescription)) {
                    const label = (descItem as any).label ? `${(descItem as any).label}: ` : '';
                    const descriptionText = label + ((descItem as any).description || '');
                    const descriptionData = {
                        key: 'templateDescription',
                        label: (descItem as any).label,
                        description: (descItem as any).description || '',
                        inputName: inputName,
                    };

                    await services.syncBacklogIssuesOnDescriptionUpdate(
                        currentProject.id,
                        selectedUICanvasId,
                        inputId,
                        descId,
                        'templateDescription',
                        descriptionData,
                        descriptionText
                    );
                }
            }

            message.success("Template Description updated successfully");
        } catch (error) {
            console.error("Error updating Template Description:", error);
            message.error("Failed to update Template Description ❌");
        }
    };

    // Add to ui_canvas_history
    const addTemplateDescriptionUpdateHistoryRecord = async (historyData: {
        uiCanvasId: string;
        inputId: string;
        inputName: string;
        oldTemplateDescriptions: any;
        newTemplateDescriptions: any;
        oldCount: number;
        newCount: number;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'TEMPLATE_DESCRIPTION_UPDATE',
                fieldName: 'template_descriptions',
                inputId: historyData.inputId,
                inputName: historyData.inputName,
                oldTemplateDescriptions: historyData.oldTemplateDescriptions,
                newTemplateDescriptions: historyData.newTemplateDescriptions,
                oldCount: historyData.oldCount,
                newCount: historyData.newCount,
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
                    template_descriptions: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    template_descriptions: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding template description update history record:', error);
        }
    };

    return {templateDescriptionUpdate}
}
