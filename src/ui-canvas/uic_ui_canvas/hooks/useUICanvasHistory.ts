import { useEffect, useRef, useState } from "react";
import { serviceListenUICanvasHistory } from "../services/serviceListenUICanvasHistory";

interface UseUICanvasHistoryParams {
  historyDrawerOpen: boolean;
  selectedUICanvasId: string | null;
}

export const useUICanvasHistory = ({
  historyDrawerOpen,
  selectedUICanvasId,
}: UseUICanvasHistoryParams) => {
  const [historyDocument, setHistoryDocument] = useState<any>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!historyDrawerOpen || !selectedUICanvasId) {
      if (unsubscribeRef.current) unsubscribeRef.current();
      return;
    }

    if (unsubscribeRef.current) unsubscribeRef.current();

    unsubscribeRef.current = serviceListenUICanvasHistory(
      selectedUICanvasId,
      (data) => {
        if (data) {
          setHistoryDocument(data);
          setHistoryError(null);
        } else {
          setHistoryDocument(null);
          setHistoryError("No history found for this UI Canvas");
        }
      },
      (error) => {
        setHistoryDocument(null);
        setHistoryError(`Error loading history: ${error.message}`);
      }
    );

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [historyDrawerOpen, selectedUICanvasId]);

  return { historyDocument, historyError, setHistoryDocument, setHistoryError };
};
