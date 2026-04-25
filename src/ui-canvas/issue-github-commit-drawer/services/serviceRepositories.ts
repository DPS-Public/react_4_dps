import { getGitHubAccessToken } from '@/config/firebase';
import { getProjectGithubRepositories } from '@/services/frontendData';

type ConfiguredRepo = {
    id?: string;
    repo_id?: string;
    owner?: string;
    repo?: string;
    full_name?: string;
    name?: string;
    default_branch?: string;
};

const normalizeConfiguredRepo = (configuredRepo: ConfiguredRepo) => {
    let owner = configuredRepo.owner?.trim();
    let repo = configuredRepo.repo?.trim();

    if ((!owner || !repo) && configuredRepo.full_name?.includes('/')) {
        const [fullOwner, fullRepo] = configuredRepo.full_name.split('/');
        owner = owner || fullOwner?.trim();
        repo = repo || fullRepo?.trim();
    }

    if ((!owner || !repo) && configuredRepo.name?.includes('/')) {
        const [nameOwner, nameRepo] = configuredRepo.name.split('/');
        owner = owner || nameOwner?.trim();
        repo = repo || nameRepo?.trim();
    }

    if (!owner || !repo) {
        return null;
    }

    const fullName = `${owner}/${repo}`;
    const repoId = String(configuredRepo.repo_id || configuredRepo.id || fullName).trim();

    return {
        ...configuredRepo,
        owner,
        repo,
        id: repoId,
        repoId,
        name: repo,
        full_name: fullName,
        default_branch: configuredRepo.default_branch || 'main',
    };
};

const enrichRepoWithGitHub = async (repo: ReturnType<typeof normalizeConfiguredRepo>, githubToken: string | null) => {
    if (!repo || !githubToken) {
        return repo;
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github+json',
            },
        });

        if (!response.ok) {
            return repo;
        }

        const githubRepo = await response.json();
        return {
            ...repo,
            ...githubRepo,
            id: githubRepo.id || repo.id,
            repoId: String(githubRepo.id || repo.repoId || repo.id || repo.full_name).trim(),
            name: githubRepo.name || repo.name,
            full_name: githubRepo.full_name || repo.full_name,
            default_branch: githubRepo.default_branch || repo.default_branch || 'main',
        };
    } catch {
        return repo;
    }
};

/**
 * Fetches configured repositories for a project from Firestore client SDK.
 * Deduplicates by repoId and returns them sorted alphabetically by name.
 */
export const fetchRepositories = async (projectId: string): Promise<any[]> => {
    const configuredRepos = (await getProjectGithubRepositories(projectId)) as ConfiguredRepo[];
    const githubToken = await getGitHubAccessToken();

    const repos = await Promise.all(
        configuredRepos
            .map(normalizeConfiguredRepo)
            .filter(Boolean)
            .map((repo) => enrichRepoWithGitHub(repo, githubToken))
    );

    const uniqueMap = new Map<string, any>();

    repos.filter(Boolean).forEach((repo: any) => {
        const repoId = String(repo.repoId || repo.id || repo.full_name || repo.repo || '').trim();
        if (!repoId || uniqueMap.has(repoId)) {
            return;
        }

        uniqueMap.set(repoId, {
            ...repo,
            id: repo.id || repoId,
            repoId,
            name: repo.name || repo.repo || repo.full_name,
            full_name: repo.full_name || `${repo.owner}/${repo.repo}`,
            default_branch: repo.default_branch || 'main',
        });
    });

    return Array.from(uniqueMap.values()).sort((left, right) => {
        const leftName = (left.full_name || left.name || left.repoId || '').toLowerCase();
        const rightName = (right.full_name || right.name || right.repoId || '').toLowerCase();
        return leftName.localeCompare(rightName);
    });
};
