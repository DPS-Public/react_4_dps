import { message } from "antd";
import services from "../services/backlogService";
import { handleAddCrdComponent } from "../handlers/handleAddCrdComponent";
import { handleDeleteCrdComponent as execDeleteCrdComponent } from "../handlers/handleDeleteCrdComponent";
import { handleChangeStatus } from "../handlers/handleChangeStatus";


interface UseBacklogActionsParams {
    currentProject: any;
    currentUser: any;
    currentRepo: string | null;
    allTasks: any[];
    filteredTask: any[];
    tasks: any[];
    checkedRow: React.Key[];
    activeTask: any;
    commentValue: string;
    formDesc: any;
    selectedCrdComponent: any | null;
    // setters
    setOpen: (v: boolean) => void;
    setEdit: (v: boolean) => void;
    setCommentVisible: (v: boolean) => void;
    setStatus: (v: boolean) => void;
    setDisabled: (v: boolean) => void;
    setCheckedRow: (v: React.Key[]) => void;
    setParentNo: (v: any) => void;
    setParentNoFlag: (v: boolean) => void;
    setTasks: (v: any[]) => void;
    setAllTasks: (v: any[]) => void;
    refreshTasks: () => Promise<void>;
    closeAddCrdDrawer: (setter: (v: boolean) => void) => void;
    setAddCrdComponentDrawer: (v: boolean) => void;
    setSelectedIssue: (v: any) => void;
    refreshSelectedIssue: (id: string) => Promise<void>;
    selectedIssue: any;
}

export const useBacklogActions = (p: UseBacklogActionsParams) => {

    const close = () => {
        p.setOpen(false);
        p.setEdit(false);
    };

    const updateComment = async () => {
        await services.editComment(p.currentProject?.id, p.activeTask.id, p.commentValue);
        p.setCommentVisible(false);
    };

    const updateDescription = async () => {
        const descValue = p.formDesc.getFieldValue("desc")?.trim();
        if (!descValue) return;
        await services.updateDescription(p.currentProject.id, p.activeTask.id, descValue);
        p.setEdit(false);
    };

    const changeStatus = async () => {
        const newStatus = p.formDesc.getFieldValue("status");
        if (!newStatus) {
            message.warning("Please select a status.");
            return;
        }

        await handleChangeStatus({
            checkedRow: p.checkedRow,
            newStatus,
            allTasks: p.allTasks,
            currentProject: p.currentProject,
            currentUser: p.currentUser,
            onSuccess: () => {
                p.setStatus(false);
                p.formDesc.resetFields();
            },
        });
    };

    const onDeleteCrdComponent = async (issueId: string, nodeId: string) => {
        await execDeleteCrdComponent({
            issueId,
            nodeId,
            allTasks: p.allTasks,
            currentProject: p.currentProject,
            currentUser: p.currentUser,
            onSuccess: p.refreshTasks,
        });
    };

    const onAddCrdComponent = async () => {
        await handleAddCrdComponent({
            selectedCrdComponent: p.selectedCrdComponent,
            checkedRow: p.checkedRow,
            allTasks: p.allTasks,
            filteredTask: p.filteredTask,
            currentProject: p.currentProject,
            currentUser: p.currentUser,
            currentRepo: p.currentRepo,
            onSuccess: () => {
                p.closeAddCrdDrawer(p.setAddCrdComponentDrawer);
                p.refreshTasks();
            },
        });
    };

    const onIssueDetailUpdate = async () => {
        if (p.currentProject?.id) {
            await p.refreshTasks();
            if (p.selectedIssue?.id) {
                await p.refreshSelectedIssue(p.selectedIssue.id);
            }
        }
    };

    const getParent = async (_issue: any, no: number) => {
        if (!no || !p.currentProject?.id) return;
        const list = p.tasks || p.allTasks || [];
        let parentIssue = list.find((t: any) => t.no === no);
        if (!parentIssue) {
            try {
                const all = await services.getTasks(p.currentProject.id);
                parentIssue = all.find((t: any) => t.no === no);
            } catch {
                // Parent lookup failure is handled by the warning below.
            }
        }
        if (parentIssue) {
            p.setParentNo(parentIssue);
            p.setParentNoFlag(true);
        } else {
            message.warning(`Parent issue with number ${no} not found`);
        }
    };

    const openIssueDetail = async (r: any) => {
        try {
            const fullIssue = await services.getTaskById(p.currentProject.id, r.id);
            p.setSelectedIssue({ ...r, ...fullIssue });
            p.setCheckedRow([r.id]);
        } catch {
            message.error("Failed to load issue details");
        }
    };

    const openEditTask = (r: any) => {
        services.getTaskById(p.currentProject.id, r.id).then((d) => {
            // activeTask is set by caller via setActiveTask
        });
        p.setEdit(true);
    };

    return {
        close,
        updateComment,
        updateDescription,
        changeStatus,
        onDeleteCrdComponent,
        onAddCrdComponent,
        onIssueDetailUpdate,
        getParent,
        openIssueDetail,
    };
};
