import { useState, useEffect } from 'react';
import { message } from 'antd';
import { fetchBranches } from '../services/fetchBranches';

/**
 * Manages the branch list state for the currently selected repository.
 * Auto-loads when the drawer is open, a repository is selected, and
 * the repositories array is non-empty.
 * Automatically selects `main` or `master` as the default branch.
 *
 * Hook layer — React state + useEffect only.
 * Delegates all API calls to fetchBranches (service layer).
 */
export const useBranches = (
    open: boolean,
    selectedRepoId: string | null,
    repositories: any[]
) => {
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    useEffect(() => {
        if (!open || !selectedRepoId || repositories.length === 0) return;

        const load = async () => {
            setLoadingBranches(true);
            try {
                const repo = repositories.find(
                    (r: any) => String(r.repoId || r.id || r.repo) === String(selectedRepoId)
                );

                if (!repo) {
                    message.error('Repository not found');
                    return;
                }

                const repoFullName = repo.full_name || repo.name;
                if (!repoFullName) {
                    message.error('Repository full name not found');
                    return;
                }

                const branchNames = await fetchBranches(repoFullName);
                setBranches(branchNames);

                // Auto-select main/master or first available branch
                if (branchNames.length > 0 && selectedBranches.length === 0) {
                    const main = branchNames.find(b => b === 'main' || b === 'master');
                    setSelectedBranches(main ? [main] : [branchNames[0]]);
                }
            } catch (error: any) {
                message.error(error?.message || 'Failed to load branches');
                setBranches([]);
            } finally {
                setLoadingBranches(false);
            }
        };

        load();
    }, [open, selectedRepoId, repositories]);

    return {
        branches,
        setBranches,
        selectedBranches,
        setSelectedBranches,
        loadingBranches,
    };
};
