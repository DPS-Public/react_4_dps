import { getGitHubAccessToken } from '@/config/firebase';

/**
 * Fetches all branch names for the given repository full name.
 * Returns an alphabetically sorted array of strings.
 *
 * Service layer — direct API communication only, no React state.
 */
export const fetchBranches = async (repoFullName: string): Promise<string[]> => {
    const githubToken = await getGitHubAccessToken();
    if (!githubToken) throw new Error('GitHub token not found');

    const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/branches?per_page=100`,
        {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github+json',
            },
        }
    );

    if (!res.ok) {
        throw new Error('Failed to load branches');
    }

    const data = await res.json();
    const branchList: any[] = Array.isArray(data) ? data : [];

    const branchNames: string[] = branchList
        .map((b: any) => (typeof b === 'string' ? b : b.name || b.branch || b))
        .filter(Boolean);

    return [...branchNames].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
};


