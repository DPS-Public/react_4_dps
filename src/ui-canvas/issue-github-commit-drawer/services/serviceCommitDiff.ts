import { callApiWithToken } from '@/utils/callApi';

/**
 * Fetches the unified diff/patch string for a single file in a commit.
 * Returns empty string when the diff is unavailable.
 *
 * Service layer — pure async, no React dependency.
 */
export const fetchCommitDiff = async (
    repoFullName: string,
    sha: string,
    filePath: string
): Promise<string> => {
    const userId = localStorage.getItem('githubId');
    if (!userId) throw new Error('GitHub ID not found');

    const res = await callApiWithToken('/integration-github/commit-diff', {
        userId,
        repoFullName,
        sha,
        path: filePath,
    });

    if (res.status !== 200) return '';
    return res.diff || res.patch || res.content || res.data || '';
};


