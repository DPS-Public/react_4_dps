import { getGitHubAccessToken } from '@/config/firebase';
import { Dayjs } from 'dayjs';
import Commit from '../types/Commit.interface';

export interface FetchCommitsParams {
    repoFullName: string;
    branch: string;
    dateRange?: [Dayjs | null, Dayjs | null] | null;
    includeDetails?: boolean;
}

/**
 * Fetches up to 100 commits (with file info) for a single branch.
 * Applies optional date range filters (since/until).
 * Injects `branch` field into each returned commit object.
 *
 * Service layer — direct API communication only, no React state.
 */
export const fetchCommits = async ({
    repoFullName,
    branch,
    dateRange,
    includeDetails = true,
}: FetchCommitsParams): Promise<Commit[]> => {
    const githubToken = await getGitHubAccessToken();
    if (!githubToken) throw new Error('GitHub token not found');

    const query = new URLSearchParams({
        sha: branch,
        per_page: '100',
    });

    if (dateRange && dateRange[0] && dateRange[1]) {
        query.set('since', dateRange[0].startOf('day').toISOString());
        query.set('until', dateRange[1].endOf('day').toISOString());
    }

    const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/commits?${query.toString()}`,
        {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github+json',
            },
        }
    );

    if (!res.ok) {
        throw new Error('Failed to load commits');
    }

    const commits = await res.json();
    if (!Array.isArray(commits)) return [];

    const mappedCommits = commits.map((commit: Commit) => ({ ...commit, branch }));

    if (!includeDetails) {
        return mappedCommits;
    }

    const enriched: Commit[] = [];
    const chunkSize = 6;

    for (let i = 0; i < mappedCommits.length; i += chunkSize) {
        const chunk = mappedCommits.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(
            chunk.map(async (commit: Commit) => {
                try {
                    const detailRes = await fetch(
                        `https://api.github.com/repos/${repoFullName}/commits/${commit.sha}`,
                        {
                            headers: {
                                Authorization: `token ${githubToken}`,
                                Accept: 'application/vnd.github+json',
                            },
                        }
                    );

                    if (!detailRes.ok) {
                        return commit;
                    }

                    const detail = await detailRes.json();
                    return {
                        ...commit,
                        files: Array.isArray(detail?.files) ? detail.files : commit.files,
                        stats: detail?.stats || commit.stats,
                    };
                } catch {
                    return commit;
                }
            })
        );

        enriched.push(...chunkResults);
    }

    return enriched;
};


