// store/projectSlice.ts
import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {Project} from "../type";

interface ProjectState {
  currentProject: Project | null;
  currentRepo: string | null;
}

const initialState: ProjectState = {
  currentProject: null,
  currentRepo: null,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setCurrentProject(state, action: PayloadAction<Project | null>) {
      state.currentProject = action.payload;
      // Save to localStorage for persistence
      if (action.payload) {
        localStorage.setItem("currentProject", JSON.stringify(action.payload));
      } else {
        localStorage.removeItem("currentProject");
      }
    },
    setCurrentRepo(state, action: PayloadAction<string | null>) {
      state.currentRepo = action.payload;
      // Save to localStorage for persistence
      if (action.payload) {
        localStorage.setItem("currentRepo", action.payload);
      } else {
        localStorage.removeItem("currentRepo");
      }
    },
    clearCurrentProject(state) {
      state.currentProject = null;
      localStorage.removeItem("currentProject");
    },
    clearCurrentRepo(state) {
      state.currentRepo = null;
      localStorage.removeItem("currentRepo");
    },
    clearAllProjectData(state) {
      state.currentProject = null;
      state.currentRepo = null;
      localStorage.removeItem("currentProject");
      localStorage.removeItem("currentRepo");
    },
  },
});

export const projectReducer = projectSlice.reducer;
export const { 
  setCurrentProject, 
  setCurrentRepo, 
  clearCurrentProject, 
  clearCurrentRepo,
  clearAllProjectData 
} = projectSlice.actions;
