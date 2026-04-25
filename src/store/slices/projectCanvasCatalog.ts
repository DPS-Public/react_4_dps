import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ApiCanvasListItem } from "@/utils/project/normalizeApiJson";

export interface ProjectCanvasCatalogState {
  projectId: string | null;
  apiJsonRaw: unknown;
  digitalServiceJsonRaw: unknown;
  apiCanvases: ApiCanvasListItem[];
  uiCanvases: Array<{ id: string; label: string }>;
  loading: boolean;
}

const initialState: ProjectCanvasCatalogState = {
  projectId: null,
  apiJsonRaw: null,
  digitalServiceJsonRaw: null,
  apiCanvases: [],
  uiCanvases: [],
  loading: false,
};

const projectCanvasCatalogSlice = createSlice({
  name: "projectCanvasCatalog",
  initialState,
  reducers: {
    setProjectCanvasCatalogLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setProjectCanvasCatalog(
      state,
      action: PayloadAction<{
        projectId: string;
        apiJsonRaw: unknown;
        digitalServiceJsonRaw: unknown;
        apiCanvases: ApiCanvasListItem[];
        uiCanvases: Array<{ id: string; label: string }>;
      }>,
    ) {
      state.projectId = action.payload.projectId;
      state.apiJsonRaw = action.payload.apiJsonRaw;
      state.digitalServiceJsonRaw = action.payload.digitalServiceJsonRaw;
      state.apiCanvases = action.payload.apiCanvases;
      state.uiCanvases = action.payload.uiCanvases;
      state.loading = false;
    },
    clearProjectCanvasCatalog(state) {
      state.projectId = null;
      state.apiJsonRaw = null;
      state.digitalServiceJsonRaw = null;
      state.apiCanvases = [];
      state.uiCanvases = [];
      state.loading = false;
    },
  },
});

export const projectCanvasCatalogReducer = projectCanvasCatalogSlice.reducer;
export const {
  setProjectCanvasCatalog,
  setProjectCanvasCatalogLoading,
  clearProjectCanvasCatalog,
} = projectCanvasCatalogSlice.actions;
