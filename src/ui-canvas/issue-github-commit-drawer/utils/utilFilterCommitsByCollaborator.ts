import Commit from "@/ui-canvas/issue-github-commit-drawer/types/commitTypes.interface";

/**
 * Filters a commit list by collaborator name/login.
 * Case-insensitive match against author.login and commit.author.name.
 * Returns the full list when collaborator is null/empty.
 */
export const utilFilterCommitsByCollaborator = (
    commits: Commit[],
    collaborator: string | null
): Commit[] => {
    if (!collaborator) return commits;
    const lower = collaborator.toLowerCase();
    return commits.filter(c => {
        const login = (c.author?.login || '').toLowerCase();
        const name  = (c.commit?.author?.name || c.author?.name || '').toLowerCase();
        return login.includes(lower) || name.includes(lower);
    });
};
