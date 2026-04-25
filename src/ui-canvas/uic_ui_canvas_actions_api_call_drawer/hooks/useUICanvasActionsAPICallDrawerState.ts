import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectRef } from "antd";
import type { APICallValidationError } from "../types/APICallValidationError.interface";
import type { APICallValue } from "../types/APICallValue.interface";
import type { SelectedAPICallInput } from "../types/SelectedAPICallInput.interface";

const buildInitialValue = (selectedInput: SelectedAPICallInput | null): APICallValue => ({
  event: selectedInput?.event ?? "onclick",
  api: selectedInput?.api ?? "",
  description: selectedInput?.description ?? "",
});

export function useUICanvasActionsAPICallDrawerState({
  open,
  selectedInput,
}: {
  open: boolean;
  selectedInput: SelectedAPICallInput | null;
}) {
  const selectRef = useRef<SelectRef>(null);
  const [error, setError] = useState<APICallValidationError | null>(null);
  const [apiCallValue, setAPICallValue] = useState<APICallValue>(buildInitialValue(selectedInput));

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setAPICallValue(buildInitialValue(selectedInput));
  }, [open, selectedInput]);

  const resetAPICallState = useCallback(() => {
    setError(null);
    setAPICallValue(buildInitialValue(selectedInput));
  }, [selectedInput]);

  const focusActionSelect = useCallback(() => {
    window.requestAnimationFrame(() => {
      selectRef.current?.focus();
    });
  }, []);

  const validateAPICall = useCallback((value: APICallValue) => {
    const nextError: APICallValidationError = {};

    if (!value.event.trim()) {
      nextError.event = "Action is required";
    }

    if (!value.api.trim()) {
      nextError.api = "API is required";
    }

    if (value.description.trim().length > 1000) {
      nextError.description = "Description must be 1000 characters or less";
    }

    setError(Object.keys(nextError).length > 0 ? nextError : null);
    return Object.keys(nextError).length === 0;
  }, []);

  return {
    apiCallValue,
    error,
    focusActionSelect,
    resetAPICallState,
    selectRef,
    setAPICallApi: (api: string) => setAPICallValue((prev) => ({ ...prev, api })),
    setAPICallDescription: (description: string) =>
      setAPICallValue((prev) => ({ ...prev, description })),
    setAPICallEvent: (event: string) => setAPICallValue((prev) => ({ ...prev, event })),
    validateAPICall,
  };
}
