import {message} from "antd";
import {v4 as uuidv4} from "uuid";
import {doc, setDoc, updateDoc, serverTimestamp} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {useSelector} from "react-redux";
import {RootState} from "@/store";

export default function useAPICanvasDuplicate({
                                                 endpoints,
                                                 selectedEndpoint,
                                                 setSelectedEndpoint,
                                                 setEndpoints
                                             }) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
    const currentUserId = currentUserData?.uid;

    const duplicateAPICanvas = async (name: string) => {
        if (!selectedEndpoint) {
            message.warning("No API Canvas selected to duplicate");
            return;
        }

        const endpointCopy = {
            ...selectedEndpoint,
            id: uuidv4(),
            name
        };

        try {
            // Create api_canvas document
            const addEnpointRefDoc = doc(db, "api_canvas", endpointCopy.id);
            await setDoc(addEnpointRefDoc, {
                ...endpointCopy,
                type: "api",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: currentUserId
            });

            // Create api_canvas_history document for the duplicate
            const historyDocRef = doc(db, 'api_canvas_history', endpointCopy.id);
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: currentUserId,
                userName: currentUserData?.name || currentUserData?.email || 'Unknown User',
                userEmail: currentUserData?.email || 'Unknown Email',
                actionType: 'API_CANVAS_DUPLICATE',
                fieldName: 'api_canvas',
                oldValue: {
                    id: selectedEndpoint.id,
                    name: selectedEndpoint.name,
                    sourceApiCanvasId: selectedEndpoint.id,
                    sourceApiCanvasName: selectedEndpoint.name
                },
                newValue: {
                    id: endpointCopy.id,
                    name: endpointCopy.name,
                    config: endpointCopy.config,
                    type: 'api'
                },
                apiCanvasId: endpointCopy.id,
                apiCanvasName: endpointCopy.name,
                timestamp: new Date().toISOString(),
            };

            await setDoc(historyDocRef, {
                apiCanvasId: endpointCopy.id,
                apiCanvasName: endpointCopy.name,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                allChanges: [historyRecord],
                api_canvas_duplicate_records: [historyRecord],
                created_by: currentUserId
            });

            // Update project's api_json
            const projectDocRef = doc(db, "projects", currentProject.id);
            const api_json = {};
            [...endpoints, endpointCopy].forEach(item => {
                api_json[item.id] = item.name
            });

            await updateDoc(projectDocRef, {
                api_json: JSON.stringify(api_json)
            });

            // Update local state
            setEndpoints([...endpoints, endpointCopy]);
            setSelectedEndpoint(endpointCopy);
            
            // Update localStorage
            localStorage.setItem("selectedEndpointId", endpointCopy.id);
            localStorage.setItem("selectedEndpoint", JSON.stringify(endpointCopy));

            message.success("API Canvas duplicated successfully");
        } catch (error) {
            console.error("Error duplicating API Canvas:", error);
            message.error("Failed to duplicate API Canvas");
        }
    }
    
    return {duplicateAPICanvas}
}
