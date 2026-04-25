import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { GithubUrl } from "../types/GithubUrl.interface";
import { utilFindGithubUrlIndex } from "../utils/utilFindGithubUrlIndex";
import { utilCreateGithubId } from "../utils/utilCreateGithubId";

interface ServiceDeleteGithubUrlParams {
  selectedUICanvasId: string;
  githubUrl: GithubUrl;
}

export const serviceDeleteGithubUrl = async ({
  selectedUICanvasId,
  githubUrl,
}: ServiceDeleteGithubUrlParams) => {
  const uiCanvasGithubUrlsRef = doc(db, "ui_canvas_github_urls", selectedUICanvasId);
  const currentDoc = await getDoc(uiCanvasGithubUrlsRef);

  if (!currentDoc.exists()) {
    throw new Error("Document not found");
  }

  const currentGithubUrls = currentDoc.data().githubUrls || [];
  const urlIndex = utilFindGithubUrlIndex(currentGithubUrls, githubUrl);

  if (urlIndex === -1) {
    throw new Error("GitHub URL not found");
  }

  const updatedGithubUrls = [...currentGithubUrls];
  const removedUrl = updatedGithubUrls.splice(urlIndex, 1)[0];

  await updateDoc(uiCanvasGithubUrlsRef, {
    githubUrls: updatedGithubUrls,
    updated_at: serverTimestamp(),
  });

  const githubId = utilCreateGithubId(githubUrl.repoId, githubUrl.filePath);
  const relationRef = doc(db, "crd_relation_ui_canvas", githubId);

  try {
    const relationDoc = await getDoc(relationRef);
    if (relationDoc.exists() && relationDoc.data().ui_canvas_id === selectedUICanvasId) {
      await deleteDoc(relationRef);
    }
  } catch (error) {
    console.warn("CRD relation cleanup warning:", error);
  }

  return { currentGithubUrls, updatedGithubUrls, removedUrl };
};
