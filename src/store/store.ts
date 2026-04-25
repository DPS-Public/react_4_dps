// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import {
  authReducer,
  dbCanvasReducer,
  projectCanvasCatalogReducer,
  projectReducer,
} from "./slices";
import { permissionsReducer } from "./slices/permissions";

export const store = configureStore({
  reducer: {
    project: projectReducer,
    dbCanvas: dbCanvasReducer,
    auth: authReducer,
    permissions: permissionsReducer,
    projectCanvasCatalog: projectCanvasCatalogReducer,
    // Add other reducers here
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => typeof store.dispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
