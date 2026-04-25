import { useState } from "react";

export const useUICanvasCollapse = () => {
  const [activeKey, setActiveKey] = useState<string | string[]>(() => {
    const saved = localStorage.getItem("uiCanvasCollapseActiveKey");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ["ui-view"];
      }
    }
    return ["ui-view"];
  });

  const onChangeCollapse = (key: string | string[]) => {
    setActiveKey(key);
    localStorage.setItem("uiCanvasCollapseActiveKey", JSON.stringify(key));
  };

  return { activeKey, onChangeCollapse };
};
