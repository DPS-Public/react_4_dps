export default interface GetGithubCommitsForIssueDrawerProps {
    open:           boolean;
    onClose:        () => void;
    currentProject: any;
    onIssuesUpdate: () => void;
    currentTaskId:  string;
    currentTaskIds: string[];
}
