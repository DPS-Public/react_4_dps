import { message } from 'antd';
import Commit from '../types/Commit.interface';
import { fetchCommitDetail } from '../services/fetchCommitDetail';
import { resolveUserByGitHubId } from '../services/resolveUserByGitHubId';
import { createBacklogIssue } from '../services/serviceCreateBacklogIssue';
import { formatCommitDate } from '../utils/utilFormatCommitDate';

export interface HandleAddCommitToBacklogDeps {
    currentProject: { id: string } | null;
    currentUser: any;
    canvasses: any[];
    projectUsers: any[];
    selectedRepoId: string | null;
    repositories: any[];
    selectedBranches: string[];
    commitUICanvasMap: Record<string, string>;
    commitAssigneeMap: Record<string, string>;
    setAddingCommits: React.Dispatch<React.SetStateAction<Set<string>>>;
    setCommitUICanvasMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setCommitAssigneeMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onIssuesUpdate?: () => void;
}

/**
 * Handles the onClick event on the "Add" button in the Action column.
 * Orchestrates the full flow:
 *   1. Resolve assignee (manual → GitHub ID → creator fallback)
 *   2. Load missing commit file details if needed
 *   3. Resolve CRD components for each changed file
 *   4. Build and persist the backlog issue
 *   5. Sync local commitToIssueMap
 *
 * Handler layer — coordinates all service calls and UI state updates.
 * Chain: onClick (Add) → handleAddCommitToBacklog → resolveXXX / createBacklogIssue (services)
 */
export const handleAddCommitToBacklog = async (
    commit: Commit,
    uiCanvasId: string | undefined,
    assigneeId: string | undefined,
    assigneeUser: any | undefined,
    deps: HandleAddCommitToBacklogDeps
): Promise<void> => {
    const {
        currentProject,
        currentUser,
        canvasses,
        projectUsers,
        selectedRepoId,
        repositories,
        selectedBranches,
        commitUICanvasMap,
        commitAssigneeMap,
        setAddingCommits,
        setCommitUICanvasMap,
        setCommitAssigneeMap,
        onIssuesUpdate,
    } = deps;

    if (!currentProject?.id || !currentUser) {
        message.error('Missing project or user information');
        return;
    }

    const normalizeGitHubUrl = (url?: string | null): string | null => {
        if (!url || typeof url !== 'string') return null;
        if (url.includes('api.github.com/repos/')) {
            return url
                .replace('https://api.github.com/repos/', 'https://github.com/')
                .replace('/commits/', '/commit/');
        }
        return url;
    };

    const selectedUICanvas = uiCanvasId || commitUICanvasMap[commit.sha];
    if (!selectedUICanvas) {
        message.warning('Please select a UI Canvas for this commit');
        return;
    }

    // ── Step 1: Resolve assignee ─────────────────────────────────────────
    let finalAssignee: any = null;
    let finalAssigneeId: string | null = null;

    if (assigneeId || commitAssigneeMap[commit.sha]) {
        finalAssigneeId = assigneeId || commitAssigneeMap[commit.sha];
        finalAssignee = assigneeUser || projectUsers.find((u: any) => u.uid === finalAssigneeId);
    } else {
        const commitAuthorLogin = commit.author?.login || null;
        const commitAuthorId = commit.author?.id || null;

        finalAssignee = await resolveUserByGitHubId(
            commitAuthorId,
            commitAuthorLogin,
            projectUsers
        );

        if (finalAssignee) {
            finalAssigneeId = finalAssignee.uid;
            message.info(
                `Assignee automatically set to ${finalAssignee.displayName || finalAssignee.email}`
            );
        } else {
            // Fallback: use current user as creator-assignee
            finalAssignee = {
                uid: currentUser.uid,
                displayName: currentUser.displayName || currentUser.email,
                email: currentUser.email,
                photoURL: currentUser.photoURL,
            };
            finalAssigneeId = currentUser.uid;
            const authorName =
                commitAuthorLogin ||
                commit.commit?.author?.name ||
                commit.author?.name ||
                'Unknown';
            message.warning(
                `GitHub user "${authorName}" not found in DPS. Assignee set to creator (${finalAssignee.displayName})`
            );
        }
    }

    if (!finalAssignee || !finalAssigneeId) {
        message.error('Assignee not found');
        return;
    }

    setAddingCommits(prev => new Set(prev).add(commit.sha));

    try {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const nowFormatted =
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
            `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const commitMessage =
            commit.commit?.message || commit.message || `Commit: ${commit.sha.substring(0, 7)}`;
        const commitAuthor =
            commit.commit?.author?.name || commit.author?.name || commit.author?.login || 'Unknown';
        const commitDate =
            commit.commit?.author?.date || commit.author?.date || commit.date || nowFormatted;
        const selectedCanvas = canvasses.find(c => c.id === selectedUICanvas);

        const repo = repositories.find(
            (r: any) => String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );

        // ── Step 2: Ensure commit has file data ───────────────────────────
        let commitWithFiles = commit;
        if ((!commit.files || commit.files.length === 0) && repo?.full_name) {
            const files = await fetchCommitDetail(repo.full_name, commit.sha, currentUser.uid);
            if (files.length > 0) commitWithFiles = { ...commit, files };
        }

        // CRD relation lookup intentionally removed from Add to Backlog flow.

        // ── Step 4: Calculate total added lines ───────────────────────────
        let totalCodeLines = 0;
        (commitWithFiles.files || []).forEach((f: any) => {
            totalCodeLines += Number(f.additions) || 0;
        });

        const commitDateFormatted = formatCommitDate(commitDate, nowFormatted);

        // ── Step 5: Persist backlog issue ─────────────────────────────────
        await createBacklogIssue(currentProject.id, {
            title: commitMessage,
            description: commitMessage,
            assignee: finalAssignee.uid,
            assigneeName: finalAssignee.displayName || finalAssignee.email,
            assigneePhotoUrl: finalAssignee.photoURL || null,
            createdBy: currentUser.displayName || currentUser.email,
            uiCanvas: selectedCanvas?.label || '',
            uiCanvasId: selectedUICanvas,
            type: 'New Request',
            comment: '',
            imageUrl: null,
            createdAt: nowFormatted,
            closedDate: commitDateFormatted,
            status: 'closed',
            sh: 0,
            eh: 0,
            codeLine: totalCodeLines,
            insertedLine: totalCodeLines,
            commitId: commit.sha,
            commitSha: commit.sha,
            commitMessage,
            commitAuthor,
            commitDate,
            commitUrl: normalizeGitHubUrl(commit.html_url || commit.url || null),
            repositoryName: repo?.full_name || '',
            branchName: commit.branch || selectedBranches[0] || 'main',
            githubData: commit,
        });

        message.success(`Commit ${commit.sha.substring(0, 7)} added to backlog`);

        // Clean up per-row state
        setCommitAssigneeMap(prev => { const m = { ...prev }; delete m[commit.sha]; return m; });
        setCommitUICanvasMap(prev => { const m = { ...prev }; delete m[commit.sha]; return m; });

        if (onIssuesUpdate) onIssuesUpdate();
    } catch (error: any) {
        console.error('Error adding commit to backlog:', error);
        message.error('Failed to add commit to backlog');
    } finally {
        setAddingCommits(prev => {
            const s = new Set(prev);
            s.delete(commit.sha);
            return s;
        });
    }
};
