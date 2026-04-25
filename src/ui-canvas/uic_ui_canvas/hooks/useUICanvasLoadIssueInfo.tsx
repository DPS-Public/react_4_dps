import { useCallback } from "react";
import { RootState, useAppSelector } from "@/store";
import { serviceLoadIssueInfo } from "../services/serviceLoadIssueInfo";

export default function useUICanvasLoadIssueInfo() {
    const currentProjectId = useAppSelector((state: RootState) => state.project.currentProject?.id);

    const loadIssueInfo = useCallback(async (selectedUI: { input?: Record<string, unknown> }) => {
        return serviceLoadIssueInfo(currentProjectId ?? "", selectedUI?.input ?? {});
    }, [currentProjectId]);

    return { loadIssueInfo };
}
