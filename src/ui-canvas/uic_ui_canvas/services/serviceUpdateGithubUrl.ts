import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { GithubUrl } from "../types/GithubUrl.interface";
import { utilCreateGithubId } from "../utils/utilCreateGithubId";

interface ServiceUpdateGithubUrlParams {
  selectedUICanvasId: string;
  currentUserId: string;
  updatedGithubUrls: GithubUrl[];
  updatedUrl: GithubUrl;
}

export const serviceUpdateGithubUrl = async ({
  selectedUICanvasId,
  currentUserId,
  updatedGithubUrls,
  updatedUrl,
}: ServiceUpdateGithubUrlParams): Promise<void> => {
  const ref = doc(db, "ui_canvas_github_urls", selectedUICanvasId);

  await setDoc(
    ref,
    {
      id: selectedUICanvasId,
      githubUrls: updatedGithubUrls,
      updated_at: serverTimestamp(),
      created_by: currentUserId,
    },
    { merge: true }
  );

  const githubId = utilCreateGithubId(updatedUrl.repoId, updatedUrl.filePath);

  await setDoc(
    doc(db, "crd_relation_ui_canvas", githubId),
    {
      github_id: githubId,
      ui_canvas_id: selectedUICanvasId,
      repo_id: updatedUrl.repoId,
      repo_full_name: updatedUrl.repoFullName,
      branch: updatedUrl.branch,
      default_branch: updatedUrl.defaultBranch || updatedUrl.branch,
      source_branch: updatedUrl.sourceBranch || updatedUrl.branch,
      file_path: updatedUrl.filePath,
      file_name: updatedUrl.fileName,
      github_urls: [updatedUrl],
      updated_at: serverTimestamp(),
      created_by: currentUserId,
    },
    { merge: true }
  );
};
