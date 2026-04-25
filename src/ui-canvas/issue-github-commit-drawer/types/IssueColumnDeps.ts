import React from 'react';
import Commit from './commitTypes.interface';

/**
 * Dependency injection interface for GetGithubCommitsForIssueDrawer columns.
 *
 * Differs from ColumnDeps (GithubCommitsDrawer) in that:
 * - No assignee/uiCanvas state (not needed here)
 * - Adds currentTaskIds + onLinkCommitToTasks for the Action column
 * - SHA column opens CodeLineCommitHistoryDrawer, not CommitCodeModal
 */
export interface IssueColumnDeps {
    // State values
    addingCommits: Set<string>;
    currentTaskIds: string[];

    // Modal state setters
    setSelectedCommitForAllFiles: (commit: Commit) => void;
    setAllFilesModalVisible: (v: boolean) => void;
    setSelectedCommitForCode: (commit: Commit) => void;

    // CodeLineHistory drawer
    setCodeLineCommitHistoryOpen: (v: boolean) => void;
    setCodeLineCommitHistoryIssue: (issue: any) => void;

    // Handlers
    onLoadFileCode: (commit: Commit, file: any) => void;
    onLinkCommitToTasks: (commit: Commit) => void;
}
