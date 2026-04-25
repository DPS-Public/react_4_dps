import { useCallback, useEffect, useRef, useState } from "react";
import type { ManualDescriptionValidationError } from "../types/ManualDescriptionValidationError.interface";
import type { ManualDescriptionValue } from "../types/ManualDescriptionValue.interface";
import type { SelectedManualDescriptionAction } from "@/ui-canvas/uic_ui_canvas/types/SelectedManualDescriptionAction.interface";
import { serviceGetManualDescriptionById } from "../services/serviceGetManualDescriptionById";

const initialManualDescriptionValue: ManualDescriptionValue = {
  event: "",
  description: "",
};

export const useUICanvasActionsManualDescriptionUpdateDrawerState = ({
  open,
  selectedUICanvasId,
  selectedAction,
}: {
  open: boolean;
  selectedUICanvasId: string;
  selectedAction: SelectedManualDescriptionAction | null;
}) => {
  const [error, setError] = useState<ManualDescriptionValidationError | null>(null);
  const [manualDescriptionValue, setManualDescriptionValue] = useState<ManualDescriptionValue>(
    initialManualDescriptionValue,
  );
  const [isLoadingManualDescription, setIsLoadingManualDescription] = useState(false);
  const selectRef = useRef<{ focus?: () => void } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setManualDescriptionValue({
      event: selectedAction?.event ?? "",
      description: selectedAction?.description ?? "",
    });

    if (!selectedUICanvasId || !selectedAction?.inputId || !selectedAction.id) {
      return;
    }

    let isMounted = true;
    setIsLoadingManualDescription(true);

    void serviceGetManualDescriptionById({
      selectedUICanvasId,
      inputId: selectedAction.inputId,
      manualDescriptionId: selectedAction.id,
    })
      .then((manualDescription) => {
        if (!isMounted || !manualDescription) {
          return;
        }

        setManualDescriptionValue({
          event: manualDescription.event ?? "",
          description: manualDescription.description ?? "",
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingManualDescription(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    open,
    selectedAction?.description,
    selectedAction?.event,
    selectedAction?.id,
    selectedAction?.inputId,
    selectedUICanvasId,
  ]);

  const focusActionSelect = useCallback(() => {
    selectRef.current?.focus?.();
  }, []);

  const setManualDescriptionEvent = useCallback((event: string) => {
    setManualDescriptionValue((currentValue) => ({
      ...currentValue,
      event,
    }));
  }, []);

  const setManualDescriptionDescription = useCallback((description: string) => {
    setManualDescriptionValue((currentValue) => ({
      ...currentValue,
      description,
    }));
  }, []);

  const validateManualDescriptionDescription = useCallback((description: string) => {
    if (!description.trim()) {
      setError({ description: "Description is required" });
      return false;
    }

    setError(null);
    return true;
  }, []);

  const resetManualDescriptionState = useCallback(() => {
    setManualDescriptionValue(initialManualDescriptionValue);
    setError(null);
    setIsLoadingManualDescription(false);
  }, []);

  return {
    error,
    isLoadingManualDescription,
    manualDescriptionValue,
    selectRef,
    focusActionSelect,
    setManualDescriptionEvent,
    setManualDescriptionDescription,
    validateManualDescriptionDescription,
    resetManualDescriptionState,
  };
};
