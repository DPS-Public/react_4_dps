import { utilSanitizeFirestoreId } from "./utilSanitizeFirestoreId";

export const utilCreateGithubId = (repoId: string, filePath: string): string => {
  return `${repoId}_${utilSanitizeFirestoreId(filePath)}`;
};
