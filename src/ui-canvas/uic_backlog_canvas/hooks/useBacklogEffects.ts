import { useEffect } from "react";
import { message } from "antd";
import { handleLoadExternalSourceCode } from "../handlers/handleLoadExternalSourceCode";


interface UseBacklogEffectsParams {
    checkedRow: React.Key[];
    tasks: any[];
    allTasks: any[];
    currentProject: any;
    commentVisible: boolean;
    data: any;
    activeTask: any;
    formDesc: any;
    setDisabled: (v: boolean) => void;
    setCalculateCodeLineEnabled: (v: boolean) => void;
    setCommentFlags: (flags: { [key: string]: boolean }) => void;
    setCommentValue: (v: string) => void;
    setExternalSourceCode: (v: string | null) => void;
    setExternalSourceCodeNode: (v: any | null) => void;
    setExternalSourceCodeDrawerOpen: (v: boolean) => void;
}

export const useBacklogEffects = ({
    checkedRow,
    tasks,
    allTasks,
    currentProject,
    commentVisible,
    data,
    activeTask,
    formDesc,
    setDisabled,
    setCalculateCodeLineEnabled,
    setCommentFlags,
    setCommentValue,
    setExternalSourceCode,
    setExternalSourceCodeNode,
    setExternalSourceCodeDrawerOpen,
}: UseBacklogEffectsParams) => {

    // Disable toolbar buttons when no row selected
    useEffect(() => {
        if (setDisabled && typeof setDisabled === "function") {
            setDisabled(checkedRow?.length === 0);
        }
    }, [checkedRow]);

    // Enable/disable Calculate Code Line based on selection
    useEffect(() => {
        if (!setCalculateCodeLineEnabled || typeof setCalculateCodeLineEnabled !== "function") return;
        if (!checkedRow || checkedRow.length === 0) {
            setCalculateCodeLineEnabled(false);
            return;
        }
        const list = tasks || allTasks || [];
        const selected = list.filter((t: any) => checkedRow.includes(t.id));
        setCalculateCodeLineEnabled(
            selected.length > 0 && selected.every((t: any) => t.status === "closed")
        );
    }, [checkedRow, tasks, allTasks, setCalculateCodeLineEnabled]);

    // Derive comment flags from the subscribed task payload instead of refetching each issue.
    useEffect(() => {
        const list = tasks?.length ? tasks : allTasks || [];
        const flags: { [key: string]: boolean } = {};

        for (const task of list) {
            const commentValue = task?.comment;
            flags[task.id] = Array.isArray(commentValue)
                ? commentValue.length > 0
                : Boolean(commentValue);
        }

        setCommentFlags(flags);
    }, [tasks, allTasks, setCommentFlags]);

    // Sync active task values into form
    useEffect(() => {
        if (activeTask) {
            setCommentValue(activeTask.comment || "");
            formDesc.setFieldValue("desc", activeTask.description || "");
        }
    }, [activeTask]);

    // Listen for openSourceCodeDrawer window event
    useEffect(() => {
        const handler = async (event: CustomEvent) => {
            const detail = event.detail || {};
            if (!detail.repoFullName || !detail.filePath) {
                message.warning("Missing repository or file path");
                return;
            }
            await handleLoadExternalSourceCode({
                repoFullName: detail.repoFullName,
                filePath: detail.filePath,
                branch: detail.branch || "main",
                nodeId: detail.nodeId,
                onSuccess: (content, node) => {
                    setExternalSourceCode(content);
                    setExternalSourceCodeNode(node);
                    setExternalSourceCodeDrawerOpen(true);
                },
            });
        };
        window.addEventListener("openSourceCodeDrawer", handler as EventListener);
        return () => window.removeEventListener("openSourceCodeDrawer", handler as EventListener);
    }, []);
};
