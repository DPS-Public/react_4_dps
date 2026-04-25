import {deleteDoc, doc, getDoc, updateDoc, serverTimestamp, arrayUnion} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {useSelector} from "react-redux";
import {RootState} from "@/store";
import {message} from "antd";

export default function useUICanvasDelete({selectedUI, uiList, editingUICanvas}) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const deleteUICanvas = async () => {
        if (!editingUICanvas?.id) {
            message.error("No UI Canvas selected");
            return;
        }

        const id = editingUICanvas.id;
        const uiCanvasDocRef = doc(db, "ui_canvas", id);
        const projectDocRef = doc(db, "projects", currentProject?.id);

        try {
            // Get canvas data before deleting
            let canvasData = null;
            const canvasDocSnap = await getDoc(uiCanvasDocRef);
            if (canvasDocSnap.exists()) {
                canvasData = {
                    ...canvasDocSnap.data(),
                    id: canvasDocSnap.id
                };
            }

            // önce ui_canvas dokümanını sil
            await deleteDoc(uiCanvasDocRef);

            // Add to ui_canvas_history
            await addCanvasDeleteHistoryRecord({
                uiCanvasId: id,
                canvasData: canvasData,
                deletedBy: userData?.uid,
                deletedByName: userData?.name || userData?.email || 'Unknown User',
            });

            // localStorage temizle
            localStorage.removeItem("currentUI");

            // projects dokümanını getir
            const projectSnap = await getDoc(projectDocRef);
            if (projectSnap.exists()) {
                const projectData = projectSnap.data();
                let dsJson = [];

                try {
                    const uiListObject = JSON.parse(projectData.digital_service_json || "{}");
                    dsJson = Array.isArray(uiListObject) ? uiListObject : Array.isArray(uiListObject) ? uiListObject : Object.keys(uiListObject).map(item => ({id: item, label: uiListObject[item]}))
                } catch (err) {
                    console.warn("digital_service_json parse error:", err);
                    dsJson = [];
                }

                // bu id'yi içermeyenleri filtrele
                const updatedDsJson = dsJson.filter(item => item.id !== id);

                // güncelle
                await updateDoc(projectDocRef, {
                    digital_service_json: JSON.stringify(updatedDsJson),
                });
            }

            message.success("UI Canvas deleted successfully");
        } catch (e) {
            console.error(e);
            message.error("Something went wrong while deleting UI Canvas");
        }
    }

    // Add to ui_canvas_history
    const addCanvasDeleteHistoryRecord = async (historyData: {
        uiCanvasId: string;
        canvasData: any;
        deletedBy: string;
        deletedByName: string;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: historyData.deletedBy || 'unknown',
                userName: historyData.deletedByName,
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'CANVAS_DELETE',
                fieldName: 'canvas',
                canvasData: historyData.canvasData,
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
                    canvas_delete: [historyRecord],
                    allChanges: [historyRecord],
                    deletedBy: historyData.deletedBy,
                    deletedByName: historyData.deletedByName,
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    canvas_delete: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding canvas delete history record:', error);
        }
    }

    return {deleteUICanvas}
}
