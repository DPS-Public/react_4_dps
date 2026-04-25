import { message } from "antd";
import services from "../services/backlogService";

interface HandleDeleteCrdComponentParams {
    issueId: string;
    nodeId: string;
    allTasks: any[];
    currentProject: any;
    currentUser: any;
    onSuccess: () => void;
}

export const handleDeleteCrdComponent = async ({
    issueId,
    nodeId,
    allTasks,
    currentProject,
    currentUser,
    onSuccess,
}: HandleDeleteCrdComponentParams) => {
    try {
        const issue = allTasks.find((task) => task.id === issueId);
        if (!issue) {
            message.error("Issue not found");
            return;
        }

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

        const deletedNode = existingNodeData.find((node: any) => node.nodeId === nodeId);
        const updatedNodeData = existingNodeData.filter((node: any) => node.nodeId !== nodeId);

        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("@/config/firebase");
        const docRef = doc(db, `backlog_${currentProject.id}`, issueId);
        await updateDoc(docRef, {
            crdNodeData: JSON.stringify(updatedNodeData),
        });

        try {
            if (deletedNode) {
                await services.addIssueHistory(currentProject.id, issueId, {
                    action: "deleted CRD Component",
                    user: currentUser?.displayName || currentUser?.email || "Unknown",
                    userId: currentUser?.uid || "",
                    details: {
                        component: deletedNode.nodeName || "Unknown",
                        path: deletedNode.path || "",
                    },
                });
            }
        } catch (historyError) {
            console.error("Error adding history entry:", historyError);
        }

        message.success("Component removed successfully");
        onSuccess();
    } catch (error) {
        console.error("Error deleting CRD component:", error);
        message.error("Failed to remove component");
    }
};
