import { useState, useEffect } from 'react';
import { message } from 'antd';
import { fetchRepositories } from '../services/serviceRepositories';

/**
 * Loads repositories when the drawer opens.
 * Auto-selects currentRepo or the first repo in the list.
 */
export const useRepositories = (
    open: boolean,
    projectId: string | undefined,
    currentRepo: any
) => {
    const [repositories,  setRepositories]  = useState<any[]>([]);
    const [loadingRepos,  setLoadingRepos]  = useState(false);
    const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

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

                const match = repos.find((r: any) =>
                    String(r.repoId || r.id || r.repo) === String(currentRepo)
                ) || repos[0];
                const id = String(match.repoId || match.id || match.repo || '').trim();
                setSelectedRepoId((prev) => {
                    if (prev && repos.some((r: any) => String(r.repoId || r.id || r.repo) === String(prev))) {
                        return prev;
                    }
                    return id || null;
                });
            } catch {
                message.error('Failed to load repositories');
            } finally {
                setLoadingRepos(false);
            }
        };

        load();
    }, [open, projectId, currentRepo]);

    // Guard against stale selectedRepoId when repo list changes
    useEffect(() => {
        if (repositories.length === 0) {
            setSelectedRepoId(null);
            return;
        }

        if (!selectedRepoId) {
            const fallbackRepo = repositories.find((r: any) =>
                String(r.repoId || r.id || r.repo) === String(currentRepo)
            ) || repositories[0];
            const fallbackId = String(fallbackRepo.repoId || fallbackRepo.id || fallbackRepo.repo || '').trim();
            if (fallbackId) {
                setSelectedRepoId(fallbackId);
            }
            return;
        }

        const exists = repositories.some((r: any) =>
            String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );
        if (!exists) {
            const fallbackRepo = repositories.find((r: any) =>
                String(r.repoId || r.id || r.repo) === String(currentRepo)
            ) || repositories[0];
            const fallbackId = String(fallbackRepo.repoId || fallbackRepo.id || fallbackRepo.repo || '').trim();
            setSelectedRepoId(fallbackId || null);
        }
    }, [repositories, selectedRepoId, currentRepo]);

    return { repositories, loadingRepos, selectedRepoId, setSelectedRepoId };
};
