import { db } from "@/config/firebase";
import { useAppSelector } from "@/store";
import { message } from "antd";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import services from "../services/backlogService";
import { useProjectUsers } from "@/hooks/useProjectUsers";

const useCreateIssue = () => {
    const { currentUser, canvasses } = useAppSelector(state => state.auth)
    const { currentProject } = useAppSelector(state => state.project)
    const { projectUsers: users } = useProjectUsers();

    // Helper function to find node by ID in tree
    const findNodeById = (nodes: any[], id: string): any => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNodeById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const createIssue = async (values, uploadedUrlList, selectedNodes?: Set<string>, treeData?: any[]) => {

        if (!currentUser) {
            message.error("User not found!")
            return
        }
        else {
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, "0");
            const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

            const counterRef = doc(db, "backlog_counter", currentProject?.id);
            let docSnap = await getDoc(counterRef);

            const userName = users.find((item: any) => item?.uid == values?.assignee)?.displayName as any
            const userPhoto = users.find((item: any) => item?.uid == values?.assignee)?.photoURL as any
            
            // If there are selected nodes, create a separate issue for each node
            if (selectedNodes && selectedNodes.size > 0 && treeData) {
                const nodeArray = Array.from(selectedNodes);
                let createdCount = 0;
                let firstRepoId: string | null = null;
                
                // Find first repoId to use as fallback
                for (const nodeId of nodeArray) {
                    const node = findNodeById(treeData, nodeId);
                    if (node && node.githubRepoId) {
                        firstRepoId = node.githubRepoId;
                        break;
                    }
                }
                
                // Create a separate issue for each selected node
                for (const nodeId of nodeArray) {
                    const node = findNodeById(treeData, nodeId);
                    if (!node) continue;
                    
                    // Build collection object for this single node
                    const collection: any = {};
                    
                    if (node.canvasType && node.canvasId) {
                        if (node.canvasType === 'api') {
                            collection.apiCanvas1 = node.canvasId;
                        } else if (node.canvasType === 'ui') {
                            collection.uiCanvas1 = node.canvasId;
                        }
                    }
                    
                    // Add repoId to collection if we have it
                    const nodeRepoId = (node.githubRepoId && node.githubRepoId.trim() !== '') ? node.githubRepoId : (firstRepoId || '');
                    if (nodeRepoId) {
                        collection.repoId = nodeRepoId;
                    }
                    
                    // Store single node information
                    // Use githubPath or pathName (full path including file name) for path field
                    // nodeName should be the component name (from FILE_COMPONENT_RELATION), not file name
                    const fullPath = node.githubPath || node.pathName || '';
                    
                    // Try to get component name from FILE_COMPONENT_RELATION collection
                    let componentName = node.name; // Fallback to node.name
                    if (fullPath) {
                        try {
                            const fileComponentRelationRef = collection(db, 'FILE_COMPONENT_RELATION');
                            const filePathQuery = query(
                                fileComponentRelationRef,
                                where('filePath', '==', fullPath)
                            );
                            const filePathSnapshot = await getDocs(filePathQuery);
                            
                            // Also try with githubPath field
                            const githubPathQuery = query(
                                fileComponentRelationRef,
                                where('githubPath', '==', fullPath)
                            );
                            const githubPathSnapshot = await getDocs(githubPathQuery);
                            
                            // Get component name from first match
                            if (!filePathSnapshot.empty) {
                                const firstDoc = filePathSnapshot.docs[0];
                                const data = firstDoc.data();
                                if (data.componentName) {
                                    componentName = data.componentName;
                                }
                            } else if (!githubPathSnapshot.empty) {
                                const firstDoc = githubPathSnapshot.docs[0];
                                const data = firstDoc.data();
                                if (data.componentName) {
                                    componentName = data.componentName;
                                }
                            } else {
                                // If not found in FILE_COMPONENT_RELATION, remove file extension from node.name
                                const lastDotIndex = node.name.lastIndexOf('.');
                                if (lastDotIndex !== -1) {
                                    componentName = node.name.substring(0, lastDotIndex);
                                }
                            }
                        } catch (error) {
                            console.error(`Error fetching component name for ${fullPath}:`, error);
                            // Fallback: remove file extension from node.name
                            const lastDotIndex = node.name.lastIndexOf('.');
                            if (lastDotIndex !== -1) {
                                componentName = node.name.substring(0, lastDotIndex);
                            }
                        }
                    } else {
                        // If no path, try to remove file extension from node.name
                        const lastDotIndex = node.name.lastIndexOf('.');
                        if (lastDotIndex !== -1) {
                            componentName = node.name.substring(0, lastDotIndex);
                        }
                    }
                    
                    const nodeInfo = {
                        nodeId: node.id,
                        nodeName: componentName, // Component name from FILE_COMPONENT_RELATION or without extension
                        path: fullPath, // Full path including file name (e.g., "src/pages/Login/route.js")
                        canvasType: node.canvasType || '',
                        canvasId: node.canvasId || '',
                        canvasName: node.canvasName || '',
                        githubRepoFullName: node.githubRepoFullName || '',
                        githubRepoId: nodeRepoId,
                        githubBranch: node.githubBranch || 'main',
                        externalPath: node.externalPath || '',
                        externalRepoFullName: node.externalRepoFullName || '',
                        externalBranch: node.externalBranch || '',
                        collectionIds: node.collectionIds || []
                    };
                    
                    const issueData: any = {
                        no: docSnap?.exists() ? docSnap.data()?.lastTaskNo : 1,
                        description: values.description.trim(),
                        assignee: values?.assignee,
                        assigneeName: userName,
                        assigneePhotoUrl: userPhoto,
                        createdBy: currentUser && currentUser?.displayName,
                        createdByUid: currentUser?.uid,
                        uiCanvas: canvasses.find(item => item.id == values.uiCanvas)?.label,
                        uiCanvasId: values.uiCanvas,
                        type: values.type,
                        priority: values.priority || "Normal",
                        comment: "",
                        imageUrl: uploadedUrlList || null,
                        createdAt: formatted,
                        closedDate: "",
                        status: "new",
                        api: "",
                        apiDescription: "",
                        sh: 0,
                        eh: 0,
                    };
                    
                    // Add collection if it has values
                    if (Object.keys(collection).length > 0) {
                        issueData.collection = collection;
                    }
                    
                    // Store single node information for description details rendering
                    issueData.crdNodeData = JSON.stringify([nodeInfo]);
                    
                    const issueId = await services.createIssue(currentProject?.id, issueData);
                    createdCount++;
                    
                    // Update counter reference for next issue
                    docSnap = await getDoc(counterRef);
                }
                
                message.success(`${createdCount} issue(s) created successfully`);
            } else {
                // No selected nodes, create a single issue as before
                const issueData: any = {
                    no: docSnap?.exists() ? docSnap.data()?.lastTaskNo : 1,
                    description: values.description.trim(),
                    assignee: values?.assignee,
                    assigneeName: userName,
                    assigneePhotoUrl: userPhoto,
                    createdBy: currentUser && currentUser?.displayName,
                    createdByUid: currentUser?.uid,
                    uiCanvas: canvasses.find(item => item.id == values.uiCanvas)?.label,
                    uiCanvasId: values.uiCanvas,
                    type: values.type,
                    priority: values.priority || "Normal",
                    comment: "",
                    imageUrl: uploadedUrlList || null,
                    createdAt: formatted,
                    closedDate: "",
                    status: "new",
                    api: "",
                    apiDescription: "",
                    sh: 0,
                    eh: 0,
                };
                
                const issueId = await services.createIssue(currentProject?.id, issueData);
            }
        }
    }
    return {
        createIssue
    };
}
export default useCreateIssue
