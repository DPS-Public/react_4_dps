import { callApiWithToken } from '@/utils/callApi';

/**
 * Fetches branch names for a given repository full name.
 * Returns sorted branch name strings.
 *
 * Service layer — pure async, no React dependency.
 */
export const fetchBranches = async (repoFullName: string): Promise<string[]> => {
    const userId = localStorage.getItem('githubId');
    if (!userId) throw new Error('GitHub ID not found');

    const res = await callApiWithToken('/integration-github/repo-branch', {
        userId,
        repoFullName,
    });

    if (res.status !== 200) return [];

    let list: any[] = [];
    if (Array.isArray(res.branches))  list = res.branches;
    else if (Array.isArray(res.data)) list = res.data; 
    else if (Array.isArray(res))      list = res;

    const names = list
        .map((b: any) => (typeof b === 'string' ? b : b.name || b.branch || ''))
        .filter(Boolean);

    return [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
};


