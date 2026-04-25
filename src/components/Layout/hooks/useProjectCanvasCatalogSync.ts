import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  clearProjectCanvasCatalog,
  setCanvasses,
  setProjectCanvasCatalog,
  setProjectCanvasCatalogLoading,
  useAppDispatch,
} from "@/store";
import { normalizeDigitalServiceJson } from "@/utils/ui-canvas/normalizeDigitalServiceJson";
import { normalizeApiJson } from "@/utils/project/normalizeApiJson";

export function useProjectCanvasCatalogSync(projectId?: string | null) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!projectId) {
      dispatch(clearProjectCanvasCatalog());
      dispatch(setCanvasses([]));
      return;
    }

    dispatch(clearProjectCanvasCatalog());
    dispatch(setCanvasses([]));
    dispatch(setProjectCanvasCatalogLoading(true));

    const unsubscribe = onSnapshot(
      doc(db, "projects", projectId),
      (snapshot) => {
        if (!snapshot.exists()) {
          dispatch(clearProjectCanvasCatalog());
          dispatch(setCanvasses([]));
          return;
        }

        const apiJsonRaw = snapshot.get("api_json");
        const digitalServiceJsonRaw = snapshot.get("digital_service_json");
        const apiCanvases = normalizeApiJson(apiJsonRaw).sort((left, right) =>
          left.name.localeCompare(right.name),
        );
        const uiCanvases = normalizeDigitalServiceJson(digitalServiceJsonRaw).sort((left, right) =>
          left.label.localeCompare(right.label),
        );

        dispatch(
          setProjectCanvasCatalog({
            projectId,
            apiJsonRaw,
            digitalServiceJsonRaw,
            apiCanvases,
            uiCanvases,
          }),
        );
        dispatch(setCanvasses(uiCanvases));
      },
      (error) => {
        console.error("Error listening to project canvas catalog:", error);
        dispatch(clearProjectCanvasCatalog());
        dispatch(setCanvasses([]));
      },
    );

    return () => unsubscribe();
  }, [dispatch, projectId]);
}

export default useProjectCanvasCatalogSync;
