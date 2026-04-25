import services from "../services/backlogService";

interface HandleChangeStatusParams {
    checkedRow: React.Key[];
    newStatus: string;
    allTasks: any[];
    currentProject: any;
    currentUser: any;
    onSuccess: () => void;
}

export const handleChangeStatus = async ({
    checkedRow,
    newStatus,
    allTasks,
    currentProject,
    currentUser,
    onSuccess,
}: HandleChangeStatusParams) => {
    for (const row of checkedRow) {
        const rowId = String(row);
        const issue = allTasks.find((t) => t.id === rowId);
        if (!issue) continue;

        const oldStatus = issue.status;
        await services.changeStatus(
            currentProject.id,
            rowId,
            newStatus,
            currentUser?.uid,
            currentUser?.displayName || currentUser?.email,
            oldStatus
        );

        if (newStatus === "closed") {
            const now = new Date();
            const formatted = now.toISOString().replace("T", " ").slice(0, 19);
            await services.updateClosedDate(currentProject.id, rowId, formatted);
        }
    }

    onSuccess();
};
