import {doc, getDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {RootState, setCurrentCanvas, useAppDispatch} from "@/store";
import {useSelector} from "react-redux";
import {Dispatch, SetStateAction, useCallback} from "react";

export default function useGetAllUI({setSelectedUI, setUIList, setSelectedUICanvasId, setAllUIInputs, forcedCanvasId}: {
    setSelectedUI: any;
    setUIList: any;
    setSelectedUICanvasId: any;
    setAllUIInputs: any;
    forcedCanvasId?: string;
}) {
    const dispatch = useAppDispatch();
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const uiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.uiCanvases);

    const getUI = useCallback(async (setLoading: Dispatch<SetStateAction<boolean>>) => {
        if (!currentProject?.id && !forcedCanvasId) {
            return;
        }

        try {
            setLoading(true);

            if (forcedCanvasId && !currentProject?.id) {
                const uiCanvasDocRef = doc(db, "ui_canvas", forcedCanvasId);
                const snapshot = await getDoc(uiCanvasDocRef);

                if (!snapshot.exists()) {
                    setSelectedUICanvasId("");
                    setSelectedUI(undefined);
                    setUIList([]);
                    setAllUIInputs({});
                    return;
                }

                const selectedUiData = structuredClone(snapshot.data());
                const currentId = forcedCanvasId;
                const label = selectedUiData?.name || selectedUiData?.label || "Shared Canvas";

                setSelectedUICanvasId(currentId);
                setSelectedUI({
                    ...selectedUiData,
                    id: currentId,
                    input: selectedUiData?.input?.[currentId] ?? {},
                });

                dispatch(
                    setCurrentCanvas({
                        ...selectedUiData,
                        id: currentId,
                        input: selectedUiData?.input,
                    })
                );

                setAllUIInputs(selectedUiData?.input ?? {});
                setUIList([{ id: currentId, label }]);
                return;
            }

            const uiList = uiCanvasCatalog;
            const storedCanvasId = localStorage.getItem("currentUI");
            const nextSelectedId =
                (storedCanvasId && uiList.find((item) => item.id === storedCanvasId)?.id) ||
                uiList[0]?.id ||
                "";

            setUIList(uiList);
            setSelectedUICanvasId(nextSelectedId);
            setSelectedUI(undefined);
            setAllUIInputs({});
            if (nextSelectedId) {
                localStorage.setItem("currentUI", nextSelectedId);
            } else {
                localStorage.removeItem("currentUI");
            }
            dispatch(
                setCurrentCanvas({
                    description: "",
                    id: nextSelectedId,
                    input: {},
                    label: uiList.find((item) => item.id === nextSelectedId)?.label || "",
                })
            );
        } catch (e) {
            console.error("Error while loading UI canvases:", e);
        } finally {
            setLoading(false);
        }
    }, [currentProject?.id, dispatch, forcedCanvasId, setAllUIInputs, setSelectedUICanvasId, setSelectedUI, setUIList, uiCanvasCatalog]);

    return {getUI};
}
