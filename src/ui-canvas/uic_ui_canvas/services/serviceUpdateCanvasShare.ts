import { db } from "@/config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Update UI Canvas share status
 * @param canvasId - UI Canvas ID
 * @param isShared - Whether canvas should be shared (true = public, false = private)
 * @param shareToken - Unique token for share link (generated if isShared=true)
 */
export const serviceUpdateCanvasShare = async (
  canvasId: string,
  isShared: boolean,
  shareToken?: string,
  forceRegenerate: boolean = false,
) => {
  try {
    const docRef = doc(db, "ui_canvas", canvasId);
    const canvasSnap = await getDoc(docRef);
    const canvasData = canvasSnap.data() || {};
    const existingShareToken = canvasData?.shareToken;

    let nextShareToken = shareToken || existingShareToken || "";
    if (forceRegenerate || !nextShareToken) {
      nextShareToken = generateShareToken();
    }

    let sharedExternalLinks: Array<Record<string, unknown>> = [];
    let sharedDefaultLinkId: string | null = null;

    if (isShared) {
      const projectId = canvasData?.projectId;

      if (projectId) {
        const externalLinksRef = doc(db, "external_links", projectId);
        const externalLinksSnap = await getDoc(externalLinksRef);
        const linksByCanvasId = externalLinksSnap.data()?.links?.[canvasId] || {};

        sharedExternalLinks = Object.entries(linksByCanvasId)
          .map(([dynamicId, item]: [string, any]) => ({
            id: item?.id || dynamicId,
            title: item?.title || "",
            type: item?.type || "embedded",
            url: item?.url || item?.image || "",
            image: item?.image || "",
            code: item?.code || "",
            defaultView: Boolean(item?.defaultView),
            order: Number(item?.order || 0),
            lastUpdated: item?.lastUpdated || "",
          }))
          .sort((a: any, b: any) => {
            if (a.defaultView && !b.defaultView) return -1;
            if (!a.defaultView && b.defaultView) return 1;
            return (a.order || 0) - (b.order || 0);
          });

        sharedDefaultLinkId =
          ((sharedExternalLinks.find((item: any) => item?.defaultView)?.id as string | undefined) ||
            (sharedExternalLinks[0]?.id as string | undefined) ||
            null);
      }
    }
    
    await updateDoc(docRef, {
      isShared: isShared,
      shareToken: nextShareToken,
      sharedAt: isShared ? new Date().toISOString() : null,
      sharedExternalLinks: isShared ? sharedExternalLinks : [],
      sharedDefaultLinkId: isShared ? sharedDefaultLinkId : null,
    });

    return { success: true, shareToken: nextShareToken };
  } catch (error) {
    console.error("❌ Error updating canvas share status:", error);
    throw error;
  }
};

/**
 * Generate unique share token
 */
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
