// hooks/useAppTheme.ts
import {theme} from "antd";
import {useAppStore} from "@/stores/appStore";

export function useAppTheme() {
  const { theme: appTheme, setTheme } = useAppStore();
  const { defaultAlgorithm, darkAlgorithm } = theme;
  
  return {
    appTheme,
    setTheme,
    defaultAlgorithm,
    darkAlgorithm
  };
}
