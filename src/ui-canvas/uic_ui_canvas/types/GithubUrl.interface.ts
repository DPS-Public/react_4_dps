export interface GithubUrl {
  repoId: string;
  repoFullName: string;
  branch: string;
  defaultBranch?: string;
  sourceBranch?: string;
  filePath: string;
  fileName?: string;
  addedAt: string;
  parentId: string | null;
}
