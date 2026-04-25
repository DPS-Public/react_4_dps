import Commit from '../types/Commit.interface';

/**
 * Filters a commit list by a collaborator search term.
 * Matches against author login and author name (case-insensitive).
 *
 * Returns the original array unchanged if `collaborator` is null or empty.
 *
 * Pure function — no React, no Firebase, no API dependency.
 */
export const filterCommitsByCollaborator = (
    commits: Commit[],
    collaborator: string | null
): Commit[] => {
    if (!collaborator) return commits;

    const term = collaborator.toLowerCase();

    return commits.filter(commit => {
        const login = (commit.author?.login || '').toLowerCase();
        const name = (commit.commit?.author?.name || commit.author?.name || '').toLowerCase();
        return login.includes(term) || name.includes(term);
    });
};
