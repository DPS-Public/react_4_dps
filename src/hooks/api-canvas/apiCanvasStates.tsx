import React, {useEffect, useRef, useState} from "react";
import useOutputColumns from "./Output/useOutputColumns.tsx";
import useInputColumns from "./Input/useInputColumns.tsx";
import useOperationColumns from "./Operation/useOperationColumns.tsx";
import {DraggableRow} from "./DraggableRow";
import {APIEndpoint, IIdName, OperationType} from "./types";
import useMoveRow from "./useMoveRow";
import useAddEndPoint from "./API/useAPICanvasCreate.tsx";
import useAPIInputsCreate from "./Input/useAPIInputsCreate.tsx";
import useAPIOutputUpdate from "./Output/useAPIOutputUpdate.tsx";
import useAddFunctions from "./useAddFunctions";
import useEditFunctions from "./useEditFunctions";
import useUpdateResAndReq from "./useUpdateResAndReq";
import useEndPointFunctions from "./useEndPointFunctions";
import useAPICanvasListLoad from "./API/useAPICanvasListLoad.tsx";
import {doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc} from "firebase/firestore";
import {db} from "@/config/firebase";
import {useSelector} from "react-redux";
import {RootState} from "@/store";
import useAPIInputsUpdate from "@/hooks/api-canvas/Input/useAPIInputsUpdate.tsx";
import useDeleteEndPoint from "@/hooks/api-canvas/API/useAPICanvasDelete.tsx";
import useAPIUpdateOperationDescription from "@/hooks/api-canvas/Operation/useAPIUpdateOperationDescription.tsx";
import useAPICreateOperationDescription from "@/hooks/api-canvas/Operation/useAPICreateOperationDescription.tsx";
import useAPIOperationDescriptionDelete from "@/hooks/api-canvas/Operation/useAPIOperationDescriptionDelete.tsx";
import useAPIRequestBodyUpdate from "@/hooks/api-canvas/useAPIRequestBodyUpdate.tsx";
import useAPIResponseBodyUpdate from "@/hooks/api-canvas/useAPIResponseBodyUpdate.tsx";
import useAPIOutputCreate from "@/hooks/api-canvas/Output/useAPIOutputCreate.tsx";
import useAPICanvasDuplicate from "@/hooks/api-canvas/API/useAPICanvasDuplicate.tsx";
import useAPIInputsDelete from "@/hooks/api-canvas/Input/useAPIInputsDelete.tsx";
import useAPIOutputDelete from "@/hooks/api-canvas/Output/useAPIOutputDelete.tsx";

