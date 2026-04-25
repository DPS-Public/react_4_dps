import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Commit from '../types/commitTypes.interface';
import { syncUICanvasBacklogMetrics } from '@/ui-canvas/uic_ui_canvas/services/uICanvasAnalyticsService';

export interface LinkCommitResult {
    taskId:  string;
    success: boolean;
    error?:  any;
}

/**
 * Links a GitHub commit to one or more existing backlog tasks via Firestore updateDoc.
 * Collection: backlog_{projectId}
 *
 * Does NOT create a new backlog issue — only attaches commit metadata
 * to already-existing backlog items (currentTaskIds).
 *
 * Service layer — pure async, no React dependency.
 */
export const serviceLinkCommitToTask = async (
    projectId: string,
    taskIds: string[],
    commit: Commit
): Promise<LinkCommitResult[]> => {
    if (!projectId || taskIds.length === 0) return [];

    const normalizeGitHubUrl = (url?: string): string => {
        if (!url || typeof url !== 'string') return '';
        if (url.includes('api.github.com/repos/')) {
            return url
                .replace('https://api.github.com/repos/', 'https://github.com/')
                .replace('/commits/', '/commit/');
        }
        return url;
    };

    const updateData = {
        commitUrl:     normalizeGitHubUrl(commit.html_url || commit.url || ''),
        commitSha:     commit.sha,
        commitId:      commit.sha,
        commitMessage: commit.commit?.message || commit.message || '',
        commitAuthor:  commit.commit?.author?.name || commit.author?.name || commit.author?.login || 'Unknown',
        commitDate:    commit.commit?.author?.date || commit.author?.date || commit.date || new Date().toISOString(),
        codeLine:      commit.stats?.additions || 0,
        branch:        commit.branch || '',
        githubData:    commit,
    };

    return Promise.all(
        taskIds.map(async (taskId): Promise<LinkCommitResult> => {
            try {
                const taskRef = doc(db, `backlog_${projectId}`, taskId);
                await updateDoc(taskRef, updateData);
                try {
                    const taskSnapshot = await getDoc(taskRef);
                    const uiCanvasId = taskSnapshot.exists() ? taskSnapshot.data()?.uiCanvasId : "";
                    if (uiCanvasId) {
                        await syncUICanvasBacklogMetrics(projectId, uiCanvasId);
                    }
                } catch (syncError) {
                    console.error(`Error syncing UI canvas analytics for task ${taskId}:`, syncError);
                }
                return { taskId, success: true };
            } catch (error) {
                console.error(`Error linking commit to task ${taskId}:`, error);
                return { taskId, success: false, error };
            }
        })
    );
};
