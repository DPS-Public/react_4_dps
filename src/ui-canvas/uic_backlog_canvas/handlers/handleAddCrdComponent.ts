import { message } from "antd";

import services from "../services/backlogService";

interface HandleAddCrdComponentParams {
    selectedCrdComponent: any | null;
    checkedRow: React.Key[];
    allTasks: any[];
    filteredTask: any[];
    currentProject: any;
    currentUser: any;
    currentRepo: string | null;
    onSuccess: () => void;
}

export const handleAddCrdComponent = async ({
    selectedCrdComponent,
    checkedRow,
    allTasks,
    filteredTask,
    currentProject,
    currentUser,
    currentRepo,
    onSuccess,
}: HandleAddCrdComponentParams) => {
    if (!selectedCrdComponent) {
        message.warning("Please select a component");
        return;
    }

    const updateInfo = (window as any).__updatingCrdComponent;
    const isUpdateMode = !!updateInfo;

    if (!isUpdateMode && checkedRow.length === 0) {
        message.warning("Please select at least one issue");
        return;
    }

    try {
        let selectedIssues: any[] = [];

        if (isUpdateMode) {
            const issue = allTasks.find((task) => task.id === updateInfo.issueId);
            if (issue) {
                selectedIssues = [issue];
            } else {
                return;
            }
        } else {
            selectedIssues = filteredTask.filter((task) => checkedRow.includes(task.id));
        }

        for (const issue of selectedIssues) {
            const nodeInfo = {
                nodeId: selectedCrdComponent.id,
                nodeName: selectedCrdComponent.name,
                path: selectedCrdComponent.githubPath || selectedCrdComponent.pathName || "",
                canvasType: selectedCrdComponent.canvasType || "",
                canvasId: selectedCrdComponent.canvasId || "",
                canvasName: selectedCrdComponent.canvasName || "",
                githubRepoFullName: selectedCrdComponent.githubRepoFullName || "",
                githubRepoId: selectedCrdComponent.githubRepoId || currentRepo || "",
                githubBranch: selectedCrdComponent.githubBranch || "main",
                externalPath: selectedCrdComponent.externalPath || "",
                externalRepoFullName: selectedCrdComponent.externalRepoFullName || "",
                externalBranch: selectedCrdComponent.externalBranch || "",
            };

            let existingNodeData: any[] = [];
            if (issue.crdNodeData) {
                try {
                    existingNodeData = JSON.parse(issue.crdNodeData);
                    if (!Array.isArray(existingNodeData)) {
                        existingNodeData = [existingNodeData];
                    }
                } catch {
                    existingNodeData = [];
                }
            }

            let oldNode: any = null;

            if (isUpdateMode) {
                const nodeIndex = existingNodeData.findIndex(
                    (node: any) => node.nodeId === updateInfo.oldNodeId
                );
                if (nodeIndex !== -1) {
                    oldNode = { ...existingNodeData[nodeIndex] };
                    existingNodeData[nodeIndex] = nodeInfo;
                } else {
                    message.warning("Component not found to update");
                    continue;
                }
            } else {
                const nodeExists = existingNodeData.some(
                    (node: any) => node.nodeId === nodeInfo.nodeId
                );
                if (nodeExists) continue;
                existingNodeData.push(nodeInfo);
            }

            const collection: any = { ...(issue.collection || {}) };
            if (nodeInfo.githubRepoId && !collection.repoId) {
                collection.repoId = nodeInfo.githubRepoId;
            }
            if (nodeInfo.canvasType && nodeInfo.canvasId) {
                if (nodeInfo.canvasType === "api") {
                    collection.apiCanvas1 = nodeInfo.canvasId;
                } else if (nodeInfo.canvasType === "ui") {
                    collection.uiCanvas1 = nodeInfo.canvasId;
                }
            }

            const { doc, updateDoc } = await import("firebase/firestore");
            const { db } = await import("@/config/firebase");
            const docRef = doc(db, `backlog_${currentProject.id}`, issue.id);
            await updateDoc(docRef, {
                crdNodeData: JSON.stringify(existingNodeData),
                collection,
            });

            try {
                if (isUpdateMode) {
                    await services.addIssueHistory(currentProject.id, issue.id, {
                        action: "updated CRD Component",
                        user: currentUser?.displayName || currentUser?.email || "Unknown",
                        userId: currentUser?.uid || "",
                        details: {
                            oldComponent: oldNode?.nodeName || "Unknown",
                            newComponent: nodeInfo.nodeName,
                            path: nodeInfo.path,
                        },
                    });
                } else {
                    await services.addIssueHistory(currentProject.id, issue.id, {
                        action: "added CRD Component",
                        user: currentUser?.displayName || currentUser?.email || "Unknown",
                        userId: currentUser?.uid || "",
                        details: {
                            component: nodeInfo.nodeName,
                            path: nodeInfo.path,
                        },
                    });
                }
            } catch (historyError) {
                console.error("Error adding history entry:", historyError);
            }
        }

        if (isUpdateMode) {
            message.success(`Component "${selectedCrdComponent.name}" updated successfully`);
        } else {
            message.success(
                `Component "${selectedCrdComponent.name}" added to ${selectedIssues.length} issue(s)`
            );
        }

        delete (window as any).__updatingCrdComponent;
        onSuccess();
    } catch (error) {
        console.error("Error adding/updating CRD component:", error);
        message.error(isUpdateMode ? "Failed to update component" : "Failed to add component to issues");
    }
};
