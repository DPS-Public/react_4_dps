import { useMemo } from 'react';
import Commit from '../types/Commit.interface';
import { filterCommitsByCollaborator } from '../utils/utilFilterCommitsByCollaborator';

/**
 * Returns a memoized subset of commits filtered by the selected collaborator.
 * Re-computes only when `commits` or `selectedCollaborator` changes.
 *
 * Hook layer — useMemo wrapper around the pure filterCommitsByCollaborator util.
 */
export const useFilteredCommits = (
    commits: Commit[],
    selectedCollaborator: string | null
): Commit[] =>
    useMemo(
        () => filterCommitsByCollaborator(commits, selectedCollaborator),
        [commits, selectedCollaborator]
    );
