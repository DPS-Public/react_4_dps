import { useState, useEffect } from 'react';
import { message } from 'antd';
import { Dayjs } from 'dayjs';
import services from '@/ui-canvas/uic_backlog_canvas/services/backlogService';
import Commit from '../types/commitTypes.interface';
import { fetchCommits } from '../services/serviceCommits';

/**
 * Fetches commits from all selected branches, deduplicates by SHA,
 * sorts by date descending, and builds a commitToIssueMap from existing backlog issues.
 */
export const useCommits = (
    open: boolean,
    projectId: string | undefined,
    selectedRepoId: string | null,
    repositories: any[],
    selectedBranches: string[],
    dateRange: [Dayjs | null, Dayjs | null] | null,
    defaultPageSize: number
) => {
    const [commits,           setCommits]          = useState<Commit[]>([]);
    const [loading,           setLoading]           = useState(false);
    const [commitToIssueMap,  setCommitToIssueMap]  = useState<Record<string, any>>({});
    const [pagination,        setPagination]        = useState({ current: 1, pageSize: defaultPageSize });

    const loadCommits = async () => {
        if (!selectedRepoId || !projectId) {
            message.warning('Please select a repository first');
            return;
        }
        if (selectedBranches.length === 0) {
            message.warning('Please select at least one branch');
            return;
        }

        const repo = repositories.find((r: any) =>
            String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );
        if (!repo?.full_name) { message.error('Repository not found'); return; }

        setLoading(true);
        try {
            const issues = await services.getTasks(projectId);

            const issueMap: Record<string, any> = {};
            (issues || []).forEach((issue: any) => {
                const id = issue.commitId || issue.commitSha;
                if (id) issueMap[id] = issue;
            });
            setCommitToIssueMap(issueMap);

            const all: Commit[]      = [];
            const seen = new Set<string>();

            for (const branch of selectedBranches) {
                try {
                    const fetched = await fetchCommits({
                        repoFullName: repo.full_name,
                        branch,
                        since: dateRange?.[0]?.startOf('day').toISOString(),
                        until: dateRange?.[1]?.endOf('day').toISOString(),
                    });
                    fetched.forEach(c => {
                        if (!seen.has(c.sha)) { seen.add(c.sha); all.push(c); }
                    });
                } catch (e) {
                    console.error(`Error fetching branch ${branch}:`, e);
                }
            }

            all.sort((a, b) => {
                const dA = new Date(a.commit?.author?.date || a.author?.date || a.date || 0).getTime();
                const dB = new Date(b.commit?.author?.date || b.author?.date || b.date || 0).getTime();
                return dB - dA;
            });

            setCommits(all);
            setPagination(p => ({ ...p, current: 1 }));
            if (all.length === 0) message.info('No commits found');
        } catch (e: any) {
            message.error(e?.message || 'Failed to load commits');
            setCommits([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && selectedBranches.length > 0 && selectedRepoId) loadCommits();
    }, [open, selectedBranches, dateRange, selectedRepoId]);

    const updateCommitIssueEntry = (sha: string, issue: any) => {
        setCommitToIssueMap(prev => ({ ...prev, [sha]: issue }));
    };

    return { commits, loading, commitToIssueMap, pagination, setPagination, loadCommits, updateCommitIssueEntry };
};
