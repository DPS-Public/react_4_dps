export interface CommitFile {
    filename?: string;
    path?: string;
    patch?: string;
    content?: string;
    status?: string;
    additions?: number;
    deletions?: number;
    changes?: number;
}

export default interface Commit {
    sha: string;
    branch?: string;
    html_url?: string;
    url?: string;
    date?: string;
    message?: string;
    commit?: {
        message?: string;
        author?: {
            name?: string;
            date?: string;
        };
    };
    author?: {
        login?: string;
        name?: string;
        date?: string;
        avatar_url?: string;
        id?: string | number;
    };
    files?: CommitFile[];
    stats?: {
        additions?: number;
        deletions?: number;
        total?: number;
    };
}
