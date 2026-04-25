import { getGitHubAccessToken } from '@/config/firebase';
import { CommitFile } from '../types/Commit.interface';

/**
 * Fetches the full commit detail for a given SHA, returning its file list.
 * Used when a commit was loaded without file info (includeFiles was false
 * or files were truncated).
 *
 * Service layer — direct API communication only, no React state.
 */
export const fetchCommitDetail = async (
    repoFullName: string,
    sha: string,
    currentUserUid: string
): Promise<CommitFile[]> => {
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

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.files) ? data.files : [];
};


