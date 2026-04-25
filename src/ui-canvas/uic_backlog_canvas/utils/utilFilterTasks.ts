export const utilFilterTasks = (tasks: any[], filter: any): any[] => {
    return tasks?.filter((task) => {
        const matchId =
            !filter?.ids ||
            filter?.ids?.some((id: string) => id.toLowerCase() === task?.id?.toLowerCase());

        const matchType =
            !filter?.type || task?.type?.toLowerCase() === filter?.type?.toLowerCase();

        const matchStatus =
            !filter?.status || task?.status?.toLowerCase() === filter?.status?.toLowerCase();

        const matchNo =
            !filter?.no ||
            String(task?.no)?.toLowerCase() === String(filter?.no)?.toLowerCase();

        const matchAssigne =
            !filter?.assignee ||
            task?.assignee?.toLowerCase() === filter?.assignee?.toLowerCase();

        const matchDate =
            !filter?.createdDate || task?.createdAt?.split("T")[0] == filter?.createdDate;

        return matchId && matchType && matchStatus && matchAssigne && matchNo && matchDate;
    });
};

const utilNormalizeTaskValue = (value: unknown): string =>
    String(value ?? "").trim().toLowerCase();

export const utilGetPriorityOrder = (priority: string | undefined): number => {
    const normalizedPriority = utilNormalizeTaskValue(priority);

    if (normalizedPriority === "urgent") return 1;
    if (normalizedPriority === "high") return 2;
    return 3;
};

export const utilSortTasksByPriority = (tasks: any[]): any[] => {
    return tasks
        .map((task: any, index: number) => ({ task, index }))
        .sort((a: any, b: any) => {
            const statusA = utilNormalizeTaskValue(a.task?.status);
            const statusB = utilNormalizeTaskValue(b.task?.status);
            const priorityOrderA = utilGetPriorityOrder(a.task?.priority);
            const priorityOrderB = utilGetPriorityOrder(b.task?.priority);
            const isTopPriorityA = statusA === "new" && priorityOrderA < 3;
            const isTopPriorityB = statusB === "new" && priorityOrderB < 3;

            if (isTopPriorityA !== isTopPriorityB) {
                return isTopPriorityA ? -1 : 1;
            }

            if (isTopPriorityA && priorityOrderA !== priorityOrderB) {
                return priorityOrderA - priorityOrderB;
            }

            const dateA = a.task?.createdAt ? new Date(a.task.createdAt).getTime() : 0;
            const dateB = b.task?.createdAt ? new Date(b.task.createdAt).getTime() : 0;

            if (dateA !== dateB) {
                return dateB - dateA;
            }

            return a.index - b.index;
        })
        .map(({ task }: any) => task);
};

export const utilRenderDescriptionWithTags = (description: string): any => {
    if (!description) return description;

    const tagRegex = /\[([^\]]+)\]/g;
    const parts: any[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(description)) !== null) {
        if (match.index > lastIndex) {
            parts.push(description.substring(lastIndex, match.index));
        }
        parts.push({
            type: "tag",
            key: match.index,
            text: match[0],
        });
        lastIndex = tagRegex.lastIndex;
    }

    if (lastIndex < description.length) {
        parts.push(description.substring(lastIndex));
    }

    return parts;
};
