export default interface GithubCommitsDrawerProps {
    open: boolean;
    onClose: () => void;
    currentProject: { id: string } | null;
    onIssuesUpdate?: () => void;
    hideAddToBacklogButton?: boolean;
    hideUICanvasAndAssignee?: boolean;
    linkToTaskIds?: string[];
    closeOnCommitLinked?: boolean;
    onCommitLinked?: (commit: any) => void;
}
