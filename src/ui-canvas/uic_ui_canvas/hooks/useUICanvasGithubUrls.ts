import { useEffect, useRef, useState } from "react";
import { serviceListenUICanvasGithubUrls } from "../services/serviceListenUICanvasGithubUrls";
import { GithubUrl } from "../types/GithubUrl.interface";
import { UICanvasData } from "../types/UICanvasData.interface";

interface UseUICanvasGithubUrlsParams {
  selectedUICanvasId: string | null;
  selectedUI: UICanvasData | null;
}

export const useUICanvasGithubUrls = ({
  selectedUICanvasId,
  selectedUI,
}: UseUICanvasGithubUrlsParams) => {
  const [githubUrls, setGithubUrls] = useState<GithubUrl[]>([]);
  const [uiData, setUiData] = useState<UICanvasData | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!selectedUICanvasId) {
      setGithubUrls([]);
      setUiData(null);
      return;
    }

    unsubscribeRef.current = serviceListenUICanvasGithubUrls(
      selectedUICanvasId,
      (data) => {
        if (data) {
          setUiData(data as UICanvasData);
          setGithubUrls(data.githubUrls || []);
        } else {
          setUiData(null);
          setGithubUrls([]);
        }
      },
      () => {
        setUiData(null);
        setGithubUrls([]);
      }
    );

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [selectedUICanvasId]);

  useEffect(() => {
    if (!selectedUICanvasId && selectedUI) {
      setGithubUrls(selectedUI.githubUrls || []);
      setUiData(selectedUI);
    }
  }, [selectedUICanvasId, selectedUI]);

  return { githubUrls, uiData };
};
