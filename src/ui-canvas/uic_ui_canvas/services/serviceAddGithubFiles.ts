import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { AddGithubFilePayload } from "../types/AddGithubFilePayload.interface.ts";
import { GithubUrl } from "../types/GithubUrl.interface";
import { utilCreateGithubId } from "../utils/utilCreateGithubId";

interface ServiceAddGithubFilesParams {
  selectedUICanvasId: string;
  currentUserId: string;
  parentId: string | null;
  files: AddGithubFilePayload[];
}

export const serviceAddGithubFiles = async ({
  selectedUICanvasId,
  currentUserId,
  parentId,
  files,
}: ServiceAddGithubFilesParams) => {
  const newGithubUrls: GithubUrl[] = files.map((file) => ({
    repoId: file.repoId,
    repoFullName: file.repoFullName,
    branch: file.branch,
    defaultBranch: file.defaultBranch || file.branch,
    sourceBranch: file.sourceBranch || file.branch,
    filePath: file.filePath,
    fileName: file.fileName || file.filePath.split("/").pop(),
    addedAt: new Date().toISOString(),
    parentId: parentId || null,
  }));

  const ref = doc(db, "ui_canvas_github_urls", selectedUICanvasId);
  const docSnap = await getDoc(ref);

  const existingGithubUrls: GithubUrl[] = docSnap.exists() ? docSnap.data().githubUrls || [] : [];
  const uniqueNewUrls = newGithubUrls.filter((newUrl) => {
    return !existingGithubUrls.some((existingUrl) => {
      return existingUrl.repoId === newUrl.repoId && existingUrl.filePath === newUrl.filePath;
    });
  });

  const allGithubUrls = [...existingGithubUrls, ...uniqueNewUrls];

  await setDoc(
    ref,
    {
      id: selectedUICanvasId,
      githubUrls: allGithubUrls,
      updated_at: serverTimestamp(),
      created_by: currentUserId,
    },
    { merge: true }
  );

  for (const url of uniqueNewUrls) {
    const githubId = utilCreateGithubId(url.repoId, url.filePath);
    const relationRef = doc(db, "crd_relation_ui_canvas", githubId);

    await setDoc(
      relationRef,
      {
        github_id: githubId,
        ui_canvas_id: selectedUICanvasId,
        repo_id: url.repoId,
        repo_full_name: url.repoFullName,
        branch: url.branch,
        default_branch: url.defaultBranch || url.branch,
        source_branch: url.sourceBranch || url.branch,
        file_path: url.filePath,
        file_name: url.fileName,
        github_urls: [url],
        created_at: url.addedAt,
        updated_at: serverTimestamp(),
        created_by: currentUserId,
      },
      { merge: true }
    );
  }

  return { existingGithubUrls, uniqueNewUrls, allGithubUrls };
};
