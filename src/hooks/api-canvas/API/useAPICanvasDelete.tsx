import {deleteDoc, doc, updateDoc, getDoc, serverTimestamp, setDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";
import {useSelector} from "react-redux";
import {RootState} from "@/store";

export default function useAPICanvasDelete({
                                              endpoints,
                                              selectedEndpoint,
                                              setSelectedEndpoint,
                                              setEndpoints
                                          }) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
    const currentUserId = currentUserData?.uid;

    const deleteEndpoint = async (id: string) => {
        try {
            // Find the endpoint being deleted
            const endpointToDelete = endpoints.find(ep => ep.id === id);
            
            // Create history record for deletion before deleting
            if (endpointToDelete) {
                try {
                    const historyDocRef = doc(db, 'api_canvas_history', id);

                    // Check if history document exists
                    const historyDoc = await getDoc(historyDocRef);

                    const historyRecord = {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        userId: currentUserId,
                        userName: currentUserData?.name || currentUserData?.email || 'Unknown User',
                        userEmail: currentUserData?.email || 'Unknown Email',
                        actionType: 'API_CANVAS_DELETE',
                        fieldName: 'api_canvas',
                        oldValue: {
                            id: endpointToDelete.id,
                            name: endpointToDelete.name,
                            config: endpointToDelete.config,
                            type: 'api'
                        },
                        newValue: null,
                        apiCanvasId: id,
                        apiCanvasName: endpointToDelete.name,
                        timestamp: new Date().toISOString(),
                    };

                    if (historyDoc.exists()) {
                        const existingData = historyDoc.data();
                        const existingChanges = existingData.allChanges || [];
                        const updatedChanges = [historyRecord, ...existingChanges].slice(0, 100);

                        await updateDoc(historyDocRef, {
                            updatedAt: serverTimestamp(),
                            allChanges: updatedChanges,
                            api_canvas_delete_records: [historyRecord, ...(existingData.api_canvas_delete_records || [])].slice(0, 20)
                        });
                    } else {
                        await setDoc(historyDocRef, {
                            apiCanvasId: id,
                            apiCanvasName: endpointToDelete.name,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            allChanges: [historyRecord],
                            api_canvas_delete_records: [historyRecord]
                        }, { merge: true });
                    }
                } catch (historyError) {
                    console.warn("API endpoint deleted without writing delete history:", historyError);
                }
            }

            // Update local state first
            setEndpoints(endpoints.filter((ep) => ep.id !== id));
            if (selectedEndpoint?.id === id) {
                setSelectedEndpoint(null);
            }

            // Delete from Firestore
            const deletedEndpointDocRef = doc(db, "api_canvas", id);
            await deleteDoc(deletedEndpointDocRef);

            // Update project's api_json
            const updateProjectDocRef = doc(db, "projects", currentProject.id);
            const api_json = {};
            endpoints.filter((ep) => ep.id !== id).forEach(item => {
                api_json[item.id] = item.name
            });
            await updateDoc(updateProjectDocRef, {api_json: JSON.stringify(api_json)});
            
            message.success("API Deleted Successfully");
        } catch (error) {
            console.error("Error deleting API endpoint:", error);
            message.error("Failed to delete API endpoint");
        }
    }
    
    return {deleteEndpoint}
}
