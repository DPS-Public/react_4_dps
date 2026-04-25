import {APIEndpoint} from "../types.ts";
import {v4 as uuidv4} from "uuid";
import {doc, setDoc, updateDoc, serverTimestamp} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {RootState} from "@/store";
import {useSelector} from "react-redux";

export default function useAPICanvasCreate({
                                           newEndpoint,
                                           setNewEndpoint,
                                           endpoints,
                                           setEndpoints,
                                           setSelectedEndpoint,
                                           setIsDrawerVisible,
                                       }) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
    const currentUserId = currentUserData?.uid;

    const addCanvas = async () => {
        if (!newEndpoint.name) return;

        const endpoint: APIEndpoint = {
            id: uuidv4(),
            name: newEndpoint.name,
            description: "",
            config: {
                method: "POST",
                localUrl: newEndpoint.name.toLowerCase().replace(/\s+/g, "-"), // Convert name to URL-friendly format
                localHeader: "",
                filePath: "",
            },
            requestBody: "{}",
            responseBody: "{}",
            input: [],
            output: [],
            operation: [],
        };

        try {
            // First: Update project's api_json
            const projectDocRef = doc(db, "projects", currentProject.id);
            const api_json = {};
            [...endpoints, endpoint].forEach(item => {
                api_json[item.id] = item.name
            });

            await updateDoc(projectDocRef, {
                api_json: JSON.stringify(api_json)
            });

            // Second: Create api_canvas document
            const addEnpointRefDoc = doc(db, "api_canvas", endpoint.id);
            await setDoc(addEnpointRefDoc, {
                ...endpoint,
                id: endpoint.id,
                name: endpoint.name,
                type: "api",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: currentUserId
            });

            // Third: Create api_canvas_history document (ONLY THIS WAS REQUESTED)
            const historyDocRef = doc(db, 'api_canvas_history', endpoint.id);
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: currentUserId,
                userName: currentUserData?.name || currentUserData?.email || 'Unknown User',
                userEmail: currentUserData?.email || 'Unknown Email',
                actionType: 'API_CANVAS_CREATE',
                fieldName: 'api_canvas',
                oldValue: null,
                newValue: {
                    id: endpoint.id,
                    name: endpoint.name,
                    config: endpoint.config,
                    type: 'api'
                },
                apiCanvasId: endpoint.id,
                apiCanvasName: endpoint.name,
                timestamp: new Date().toISOString(),
            };

            await setDoc(historyDocRef, {
                apiCanvasId: endpoint.id,
                apiCanvasName: endpoint.name,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                allChanges: [historyRecord],
                api_canvas_create_records: [historyRecord],
                created_by: currentUserId
            });

            // Update local state
            const updatedEndpoints = [...endpoints, endpoint];
            setEndpoints(updatedEndpoints);
            setSelectedEndpoint(endpoint);
            setNewEndpoint({
                name: "",
                config: {method: "POST", localUrl: "", localHeader: "", filePath: ""},
                requestBody: "{}",
                responseBody: "{}",
                input: [],
                output: [],
                operation: [],
            });
            setIsDrawerVisible(false);
            
            // Update localStorage
            localStorage.setItem("selectedEndpointId", endpoint.id);
            localStorage.setItem("selectedEndpoint", JSON.stringify(endpoint));
        } catch (error) {
            console.error("Error creating API canvas:", error);
        }
    };

    return {
        addCanvas,
    };
}
