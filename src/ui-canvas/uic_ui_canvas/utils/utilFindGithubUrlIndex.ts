import { GithubUrl } from "../types/GithubUrl.interface";

export const utilFindGithubUrlIndex = (githubUrls: GithubUrl[], urlToFind: GithubUrl): number => {
  return githubUrls.findIndex((url) => {
    return (
      url.repoId === urlToFind.repoId &&
      url.filePath === urlToFind.filePath &&
      url.addedAt === urlToFind.addedAt
    );
  });
};