const useApiCanvasStates = () => {
    const [loading, setLoading] = useState(true)
    const [endpoints, setEndpoints] = React.useState<IIdName[]>([]);
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const apiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.apiCanvases);
    const apiCanvasRef = useRef()
    const [selectedEndpoint, setSelectedEndpoint] =
        React.useState<APIEndpoint | null>();
    const [testResponse, setTestResponse] = React.useState<string>("");
    const [isDrawerVisible, setIsDrawerVisible] = React.useState(false);
    const [isCreateOperationDrawerVisible, setIsCreateOperationDrawerVisible] =
        React.useState(false);
    const [isUpdateOperationDrawerVisible, setIsUpdateOperationDrawerVisible] =
        React.useState(false);
    const [isCreateInputDrawerVisible, setIsCreateInputDrawerVisible] = React.useState(false);
    const [isUpdateInputDrawerVisible, setIsUpdateInputDrawerVisible] = React.useState(false);
    const [isRequestBodyDrawerVisible, setIsRequestBodyDrawerVisible] = React.useState(false);
    const [isResponseBodyDrawerVisible, setIsResponseBodyDrawerVisible] = React.useState(false);
    const [isCreateOutputDrawerVisible, setIsCreateOutputDrawerVisible] =
        React.useState(false);
    const [isUpdateOutputDrawerVisible, setIsUpdateOutputDrawerVisible] =
        React.useState(false);
    const [editingInput, setEditingInput] = React.useState<{
        id: string;
        key: string;
        value: { inputName: string; description: string };
    } | null>(null);
    const [editingOutput, setEditingOutput] = React.useState<{
        id: string;
        key: string;
        value: { outputName: string; description: string };
    } | null>(null);
    const [editingOperation, setEditingOperation] = React.useState<{
        id: string;
        key: string;
        value: { type: string; description: string };
    } | null>(null);
    const [operationForm, setOperationForm] = React.useState<{
        type: string;
        description: string;
    }>({type: OperationType.COMMON, description: ""});
    const [isRequestBodyEditable, setIsRequestBodyEditable] = useState(true);
    const [isResponseBodyEditable, setIsResponseBodyEditable] = useState(true);
    const [isEditEndpointModalVisible, setIsEditEndpointModalVisible] = useState(false);
    const [isExportCanvasModalVisible, setIsExportCanvasModalVisible] = useState(false);
    const [newEndpoint, setNewEndpoint] = React.useState<Partial<APIEndpoint>>({
        name: "",
        config: {
            method: "POST",
            localUrl: "",
            localHeader: "",
            filePath: "",
        },
        requestBody: "{}",
        responseBody: "{}",
        input: [],
        output: [],
        operation: [],
    });

    React.useEffect(() => {
        if (editingOperation) {
            setOperationForm({
                type: editingOperation.value.type,
                description: editingOperation.value.description,
            });
        } else {
            setOperationForm({type: OperationType.COMMON, description: ""});
        }
    }, [editingOperation]);

    const handleRequestBodyClose = () => {
        setIsRequestBodyEditable(false);
    };
    const handleResponseBodyClose = () => {
        setIsResponseBodyEditable(false);
    };

    const {canvasListLoad} = useAPICanvasListLoad({
        setEndpoints, setSelectedEndpoint
    });

    const loadProjectEndpoints = async (apiCanvases: Array<{ id: string; name: string }>) => {
        const entries = apiCanvases.map(({ id, name }) => [id, name] as const);
        if (!entries.length) {
            setEndpoints([]);
            setSelectedEndpoint(null);
            return [];
        }

        const endpointsArray = entries.map(([id, name]) => ({
            id,
            name: String(name || ""),
            description: "",
            config: {
                method: "POST" as const,
                localUrl: "",
                localHeader: "",
                filePath: "",
            },
            requestBody: "{}",
            responseBody: "{}",
            input: [],
            output: [],
            operation: [],
        }));

        setEndpoints(endpointsArray);
        setSelectedEndpoint((prev) => {
            const storedEndpointId = localStorage.getItem("selectedEndpointId");
            const nextSelectedEndpoint =
                (prev?.id && endpointsArray.find((item) => item.id === prev.id)) ||
                (storedEndpointId && endpointsArray.find((item) => item.id === storedEndpointId)) ||
                endpointsArray[0] ||
                null;

            if (nextSelectedEndpoint?.id) {
                localStorage.setItem("selectedEndpointId", nextSelectedEndpoint.id);
                localStorage.setItem("selectedEndpoint", JSON.stringify(nextSelectedEndpoint));
            } else {
                localStorage.removeItem("selectedEndpoint");
                localStorage.removeItem("selectedEndpointId");
            }

            return nextSelectedEndpoint;
        });

        return endpointsArray;
    };

    useEffect(() => {
        if (!currentProject?.id) return
        canvasListLoad(setLoading)
    }, [currentProject?.id])    
    const {addCanvas} = useAddEndPoint({
        newEndpoint,
        setNewEndpoint,
        endpoints,
        setEndpoints,
        setSelectedEndpoint,
        setIsDrawerVisible,
    });
    
    const {deleteEndpoint} = useDeleteEndPoint({
        endpoints,
        selectedEndpoint,
        setSelectedEndpoint,
        setEndpoints
    })
    
