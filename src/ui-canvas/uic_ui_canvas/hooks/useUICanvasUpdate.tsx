import {useSelector} from "react-redux";
import {RootState} from "@/store";
import {doc, getDoc, updateDoc, setDoc, serverTimestamp, arrayUnion} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";

export default function useUICanvasUpdate({selectedUI, selectedUICanvasId, uiList}: {
    selectedUI?: any,
    selectedUICanvasId: string,
    uiList?: any[]
}) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const updateUICanvas = async (inputs: any) => {
        try {
            const uiCanvasListDocRef = doc(db, "ui_canvas", selectedUICanvasId);
            
            // Get old data
            const uiCanvasSnap = await getDoc(uiCanvasListDocRef);
            const oldData = uiCanvasSnap.exists() ? uiCanvasSnap.data() : {};
            const oldInput = oldData.input?.[selectedUICanvasId] || {};
            
            await updateDoc(uiCanvasListDocRef, {
                input: {[selectedUICanvasId]: inputs},
                updatedAt: serverTimestamp()
            });
            
            // Add to ui_canvas_history
            await addUICanvasHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                actionType: 'INPUT_UPDATE',
                fieldName: 'input',
                oldValue: oldInput,
                newValue: inputs,
            });
            
            message.success("UI Canvas updated successfully");
        } catch (e) {
            console.error("Error updating UI canvas:", e)
        }
    }
    
    const updateUICanvasName = async (name: string) => {
        if (!selectedUI?.id) {
            message.error("No UI Canvas selected");
            return;
        }

        const projectsDocRef = doc(db, "projects", currentProject?.id);
        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

        try {
            // Get old name
            const uiCanvasSnap = await getDoc(uiCanvasDocRef);
            const oldName = uiCanvasSnap.exists() ? 
                (uiCanvasSnap.data().name || uiCanvasSnap.data().label || '') : '';
            
            // projects dokümanını getir
            const projectSnap = await getDoc(projectsDocRef);
            if (!projectSnap.exists()) {
                message.error("Project not found");
                return;
            }

            const projectData = projectSnap.data();
            let dsJson = [];

            try {
                const uiListObject = JSON.parse(projectData.digital_service_json || "{}");
                dsJson = Array.isArray(uiListObject) 
                    ? uiListObject 
                    : Object.keys(uiListObject).map(item => ({id: item, label: uiListObject[item]}));
            } catch (err) {
                console.warn("digital_service_json parse error:", err);
                dsJson = [];
            }

            // seçilmiş UI Canvas-ın label-ını güncelle
            const updatedDsJson = dsJson.map(item => 
                item.id === selectedUI.id 
                    ? {...item, label: name} 
                    : item
            );

            // Update projects document
            await updateDoc(projectsDocRef, {
                digital_service_json: JSON.stringify(updatedDsJson),
            });

            // Update ui_canvas document
            await updateDoc(uiCanvasDocRef, {
                name: name,
                label: name,
                updatedAt: serverTimestamp()
            });

            // Add to ui_canvas_history
            await addUICanvasHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                actionType: 'NAME_UPDATE',
                fieldName: 'name',
                oldValue: oldName,
                newValue: name,
            });

            message.success("UI Canvas updated successfully");
        } catch (e) {
            console.error(e);
            message.error("Something went wrong while updating UI Canvas");
        }
    }

    // Add to ui_canvas_history
    const addUICanvasHistoryRecord = async (historyData: {
        uiCanvasId: string;
        actionType: string;
        fieldName: string;
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
                actionType: historyData.actionType,
                fieldName: historyData.fieldName,
                oldValue: historyData.oldValue,
                newValue: historyData.newValue,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);
            
            if (!historyDocSnap.exists()) {
                // Create new document with setDoc
                await setDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    [historyData.fieldName]: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document with arrayUnion
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    [historyData.fieldName]: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding UI Canvas history record:', error);
        }
    }

    return {updateUICanvas, updateUICanvasName}
}
