import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import type { ISelectedUI } from "@/ui-canvas/uic_ui_canvas/types/ISelectedUI.interface";
import type { UIList } from "@/ui-canvas/uic_ui_canvas/types/UIList.interface";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

export function useUICanvasRealtimeSync(
  currentProject: { id?: string } | null | undefined,
  getUI: (setLoading: Dispatch<SetStateAction<boolean>>) => void,
  setLoading: Dispatch<SetStateAction<boolean>>,
  setSelectedUI: Dispatch<SetStateAction<ISelectedUI | undefined>>,
  selectedUICanvasId: string,
  setSelectedUICanvasId: Dispatch<SetStateAction<string>>,
  setAllUIInputs: Dispatch<SetStateAction<Record<string, unknown>>>,
  setUIList: Dispatch<SetStateAction<UIList[]>>,
  dispatch: (value: unknown) => void,
  setCurrentCanvas: (value: Record<string, unknown>) => unknown,
  forcedCanvasId?: string,
) {
  const uiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.uiCanvases);

  useEffect(() => {
    if (!currentProject?.id && !forcedCanvasId) {
      return;
    }

    getUI(setLoading);
  }, [currentProject, forcedCanvasId, getUI, setLoading]);

  useEffect(() => {
    if (!selectedUICanvasId) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "ui_canvas", selectedUICanvasId), (snapshot) => {
      const canvasData = snapshot.data();
      const { ...rest } = canvasData ?? {};

      setAllUIInputs(rest.input);
      dispatch(
        setCurrentCanvas({
          ...rest,
          id: selectedUICanvasId,
          input: rest?.input?.[selectedUICanvasId] ?? {},
        }),
      );
      setSelectedUI({
        ...rest,
        id: selectedUICanvasId,
        input: rest?.input?.[selectedUICanvasId] ?? {},
      });
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, selectedUICanvasId, setAllUIInputs, setCurrentCanvas, setSelectedUI]);

  useEffect(() => {
    if (!currentProject?.id) {
      return;
    }

    const list = [...uiCanvasCatalog].sort((a, b) => a.label.localeCompare(b.label));
    const storedCanvasId = forcedCanvasId || localStorage.getItem("currentUI");
    const nextSelectedId =
      (storedCanvasId && list.find((item) => item.id === storedCanvasId)?.id) ||
      list[0]?.id ||
      "";

    setUIList(list);

    setSelectedUICanvasId((prev) => {
      if (prev && list.some((item) => item.id === prev)) {
        return prev;
      }

      if (nextSelectedId) {
        localStorage.setItem("currentUI", nextSelectedId);
      } else {
        localStorage.removeItem("currentUI");
      }
      setAllUIInputs({});
      dispatch(
        setCurrentCanvas({
          description: "",
          id: nextSelectedId,
          input: {},
          label: list.find((item) => item.id === nextSelectedId)?.label || "",
        }),
      );
      setSelectedUI(undefined);
      return nextSelectedId;
    });
  }, [currentProject?.id, dispatch, forcedCanvasId, setAllUIInputs, setCurrentCanvas, setSelectedUI, setSelectedUICanvasId, setUIList, uiCanvasCatalog]);
}
