import { useState, useEffect, useCallback } from 'react';
import { UICanvasBacklogStatistics } from '../services/uiCanvasBacklogStatisticsService';
import { useAppSelector } from '@/store';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export function useUICanvasBacklogStatistics(projectId?: string) {
    const { canvasses } = useAppSelector((state) => state.auth);
    const [statistics, setStatistics] = useState<Record<string, UICanvasBacklogStatistics>>({});
    const [loading, setLoading] = useState(false);
    const [allBacklogIssues, setAllBacklogIssues] = useState<any[]>([]);

    const buildStatisticsFromIssues = useCallback((issues: any[]) => {
        const statsByCanvas: Record<string, UICanvasBacklogStatistics> = {};

        canvasses.forEach((canvas: any) => {
            const canvasIssues = issues.filter((issue: any) => {
                if (issue.uiCanvasId !== canvas.id) return false;
                if (issue.status === "canceled" && issue.requestType === "Backlog") {
                    return false;
                }
                return true;
            });

            const statusNewCount = canvasIssues.filter((issue: any) => issue.status === "new" || issue.status === "New").length;
            const statusOngoingCount = canvasIssues.filter((issue: any) =>
                issue.status === "ongoing" || issue.status === "Ongoing" || issue.status === "waiting" || issue.status === "Waiting"
            ).length;
            const statusClosedCount = canvasIssues.filter((issue: any) =>
                issue.status === "closed" || issue.status === "Closed"
            ).length;

            let canvasStatus: string;
            if (canvasIssues.length === 0 || statusClosedCount === 0) {
                canvasStatus = "not_started";
            } else if (statusClosedCount === canvasIssues.length) {
                canvasStatus = "closed";
            } else {
                canvasStatus = "in_progress";
            }

            statsByCanvas[canvas.id] = {
                canvas_status: canvasStatus,
                status_closed_count: statusClosedCount,
                status_new_count: statusNewCount,
                status_ongoing_count: statusOngoingCount,
            };
        });

        return statsByCanvas;
    }, [canvasses]);

    // Fetch all backlog issues for the project
    const fetchBacklogIssues = useCallback(async () => {
        if (!projectId) {
            setAllBacklogIssues([]);
            setStatistics({});
            return;
        }

        try {
            const backlogRef = collection(db, `backlog_${projectId}`);
            const snapshot = await getDocs(backlogRef);
            const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllBacklogIssues(issues);
            setStatistics(buildStatisticsFromIssues(issues));
        } catch (error) {
            console.error("Error fetching backlog issues:", error);
            setAllBacklogIssues([]);
            setStatistics({});
        }
    }, [buildStatisticsFromIssues, projectId]);

    const refreshStatistics = useCallback(async () => {
        if (!projectId || canvasses.length === 0) {
            setStatistics({});
            return;
        }

        setLoading(true);
        try {
            await fetchBacklogIssues();
        } catch (error) {
            console.error("Error refreshing statistics:", error);
        } finally {
            setLoading(false);
        }
    }, [projectId, canvasses, fetchBacklogIssues]);

    useEffect(() => {
        refreshStatistics();
    }, [refreshStatistics]);

    return {
        statistics,
        loading,
        refreshStatistics,
        allBacklogIssues
    };
}
