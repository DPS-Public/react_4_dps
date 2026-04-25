import { useMemo } from 'react';
import Commit from '../types/commitTypes.interface';
import { utilFilterCommitsByCollaborator } from '@/ui-canvas/issue-github-commit-drawer/utils/utilFilterCommitsByCollaborator';
 
/**
 * Returns a memoized filtered commit list based on the selected collaborator.
 */
export const useFilteredCommits = (
    commits: Commit[],
    selectedCollaborator: string | null
): Commit[] =>
    useMemo(
        () => utilFilterCommitsByCollaborator(commits, selectedCollaborator),
        [commits, selectedCollaborator]
    );
