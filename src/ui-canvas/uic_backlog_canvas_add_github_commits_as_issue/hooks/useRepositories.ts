import { useState, useEffect } from 'react';
import { message } from 'antd';
import { fetchRepositories } from '../services/fetchRepositories';

/**
 * Manages the repository list state for the commits drawer.
 * Auto-loads when the drawer opens and the project ID is available.
 * Guards against stale selectedRepoId when the repo list changes.
 *
 * Hook layer — React state + useEffect only.
 * Delegates all API calls to fetchRepositories (service layer).
 */
export const useRepositories = (
    open: boolean,
    projectId: string | undefined,
    currentRepoId: string | undefined
) => {
    const [repositories, setRepositories] = useState<any[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

    // Auto-load repositories when drawer opens
    useEffect(() => {
        if (!open || !projectId) return;

        const load = async () => {
            setLoadingRepos(true);
            try {
                const repos = await fetchRepositories(projectId);
                setRepositories(repos);

                if (repos.length === 0) {
                    setSelectedRepoId(null);
                    return;
                }

                const matchedRepo =
                    repos.find((r: any) =>
                        String(r.repoId || r.id || r.repo) === String(currentRepoId)
                    ) || repos[0];

                const nextRepoId = String(
                    matchedRepo?.repoId || matchedRepo?.id || matchedRepo?.repo || ''
                ).trim();

                setSelectedRepoId((prev) => {
                    if (prev && repos.some((r: any) => String(r.repoId || r.id || r.repo) === String(prev))) {
                        return prev;
                    }
                    return nextRepoId || null;
                });
            } catch (error: any) {
                message.error(error?.message || 'Failed to load repositories');
            } finally {
                setLoadingRepos(false);
            }
        };

        load();
    }, [open, projectId, currentRepoId]);

    // Guard: clear selection if selected repo is no longer in the new list
    useEffect(() => {
        if (repositories.length === 0) {
            setSelectedRepoId(null);
            return;
        }

        if (!selectedRepoId) {
            const fallbackRepo =
                repositories.find(
                    (r: any) => String(r.repoId || r.id || r.repo) === String(currentRepoId)
                ) || repositories[0];
            const fallbackId = String(
                fallbackRepo?.repoId || fallbackRepo?.id || fallbackRepo?.repo || ''
            ).trim();
            if (fallbackId) {
                setSelectedRepoId(fallbackId);
            }
            return;
        }

        const exists = repositories.some(
            (r: any) => String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );
        if (!exists) {
            const fallbackRepo =
                repositories.find(
                    (r: any) => String(r.repoId || r.id || r.repo) === String(currentRepoId)
                ) || repositories[0];
            const fallbackId = String(
                fallbackRepo?.repoId || fallbackRepo?.id || fallbackRepo?.repo || ''
            ).trim();
            setSelectedRepoId(fallbackId || null);
        }
    }, [repositories, selectedRepoId, currentRepoId]);

    return {
        repositories,
        loadingRepos,
        selectedRepoId,
        setSelectedRepoId,
    };
};
