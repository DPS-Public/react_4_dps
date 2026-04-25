import { useState, useEffect } from 'react';
import { message } from 'antd';
import { Dayjs } from 'dayjs';
import Commit from '../types/Commit.interface';
import { fetchCommits } from '../services/fetchCommits';

/**
 * Manages commit list state and tracks which commit SHAs are already
 * in the backlog (commitToIssueMap).
 *
 * Auto-loads when the drawer opens with valid repo + branch selection.
 * Also exposes `loadCommits` for manual re-triggering via the "Load Commits" button.
 *
 * Hook layer — React state + useEffect only.
 * Delegates all API calls to fetchCommits (service layer).
 */
export const useCommits = (
    open: boolean,
    projectId: string | undefined,
    selectedRepoId: string | null,
    repositories: any[],
    selectedBranches: string[],
    dateRange: [Dayjs | null, Dayjs | null] | null,
    initialPageSize: number
) => {
    const [commits, setCommits] = useState<Commit[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: initialPageSize,
    });

    const loadCommits = async () => {
        if (!selectedRepoId || !projectId) {
            message.warning('Please select a repository first');
            return;
        }
        if (selectedBranches.length === 0) {
            message.warning('Please select at least one branch');
            return;
        }

        const repo = repositories.find(
            (r: any) => String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );
        if (!repo?.full_name) {
            message.error('Repository not found');
            return;
        }

        setLoading(true);
        try {
            // Fetch commits from all selected branches, deduplicating by SHA
            const allCommits: Commit[] = [];
            const seen = new Set<string>();

            for (const branch of selectedBranches) {
                try {
                    const branchCommits = await fetchCommits({
                        repoFullName: repo.full_name,
                        branch,
                        dateRange,
                    });
                    branchCommits.forEach(commit => {
                        if (!seen.has(commit.sha)) {
                            seen.add(commit.sha);
                            allCommits.push(commit);
                        }
                    });
                } catch (err: any) {
                    console.error(`Error loading commits from branch ${branch}:`, err);
                }
            }

            // Sort by commit date descending
            allCommits.sort((a, b) => {
                const dateA = new Date(
                    a.commit?.author?.date || a.author?.date || a.date || 0
                ).getTime();
                const dateB = new Date(
                    b.commit?.author?.date || b.author?.date || b.date || 0
                ).getTime();
                return dateB - dateA;
            });

            setCommits(allCommits);
            setPagination(prev => ({ ...prev, current: 1 }));

            if (allCommits.length === 0) {
                message.info('No commits found in selected branches');
            }
        } catch (error: any) {
            message.error(error?.message || 'Failed to load commits');
            setCommits([]);
        } finally {
            setLoading(false);
        }
    };

    // Intentionally no auto-load to avoid duplicate API calls.
    // Commits are loaded only by explicit "Load Commits" action.

    return {
        commits,
        loading,
        pagination,
        setPagination,
        loadCommits,
    };
};
