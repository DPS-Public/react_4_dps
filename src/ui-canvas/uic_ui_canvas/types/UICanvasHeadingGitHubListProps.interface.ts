import { GithubUrl } from "./GithubUrl.interface";

export default interface UICanvasHeadingGitHubListProps {
  selectedUICanvasId: string | null;
  githubUrls: GithubUrl[];
  onDeleteGithubUrl: (githubUrl: GithubUrl) => void;
  onOpenAddDrawer: () => void;
  onOpenViewDrawer: (githubUrl: GithubUrl) => void;
}
