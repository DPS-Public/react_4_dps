import { useCallback, useRef, useState } from "react";
import type { ManualDescriptionValidationError } from "../types/ManualDescriptionValidationError.interface";
import type { ManualDescriptionValue } from "../types/ManualDescriptionValue.interface";

const initialManualDescriptionValue: ManualDescriptionValue = {
  event: "",
  description: "",
};

export const useUICanvasActionsManualDescriptionCreateDrawerState = () => {
  const [error, setError] = useState<ManualDescriptionValidationError | null>(null);
  const [manualDescriptionValue, setManualDescriptionValue] = useState<ManualDescriptionValue>(
    initialManualDescriptionValue,
  );
  const selectRef = useRef<{ focus?: () => void } | null>(null);

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

  const clearManualDescriptionDescription = useCallback(() => {
    setManualDescriptionValue((currentValue) => ({
      ...currentValue,
      description: "",
    }));
    setError(null);
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
  }, []);

  return {
    error,
    manualDescriptionValue,
    selectRef,
    focusActionSelect,
    setManualDescriptionEvent,
    setManualDescriptionDescription,
    clearManualDescriptionDescription,
    validateManualDescriptionDescription,
    resetManualDescriptionState,
  };
};
