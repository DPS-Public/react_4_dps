export interface AddGithubFilePayload {
  repoId: string;
  repoFullName: string;
  branch: string;
  defaultBranch?: string;
  sourceBranch?: string;
  filePath: string;
  fileName?: string;
}
