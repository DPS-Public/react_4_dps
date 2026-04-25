import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DbCanvasState {
  // Persist selected table id per project id: { [projectId]: tableId }
  selectedTableByProjectId: Record<string, string | null>;
}

const STORAGE_KEY = "selectedTableByProjectId";

function loadFromStorage(): DbCanvasState["selectedTableByProjectId"] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch {
    // Ignore malformed persisted state and fall back to the default selection.
    return null;
  }
}

const initialState: DbCanvasState = {
  selectedTableByProjectId: loadFromStorage(),
};

const dbCanvasSlice = createSlice({
  name: "dbCanvas",
  initialState,
  reducers: {
    setSelectedTable(
      state,
      action: PayloadAction<{ projectId: string; tableId: string | null }>
    ) {
      const { projectId, tableId } = action.payload;
      if (!projectId) return;
      state.selectedTableByProjectId[projectId] = tableId;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(state.selectedTableByProjectId)
        );
      } catch {
        // localStorage can fail in private browsing or restricted environments.
      }
    },
    clearProjectSelection(state, action: PayloadAction<{ projectId: string }>) {
      const { projectId } = action.payload;
      if (!projectId) return;
      delete state.selectedTableByProjectId[projectId];
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(state.selectedTableByProjectId)
        );
      } catch {
        // localStorage can fail in private browsing or restricted environments.
      }
    },
  },
});

export const dbCanvasReducer = dbCanvasSlice.reducer;
export const { setSelectedTable, clearProjectSelection } = dbCanvasSlice.actions;

