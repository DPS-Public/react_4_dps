import { useCallback, useEffect, useState } from "react";
import type { APICallUpdateValidationError } from "../types/APICallUpdateValidationError.interface";
import type { APICallUpdateValue } from "../types/APICallUpdateValue.interface";
import type { SelectedAPICallUpdateInput } from "../types/SelectedAPICallUpdateInput.interface";

const buildInitialValue = (selectedInput: SelectedAPICallUpdateInput | null): APICallUpdateValue => ({
  event: selectedInput?.event ?? "onclick",
  api: selectedInput?.api ?? "",
  description: selectedInput?.description ?? "",
});

export function useUICanvasActionsAPICallUpdateDrawerState({
  open,
  selectedInput,
}: {
  open: boolean;
  selectedInput: SelectedAPICallUpdateInput | null;
}) {
  const [error, setError] = useState<APICallUpdateValidationError | null>(null);
  const [apiCallValue, setAPICallValue] = useState<APICallUpdateValue>(buildInitialValue(selectedInput));

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setAPICallValue(buildInitialValue(selectedInput));
  }, [open, selectedInput]);

  const resetAPICallUpdateState = useCallback(() => {
    setError(null);
    setAPICallValue(buildInitialValue(selectedInput));
  }, [selectedInput]);

  const validateAPICallUpdate = useCallback((value: APICallUpdateValue) => {
    const nextError: APICallUpdateValidationError = {};

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
    resetAPICallUpdateState,
    setAPICallApi: (api: string) => setAPICallValue((prev) => ({ ...prev, api })),
    setAPICallDescription: (description: string) =>
      setAPICallValue((prev) => ({ ...prev, description })),
    setAPICallEvent: (event: string) => setAPICallValue((prev) => ({ ...prev, event })),
    validateAPICallUpdate,
  };
}