const updateNameAndConfig = async (editingEndpoint) => {
    if (!selectedEndpoint) return;

    const updatedEndpoint = {
        ...selectedEndpoint,
        ...editingEndpoint
    };

    try {
        // Create history record for the update
        const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
        const currentUserId = currentUserData?.uid;
        
        const historyRecord = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: currentUserId,
            userName: currentUserData?.name || currentUserData?.email || 'Unknown User',
            userEmail: currentUserData?.email || 'Unknown Email',
            actionType: 'API_CANVAS_UPDATE',
            fieldName: 'name_config',
            oldValue: {
                name: selectedEndpoint.name,
                config: selectedEndpoint.config
            },
            newValue: {
                name: editingEndpoint.name,
                config: editingEndpoint.config
            },
            apiCanvasId: selectedEndpoint.id,
            apiCanvasName: editingEndpoint.name,
            timestamp: new Date().toISOString(),
        };

        // Update or create history document
        const historyDocRef = doc(db, 'api_canvas_history', selectedEndpoint.id);
        const historyDoc = await getDoc(historyDocRef);
        
        if (historyDoc.exists()) {
            // Update existing document
            const existingData = historyDoc.data();
            const existingChanges = existingData.allChanges || [];
            const updatedChanges = [historyRecord, ...existingChanges].slice(0, 100);
            
            await updateDoc(historyDocRef, {
                updatedAt: serverTimestamp(),
                allChanges: updatedChanges,
                api_canvas_update_records: [historyRecord, ...(existingData.api_canvas_update_records || [])].slice(0, 20)
            });
        } else {
            // Create new document with setDoc instead of updateDoc
            await setDoc(historyDocRef, {
                apiCanvasId: selectedEndpoint.id,
                apiCanvasName: editingEndpoint.name,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                allChanges: [historyRecord],
                api_canvas_update_records: [historyRecord]
            });
        }

        // Update project's api_json
        const projectDocRef = doc(db, "projects", currentProject.id);
        const api_json = {};

        endpoints.map(item => item.id === selectedEndpoint.id ? ({
            ...selectedEndpoint,
            name: editingEndpoint.name
        }) : item).forEach(item => {
            api_json[item.id] = item.name
        });

        await updateDoc(projectDocRef, {
            api_json: JSON.stringify(api_json)
        });

        // Update the api_canvas document in Firestore
        const apiCanvasDocRef = doc(db, "api_canvas", selectedEndpoint.id);
        await updateDoc(apiCanvasDocRef, {
            name: editingEndpoint.name,
            config: editingEndpoint.config,
            updated_at: new Date().toISOString()
        });

        // Update local state
        updateEndpoint(updatedEndpoint);

    } catch (error) {
        console.error("Error updating API endpoint:", error);
        throw error;
    }
};

