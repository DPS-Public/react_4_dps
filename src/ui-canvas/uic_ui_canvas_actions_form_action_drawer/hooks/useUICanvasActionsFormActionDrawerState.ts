import { useCallback, useEffect, useRef, useState } from "react";
import type { FormActionValidationError } from "../types/FormActionValidationError.interface";
import type { FormActionValue } from "../types/FormActionValue.interface";
import type { SelectedFormActionInput } from "../types/SelectedFormActionInput.interface";

const initialFormActionValue: FormActionValue = {
  action: "",
  uiId: "",
  condition: "",
};

const getNormalizedFormAction = (
  selectedInput: SelectedFormActionInput | null,
): FormActionValue => {
  const source = selectedInput?.formAction ?? selectedInput ?? {};

  return {
    action: source.action ?? "",
    uiId: source.uiId ?? source.ui_canvas_id ?? "",
    condition: source.condition ?? "",
  };
};

export const useUICanvasActionsFormActionDrawerState = ({
  open,
  selectedInput,
}: {
  open: boolean;
  selectedInput: SelectedFormActionInput | null;
}) => {
  const [formActionValue, setFormActionValue] = useState<FormActionValue>(initialFormActionValue);
  const [error, setError] = useState<FormActionValidationError | null>(null);
  const selectRef = useRef<{ focus?: () => void } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormActionValue(getNormalizedFormAction(selectedInput));
    setError(null);
  }, [open, selectedInput]);

  const focusActionSelect = useCallback(() => {
    selectRef.current?.focus?.();
  }, []);

  const setFormActionAction = useCallback((action: string) => {
    setFormActionValue((currentValue) => ({
      ...currentValue,
      action,
      uiId: action === "close_form" ? "" : currentValue.uiId,
    }));
    setError((currentError) => ({
      ...(currentError ?? {}),
      action: undefined,
      uiId: undefined,
    }));
  }, []);

  const setFormActionUiId = useCallback((uiId: string) => {
    setFormActionValue((currentValue) => ({
      ...currentValue,
      uiId,
    }));
    setError((currentError) => ({
      ...(currentError ?? {}),
      uiId: undefined,
    }));
  }, []);

  const setFormActionCondition = useCallback((condition: string) => {
    setFormActionValue((currentValue) => ({
      ...currentValue,
      condition,
    }));
    setError((currentError) => ({
      ...(currentError ?? {}),
      condition: undefined,
    }));
  }, []);

  const validateFormAction = useCallback((value: FormActionValue) => {
    const trimmedCondition = value.condition.trim();
    const nextError: FormActionValidationError = {};

    if (!value.action) {
      nextError.action = "Action Type is required";
    }

    if (
      (value.action === "show_form" || value.action === "redirect") &&
      !value.uiId
    ) {
      nextError.uiId = "Related UI Canvas is required";
    }

    if (trimmedCondition && trimmedCondition.length < 3) {
      nextError.condition = "Condition must be at least 3 characters";
    }

    if (trimmedCondition.length > 1000) {
      nextError.condition = "Condition cannot exceed 1000 characters";
    }

    setError(Object.keys(nextError).length > 0 ? nextError : null);
    return Object.keys(nextError).length === 0;
  }, []);

  const resetFormActionState = useCallback(() => {
    setFormActionValue(initialFormActionValue);
    setError(null);
  }, []);

  return {
    error,
    formActionValue,
    resetFormActionState,
    selectRef,
    focusActionSelect,
    setFormActionAction,
    setFormActionCondition,
    setFormActionUiId,
    validateFormAction,
  };
};
