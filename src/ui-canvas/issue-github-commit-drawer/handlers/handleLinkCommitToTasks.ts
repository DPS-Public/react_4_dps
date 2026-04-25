import { message } from 'antd';
import React from 'react';
import { serviceLinkCommitToTask } from '../services/serviceLinkCommitToTask';
import Commit from '../types/commitTypes.interface';

export interface HandleLinkCommitToTasksDeps {
    projectId:           string;
    currentTaskIds:      string[];
    setAddingCommits:    React.Dispatch<React.SetStateAction<Set<string>>>;
    setCommitToIssueMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    onIssuesUpdate?:     () => void;
}

/**
 * Handles the onClick event on the "Add to N item(s)" button.
 * Links the commit to all currently selected backlog task IDs.
 *
 * Chain: onClick (Add) → handleLinkCommitToTasks → serviceLinkCommitToTask → Firestore
 */
export const handleLinkCommitToTasks = async (
    commit: Commit,
    deps: HandleLinkCommitToTasksDeps
): Promise<void> => {
    const { projectId, currentTaskIds, setAddingCommits, setCommitToIssueMap, onIssuesUpdate } = deps;

    if (!projectId || currentTaskIds.length === 0) {
        message.warning('No backlog items selected');
        return;
    }

    setAddingCommits(prev => new Set(prev).add(commit.sha));

    try {
        const results    = await serviceLinkCommitToTask(projectId, currentTaskIds, commit);
        const successful = results.filter(r => r.success).length;
        const failed     = results.filter(r => !r.success).length;

        if (successful > 0) {
            message.success(
                `Commit ${commit.sha.substring(0, 7)} added to ${successful} item(s)` +
                (failed > 0 ? `, ${failed} failed` : '')
            );
            setCommitToIssueMap(prev => ({
                ...prev,
                [commit.sha]: {
                    id:           currentTaskIds.join(','),
                    commitSha:    commit.sha,
                    addedToTasks: successful,
                    totalTasks:   currentTaskIds.length,
                },
            }));
        } else {
            message.error('Failed to add commit to any backlog item');
        }

        if (onIssuesUpdate) onIssuesUpdate();
    } catch (e: any) {
        message.error('Failed to link commit: ' + (e?.message || 'Unknown error'));
    } finally {
        setAddingCommits(prev => {
            const s = new Set(prev);
            s.delete(commit.sha);
            return s;
        });
    }
};
