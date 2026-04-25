import { getGitHubAccessToken } from '@/config/firebase';

/**
 * Fetches the unified diff (patch) for a specific file within a given commit SHA.
 * Returns an empty string if the API returns a non-200 status or no diff content.
 *
 * Service layer — direct API communication only, no React state.
 */
export const fetchCommitDiff = async (
    repoFullName: string,
    sha: string,
    filePath: string
): Promise<string> => {
    const githubToken = await getGitHubAccessToken();
    if (!githubToken) throw new Error('GitHub token not found');

    const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/commits/${sha}`,
        {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github+json',
            },
        }
    );

    if (!res.ok) return '';

    const data = await res.json();
    const files = Array.isArray(data?.files) ? data.files : [];
    const matchedFile = files.find((file: any) => file?.filename === filePath);
    return matchedFile?.patch || '';
};


