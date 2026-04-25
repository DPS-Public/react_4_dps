export default interface SelectedFile {
    filename: string;
    patch: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
}
