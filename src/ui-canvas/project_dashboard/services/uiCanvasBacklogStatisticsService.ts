import { db } from "@/config/firebase";
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore";

export interface UICanvasBacklogStatistics {
    canvas_status: string; // "not_started" | "in_progress" | "closed"
    status_closed_count: number;
    status_new_count: number;
    status_ongoing_count: number;
}

const COLLECTION_NAME = "ui_canvas_backlog_statistics";

/**
 * Get statistics for a specific UI canvas
 */
export async function getUICanvasStatistics(uiCanvasId: string): Promise<UICanvasBacklogStatistics | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, uiCanvasId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data() as UICanvasBacklogStatistics;
        }
        return null;
    } catch (error) {
        console.error("Error getting UI canvas statistics:", error);
        return null;
    }
}

/**
 * Get statistics for multiple UI canvases
 */
export async function getMultipleUICanvasStatistics(uiCanvasIds: string[]): Promise<Record<string, UICanvasBacklogStatistics>> {
    const statistics: Record<string, UICanvasBacklogStatistics> = {};
    
    try {
        const promises = uiCanvasIds.map(async (canvasId) => {
            const stats = await getUICanvasStatistics(canvasId);
            if (stats) {
                statistics[canvasId] = stats;
            }
        });
        
        await Promise.all(promises);
        return statistics;
    } catch (error) {
        console.error("Error getting multiple UI canvas statistics:", error);
        return statistics;
    }
}

/**
 * Update or create statistics for a UI canvas
 */
export async function updateUICanvasStatistics(
    uiCanvasId: string,
    statistics: UICanvasBacklogStatistics
): Promise<boolean> {
    try {
        const docRef = doc(db, COLLECTION_NAME, uiCanvasId);
        await setDoc(docRef, statistics, { merge: true });
        return true;
    } catch (error) {
        console.error("Error updating UI canvas statistics:", error);
        return false;
    }
}

/**
 * Calculate and update statistics for a UI canvas based on backlog issues
 */
export async function calculateAndUpdateUICanvasStatistics(
    uiCanvasId: string,
    projectId: string
): Promise<UICanvasBacklogStatistics | null> {
    try {
        // Get all backlog issues for this project
        const backlogRef = collection(db, `backlog_${projectId}`);
        const snapshot = await getDocs(backlogRef);
        
        // Filter issues for this UI canvas (excluding canceled with request type Backlog)
        const canvasIssues = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((issue: any) => {
                // Check if issue belongs to this canvas
                if (issue.uiCanvasId !== uiCanvasId) return false;
                
                // Exclude canceled issues with request type Backlog
                if (issue.status === "canceled" && issue.requestType === "Backlog") {
                    return false;
                }
                
                return true;
            });
        
        // Count by status
        const statusNewCount = canvasIssues.filter((issue: any) => issue.status === "new" || issue.status === "New").length;
        const statusOngoingCount = canvasIssues.filter((issue: any) => 
            issue.status === "ongoing" || issue.status === "Ongoing" || issue.status === "waiting" || issue.status === "Waiting"
        ).length;
        const statusClosedCount = canvasIssues.filter((issue: any) => 
            issue.status === "closed" || issue.status === "Closed"
        ).length;
        
        // Determine canvas status based on rules:
        // 1. Not Started: none of issues are closed (exclude: status=canceled AND requestType=Backlog)
        // 2. In Progress: at least one issue is closed (exclude: status=canceled AND requestType=Backlog)
        // 3. Closed: all issues are closed (exclude: status=canceled AND requestType=Backlog)
        let canvasStatus: string;
        if (canvasIssues.length === 0) {
            // No issues means not started
            canvasStatus = "not_started";
        } else if (statusClosedCount === 0) {
            // Not Started: none of issues are closed
            canvasStatus = "not_started";
        } else if (statusClosedCount === canvasIssues.length) {
            // Closed: all issues are closed
            canvasStatus = "closed";
        } else {
            // In Progress: at least one issue is closed but not all
            canvasStatus = "in_progress";
        }
        
        const statistics: UICanvasBacklogStatistics = {
            canvas_status: canvasStatus,
            status_closed_count: statusClosedCount,
            status_new_count: statusNewCount,
            status_ongoing_count: statusOngoingCount,
        };
        
        // Update in Firestore
        await updateUICanvasStatistics(uiCanvasId, statistics);
        
        return statistics;
    } catch (error) {
        console.error("Error calculating UI canvas statistics:", error);
        return null;
    }
}

/**
 * Calculate and update statistics for all UI canvases in a project
 */
export async function calculateAllUICanvasStatistics(projectId: string, uiCanvasIds: string[]): Promise<void> {
    try {
        const promises = uiCanvasIds.map(canvasId => 
            calculateAndUpdateUICanvasStatistics(canvasId, projectId)
        );
        await Promise.all(promises);
    } catch (error) {
        console.error("Error calculating all UI canvas statistics:", error);
    }
}
