export interface CommitFile {
    filename?: string;
    path?: string;
    status?: string;
    additions?: number;
    deletions?: number;
    changes?: number;
    patch?: string;
    content?: string;
}

export default interface Commit {
    sha: string;
    branch?: string;
    html_url?: string;
    url?: string;
    message?: string;
    date?: string;
    commit?: {
        message?: string;
        author?: {
            name?: string;
            date?: string;
            id?: string;
        };
    };
    author?: {
        id?: string;
        name?: string;
        login?: string;
        date?: string;
        avatar_url?: string;
    };
    stats?: {
        total?: number;
        additions?: number;
        deletions?: number;
    };
    files?: CommitFile[];
}
