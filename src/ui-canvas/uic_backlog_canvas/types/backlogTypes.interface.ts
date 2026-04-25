

export interface TableProps {
    data?: any[];
    disableDrawers?: boolean;
}

export interface CrdDrawerState {
    open: boolean;
    nodeId: string | null;
    repoId: string | null;
}

export interface ExternalSourceCodeDrawerState {
    open: boolean;
    content: string | null;
    node: any | null;
}

export interface AddCrdComponentDrawerState {
    open: boolean;
    selectedRepoId: string | null;
    selectedComponent: any | null;
    expandedNodes: Set<string>;
    treeData: any[];
    loading: boolean;
}

export interface CommitHistoryState {
    commits: any[];
    loading: boolean;
    activeTab: string;
    selectedCommit: any | null;
}

export interface CodeLineCommitHistoryState {
    open: boolean;
    issue: any | null;
}
