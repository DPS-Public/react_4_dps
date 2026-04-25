import { db } from "@/config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Update API Canvas share status
 * @param canvasId - API Canvas document ID
 * @param isShared - Whether canvas should be shared (true = public, false = private)
 * @param shareToken - Existing share token (generated if missing)
 * @param forceRegenerate - Force regeneration of share token
 */
export const serviceUpdateAPICanvasShare = async (
  canvasId: string,
  isShared: boolean,
  shareToken?: string,
  forceRegenerate: boolean = false,
) => {
  try {
    const docRef = doc(db, "api_canvas", canvasId);
    const canvasSnap = await getDoc(docRef);
    const canvasData = canvasSnap.data() || {};
    const existingShareToken = canvasData?.shareToken;

    let nextShareToken = shareToken || existingShareToken || "";
    if (forceRegenerate || !nextShareToken) {
      nextShareToken = generateShareToken();
    }

    await updateDoc(docRef, {
      isShared: isShared,
      shareToken: nextShareToken,
      sharedAt: isShared ? new Date().toISOString() : null,
    });

    return { success: true, shareToken: nextShareToken };
  } catch (error) {
    console.error("❌ Error updating API canvas share status:", error);
    throw error;
  }
};

function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}
