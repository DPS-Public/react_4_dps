import { useState, useEffect } from 'react';
import { message } from 'antd';
import { fetchBranches } from '../services/serviceBranches';

/**
 * Loads branches when a repository is selected.
 * Auto-selects main/master or the first branch.
 */
export const useBranches = (
    open: boolean,
    selectedRepoId: string | null,
    repositories: any[]
) => {
    const [branches,         setBranches]         = useState<string[]>([]);
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [loadingBranches,  setLoadingBranches]  = useState(false);

    useEffect(() => {
        if (!open || !selectedRepoId || repositories.length === 0) return;

        const repo = repositories.find((r: any) =>
            String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );

        if (!repo?.full_name) {
            message.error('Repository full name not found');
            return;
        }

        const load = async () => {
            setLoadingBranches(true);
            try {
                const names = await fetchBranches(repo.full_name);
                setBranches(names);
                if (names.length > 0 && selectedBranches.length === 0) {
                    const main = names.find((b: string) => b === 'main' || b === 'master');
                    setSelectedBranches(main ? [main] : [names[0]]);
                }
            } catch {
                message.error('Failed to load branches');
                setBranches([]);
            } finally {
                setLoadingBranches(false);
            }
        };

        load();
    }, [open, selectedRepoId, repositories]);

    return { branches, setBranches, selectedBranches, setSelectedBranches, loadingBranches };
};
