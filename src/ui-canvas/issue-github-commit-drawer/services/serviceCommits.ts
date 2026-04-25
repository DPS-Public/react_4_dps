import { callApiWithToken } from '@/utils/callApi';
import Commit from '../types/commitTypes.interface.ts';

export interface FetchCommitsParams {
    repoFullName: string;
    branch:       string;
    since?:       string;
    until?:       string;
    perPage?:     number;
}

/**
 * Fetches up to `perPage` commits for a single branch.
 * Injects the `branch` field into each returned commit object.
 *
 * Service layer — pure async, no React dependency.
 */
export const fetchCommits = async (params: FetchCommitsParams): Promise<Commit[]> => {
    const userId = localStorage.getItem('githubId');
    if (!userId) throw new Error('GitHub ID not found');

    const payload: any = {
        userId,
        repoFullName: params.repoFullName,
        branch:       params.branch,
        perPage:      params.perPage ?? 100,
        includeFiles: true,
    };

    if (params.since) payload.since = params.since;
    if (params.until) payload.until = params.until;

    const res = await callApiWithToken('/integration-github/repo-commits', payload);

    if (res.status !== 200 || !res.commits) return [];

    return (res.commits as Commit[]).map(c => ({ ...c, branch: params.branch }));
};


