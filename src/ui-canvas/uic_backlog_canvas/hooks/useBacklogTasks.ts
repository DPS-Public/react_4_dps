import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import services from "../services/backlogService";
import { utilFilterTasks, utilSortTasksByPriority } from "../utils/utilFilterTasks";

export const useBacklogTasks = (data?: any[], filterValues?: any, userId?: any) => {
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [dataFilter, setDataFilter] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const currentProject = useSelector((state: RootState) => state.project.currentProject);

    // Real-time subscription
    useEffect(() => {
        if (!currentProject?.id) return;
        const unsubscribe: () => void = services.subscribeTasks(currentProject?.id, (t) => {
            setTasks(t);
            setAllTasks(t);
        });
        return () => unsubscribe();
    }, [currentProject?.id]);

    // Refresh event listener (from Toolbox)
    useEffect(() => {
        const handleRefresh = async () => {
            if (!currentProject?.id) return;
            try {
                const updatedTasks = await services.getTasks(currentProject.id);
                setTasks(updatedTasks || []);
                setAllTasks(updatedTasks || []);
            } catch (error) {
                console.error("Error refreshing table:", error);
            }
        };
        window.addEventListener("refreshBacklogTable", handleRefresh as EventListener);
        return () => window.removeEventListener("refreshBacklogTable", handleRefresh as EventListener);
    }, [currentProject?.id]);

    // Filter based on data prop
    useEffect(() => {
        if (Array.isArray(data)) {
            setDataFilter(data);
            return;
        }
        if (!allTasks?.length || !data) return;
        setDataFilter(utilFilterTasks(allTasks, data));
    }, [allTasks, data]);

    // Compute filtered + sorted tasks
    const baseFilteredTask =
        data && dataFilter
            ? dataFilter
            : filterValues
            ? allTasks.filter((item) =>
                  Object.entries(filterValues).every(([key, value]) => {
                      if (!value) return true;

                      if (key === "searchKeyword" && typeof value === "string") {
                          const keyword = value.toLowerCase().trim();
                          if (!keyword) return true;

                          const issueNo = String(item?.no ?? "").toLowerCase();
                          const issueDescription = String(item?.description ?? "").toLowerCase();

                          return issueNo.includes(keyword) || issueDescription.includes(keyword);
                      }

                      if (Array.isArray(value)) {
                          if (!value.length) return true;
                          const itemValue = String(item?.[key] ?? "").toLowerCase();
                          return value.some((entry) => String(entry).toLowerCase() === itemValue);
                      }

                      if (typeof item[key] === "string" && typeof value === "string") {
                          return item[key].toLowerCase().includes(value.toLowerCase());
                      }
                      return item[key] == value;
                  })
              )
            : allTasks;

    let filteredTask =
        userId?.status && userId?.id
            ? baseFilteredTask.filter(
                  (t: any) =>
                      String(t?.assignee || "").toLowerCase() === String(userId.id).toLowerCase()
              )
            : baseFilteredTask;

    filteredTask = utilSortTasksByPriority(filteredTask);

    const refreshTasks = async () => {
        if (!currentProject?.id) return;
        const updated = await services.getTasks(currentProject.id);
        setTasks(updated || []);
        setAllTasks(updated || []);
    };

    return {
        allTasks,
        setAllTasks,
        tasks,
        setTasks,
        dataFilter,
        setDataFilter,
        filteredTask,
        refreshTasks,
    };
};