const updateEndpoint = async (updatedEndpoint: APIEndpoint) => {
    try {
        const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
        const currentUserId = currentUserData?.uid;
        
        // Find the old endpoint to compare changes
        const oldEndpoint = endpoints.find(ep => ep.id === updatedEndpoint.id);
        
        // Create history record for the update
        if (oldEndpoint) {
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: currentUserId,
                userName: currentUserData?.name || currentUserData?.email || 'Unknown User',
                userEmail: currentUserData?.email || 'Unknown Email',
                actionType: 'API_CANVAS_UPDATE',
                fieldName: 'endpoint',
                oldValue: oldEndpoint,
                newValue: updatedEndpoint,
                apiCanvasId: updatedEndpoint.id,
                apiCanvasName: updatedEndpoint.name,
                timestamp: new Date().toISOString(),
            };

            // Update or create history document
            const historyDocRef = doc(db, 'api_canvas_history', updatedEndpoint.id);
            const historyDoc = await getDoc(historyDocRef);
            
            if (historyDoc.exists()) {
                // Update existing document
                const existingData = historyDoc.data();
                const existingChanges = existingData.allChanges || [];
                const updatedChanges = [historyRecord, ...existingChanges].slice(0, 100);
                
                await updateDoc(historyDocRef, {
                    updatedAt: serverTimestamp(),
                    allChanges: updatedChanges,
                    api_canvas_update_records: [historyRecord, ...(existingData.api_canvas_update_records || [])].slice(0, 20)
                });
            } else {
                // Create new document with setDoc
                await setDoc(historyDocRef, {
                    apiCanvasId: updatedEndpoint.id,
                    apiCanvasName: updatedEndpoint.name,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    allChanges: [historyRecord],
                    api_canvas_update_records: [historyRecord]
                });
            }
        }

        // Update local state
        const updatedEndpoints = endpoints.map((ep) =>
            ep.id === updatedEndpoint.id ? updatedEndpoint : ep
        );
        setEndpoints(updatedEndpoints);
        setSelectedEndpoint(updatedEndpoint);
        
        // Update Firestore document
        const updateApiCanvasDocRef = doc(db, "api_canvas", updatedEndpoint.id);
        const {name, id, ...rest} = updatedEndpoint;
        
        await updateDoc(updateApiCanvasDocRef, {
            ...rest,
            name: updatedEndpoint.name,
            updated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error updating API endpoint:", error);
        throw error;
    }
};

    const {addInput, addOutput, addOperation} = useAddFunctions({
        selectedEndpoint,
        setIsInputDrawerVisible: setIsCreateInputDrawerVisible,
        setIsCreateOutputDrawerVisible,
        setIsCreateOperationDrawerVisible,
        setEditingInput,
        setEditingOutput,
        setEditingOperation
    });
    
    const {
        editInput,
        editOutput,
        editOperation
    } = useEditFunctions({
        setIsUpdateInputDrawerVisible,
        setIsUpdateOutputDrawerVisible,
        setIsUpdateOperationDrawerVisible,
        setEditingInput,
        setEditingOutput,
        setEditingOperation
    })

    const {deleteOutput} = useAPIOutputDelete({
        selectedEndpoint,
        updateEndpoint
    })
    
    const {deleteInput} = useAPIInputsDelete({
        selectedEndpoint,
        updateEndpoint
    })
    
    const {deleteOperationDescription} = useAPIOperationDescriptionDelete({selectedEndpoint, updateEndpoint});

    const {moveRow} = useMoveRow({
        selectedEndpoint,
        updateEndpoint,
    });

    const {createInput} = useAPIInputsCreate({
        selectedEndpoint,
        updateEndpoint,
        setIsInputDrawerVisible: setIsCreateInputDrawerVisible,
        setEditingInput
    });

    const {updateInput} = useAPIInputsUpdate({
        selectedEndpoint,
        updateEndpoint,
        editingInput,
        setIsInputDrawerVisible: setIsCreateInputDrawerVisible,
        setEditingInput
    })

    const {updateOperation} = useAPIUpdateOperationDescription({
        selectedEndpoint,
        updateEndpoint,
        setIsUpdateOperationDrawerVisible,
        setEditingOperation,
        editingOperation,
        operationForm
    });

    const {createOperation} = useAPICreateOperationDescription({
        selectedEndpoint,
        updateEndpoint,
        setIsCreateOperationDrawerVisible,
        setEditingOperation,
        operationForm
    });
    
    const {updateRequestBody} = useAPIRequestBodyUpdate({selectedEndpoint, updateEndpoint});
    const {updateResponseBody} = useAPIResponseBodyUpdate({selectedEndpoint, updateEndpoint});

    const {updateConfig} = useUpdateResAndReq({
        selectedEndpoint,
        updateEndpoint
    })

    const inputColumns = useInputColumns({
        selectedEndpoint,
        editInput,
        readOnly: false
    });

    const outputColumns = useOutputColumns({
        selectedEndpoint,
        editOutput
    });
    
    const {updateOutput} = useAPIOutputUpdate({
        selectedEndpoint,
        updateEndpoint,
        setIsUpdateOutputDrawerVisible,
        setEditingOutput,
        editingOutput
    })
    
    const {createOutput} = useAPIOutputCreate({
        selectedEndpoint,
        updateEndpoint,
        setIsCreateOutputDrawerVisible,
        setEditingOutput,
    })

    const operationColumns = useOperationColumns({
        selectedEndpoint,
        editOperation
    });

    const components = {
        body: {
            row: DraggableRow,
        },
    };

    const [isCopyEndpointModalVisible, setIsCopyEndpointModalVisible] = useState(false);
    const [importJson, setImportJson] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const {
        handleEndpointChange,
    } = useEndPointFunctions({
        endpoints,
        selectedEndpoint,
        setSelectedEndpoint,
        setEndpoints,
        setIsExportCanvasModalVisible
    });

    const {duplicateAPICanvas} = useAPICanvasDuplicate({
        endpoints,
        selectedEndpoint,
        setSelectedEndpoint,
        setEndpoints
    })

    const filteredEndpoints = endpoints.filter((ep) =>
        ep.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getMethodColor = (method: string) => {
        switch (method) {
            case "GET":
                return "green";
            case "POST":
                return "blue";
            case "PUT":
                return "orange";
            case "DELETE":
                return "red";
            default:
                return "default";
        }
    };
    
    const apiCanvasListener = () => {
        return selectedEndpoint && onSnapshot(doc(db, "api_canvas", selectedEndpoint.id), async (document) => {
                const data = document.data();
                if (!data) return;

                const newStructure = {
                    ...selectedEndpoint,
                    ...data,
                    name: data?.name ?? selectedEndpoint?.name ?? "",
                };
                setEndpoints((prev) => prev.map(item => item.id === data.id ? {...item, ...newStructure} : item))
                setSelectedEndpoint((prev) => ({...prev, ...newStructure}))
            }
        )
    }

    useEffect(() => {
        const endpointId = selectedEndpoint?.id;
        if (!endpointId || !currentProject?.id) return;

        const unsubscribe = apiCanvasListener();

        return () => unsubscribe();
    }, [selectedEndpoint?.id, currentProject?.id]);

    useEffect(() => {
        if (!currentProject?.id) {
            setEndpoints([]);
            setSelectedEndpoint(null);
            setLoading(false);
            return;
        }

        loadProjectEndpoints(apiCanvasCatalog);
        setLoading(false);
    }, [apiCanvasCatalog, currentProject?.id]);

    return {
        endpoints,
        setEndpoints,
        selectedEndpoint,
        setSelectedEndpoint,
        testResponse,
        setTestResponse,
        isDrawerVisible,
        setIsDrawerVisible,
        isCreateOperationDrawerVisible,
        setIsCreateOperationDrawerVisible,
        isUpdateOperationDrawerVisible,
        setIsUpdateOperationDrawerVisible,
        isCreateInputDrawerVisible,
        setIsCreateInputDrawerVisible,
        isUpdateInputDrawerVisible,
        setIsUpdateInputDrawerVisible,
        isCreateOutputDrawerVisible,
        setIsCreateOutputDrawerVisible,
        isUpdateOutputDrawerVisible,
        setIsUpdateOutputDrawerVisible,
        isExportCanvasModalVisible,
        setIsExportCanvasModalVisible,
        editingInput,
        editingOutput,
        editingOperation,
        newEndpoint,
        setNewEndpoint,
        operationForm,
        setOperationForm,
        addCanvas,
        addInput,
        addOutput,
        addOperation,
        editOutput,
        editOperation,
        updateInput,
        createInput,
        updateOutput,
        createOutput,
        deleteInput,
        deleteOutput,
        updateRequestBody,
        updateResponseBody,
        updateConfig,
        // testEndpoint,
        inputColumns,
        deleteEndpoint,
        outputColumns,
        operationColumns,
        components,
        moveRow,
        isRequestBodyEditable,
        setIsRequestBodyEditable,
        isResponseBodyEditable,
        setIsResponseBodyEditable,
        handleRequestBodyClose,
        handleResponseBodyClose,
        updateNameAndConfig,
        getMethodColor,
        filteredEndpoints,
        handleEndpointChange,
        searchTerm,
        setSearchTerm,
        importJson,
        setImportJson,
        isCopyEndpointModalVisible,
        setIsCopyEndpointModalVisible,
        isEditEndpointModalVisible,
        setIsEditEndpointModalVisible,
        updateOperation,
        createOperation,
        deleteOperationDescription,
        isRequestBodyDrawerVisible,
        setIsRequestBodyDrawerVisible,
        isResponseBodyDrawerVisible,
        setIsResponseBodyDrawerVisible,
        duplicateAPICanvas,
        apiCanvasRef, 
        loading,
        updateEndpoint // Export this function if needed elsewhere
    };
};

export default useApiCanvasStates;
