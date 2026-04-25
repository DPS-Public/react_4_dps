import {doc, getDoc, updateDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";
import {RootState, useAppSelector} from "@/store";
import services from "@/ui-canvas/uic_backlog_canvas/services/backlogService";

export default function useUICanvasFormActionUpdate({selectedUICanvasId, selectedInput}) {
    const {currentProject} = useAppSelector((state: RootState) => state.project);
    
    const updateFormAction = async (values) => {
        const inputId = selectedInput?.inputId ?? selectedInput?.id;
        if (!selectedUICanvasId || !inputId) {
            console.warn("selectedUICanvasId or inputId is not set");
            return false;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

        try {
            const docSnap = await getDoc(uiCanvasDocRef);
            if (!docSnap.exists()) {
                message.error("UI Canvas document not found");
                return false;
            }

            const existingFormAction =
                docSnap.data()?.input?.[selectedUICanvasId]?.[inputId]?.formAction || {};
            const inputBlock = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId];
            const sanitizedValues = {
                action: values?.action ?? "",
                uiId: values?.uiId ?? "",
                condition: values?.condition ?? "",
            };

            const mergedFormAction = {
                ...existingFormAction,
                ...sanitizedValues,
                inputId,
                inputName: inputBlock?.inputName ?? selectedInput?.inputName ?? existingFormAction?.inputName ?? "",
                uiName: selectedInput?.uiName ?? existingFormAction?.uiName ?? "",
            };

            const updatePayload = {
                [`input.${selectedUICanvasId}.${inputId}.formAction`]: mergedFormAction,
            };

            await updateDoc(uiCanvasDocRef, updatePayload);

            // Build description text and data for backlog sync
            const descriptionText = mergedFormAction.description || mergedFormAction.action || '';
            const descriptionData = {
                key: 'formAction',
                action: mergedFormAction.action,
                description: mergedFormAction.description,
                condition: mergedFormAction.condition,
                uiId: mergedFormAction.uiId,
                ui_canvas_id: mergedFormAction.uiId,
            };

            if (inputBlock?.inputName) {
                descriptionData.inputName = inputBlock.inputName;
            }

            if (currentProject?.id) {
                const descIdForSync = mergedFormAction.action || inputId;
                await services.syncBacklogIssuesOnDescriptionUpdate(
                    currentProject.id,
                    selectedUICanvasId,
                    inputId,
                    descIdForSync,
                    'formAction',
                    descriptionData,
                    descriptionText
                );
            }

            message.success("Form Action updated successfully");
            return true;
        } catch (e) {
            console.error("Error updating Form Action:", e);
            message.error("Failed to update Form Action");
            return false;
        }
    }
    return {updateFormAction}
}
