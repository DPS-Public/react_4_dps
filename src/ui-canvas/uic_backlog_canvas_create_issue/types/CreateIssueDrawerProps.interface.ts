export interface CreateIssueDrawerProps {
    open: boolean
    onClose: any
    onIssueCreated?: (issueIds: string[]) => void
    location?: string
    data?: any
    selectedNodes?: Set<string>
    treeData?: any[],
    selectedDescriptions?: string[]
}
