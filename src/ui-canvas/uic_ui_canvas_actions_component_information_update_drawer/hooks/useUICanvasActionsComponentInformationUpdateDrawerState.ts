import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComponentType } from "@/ui-canvas/uic_ui_canvas/types/ComponentType.enum";
import { serviceGetComponentInformationById } from "../services/serviceGetComponentInformationById";
import type { ComponentInformationValidationError } from "../types/ComponentInformationValidationError.interface";
import type { ComponentInformationValue } from "../types/ComponentInformationValue.interface";
import type { SelectedComponentInformationInput } from "../types/SelectedComponentInformationInput.interface";

const initialComponentInformationValue: ComponentInformationValue = {
  inputName: "",
  componentType: ComponentType.Txt,
  cellNo: "6",
  content: "",
  hasLabel: true,
};

const withoutLabelComponentTypes = [ComponentType.Btn, ComponentType.Hlink];

export const useUICanvasActionsComponentInformationUpdateDrawerState = ({
  open,
  selectedUICanvasId,
  selectedInput,
}: {
  open: boolean;
  selectedUICanvasId: string;
  selectedInput: SelectedComponentInformationInput | null;
}) => {
  const [componentInformationValue, setComponentInformationValue] =
    useState<ComponentInformationValue>(initialComponentInformationValue);
  const [error, setError] = useState<ComponentInformationValidationError | null>(null);
  const [isLoadingComponentInformation, setIsLoadingComponentInformation] = useState(false);
  const inputNameRef = useRef<{ focus?: () => void } | null>(null);

  const selectedInputId = selectedInput?.id ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }

    setComponentInformationValue({
      inputName: selectedInput?.inputName ?? "",
      componentType: selectedInput?.componentType ?? ComponentType.Txt,
      cellNo: String(selectedInput?.cellNo ?? "6"),
      content: selectedInput?.content ?? "",
      hasLabel:
        selectedInput?.hasLabel !== undefined
          ? selectedInput.hasLabel
          : !withoutLabelComponentTypes.includes(selectedInput?.componentType ?? ComponentType.Txt),
    });

    if (!selectedUICanvasId || !selectedInputId) {
      return;
    }

    let isMounted = true;
    setIsLoadingComponentInformation(true);

    void serviceGetComponentInformationById({
      selectedUICanvasId,
      inputId: selectedInputId,
    })
      .then((value) => {
        if (!isMounted || !value) {
          return;
        }

        setComponentInformationValue(value);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingComponentInformation(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    open,
    selectedInput?.cellNo,
    selectedInput?.componentType,
    selectedInput?.content,
    selectedInput?.hasLabel,
    selectedInput?.inputName,
    selectedInputId,
    selectedUICanvasId,
  ]);

  const componentWidthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const value = String(index + 1);
        return { value, label: value };
      }),
    [],
  );

  const focusInputName = useCallback(() => {
    inputNameRef.current?.focus?.();
  }, []);

  const setInputName = useCallback((inputName: string) => {
    setComponentInformationValue((currentValue) => ({
      ...currentValue,
      inputName,
    }));
  }, []);

  const setComponentType = useCallback((componentType: ComponentType) => {
    setComponentInformationValue((currentValue) => ({
      ...currentValue,
      componentType,
      hasLabel: !withoutLabelComponentTypes.includes(componentType),
    }));
  }, []);

  const setCellNo = useCallback((cellNo: string) => {
    setComponentInformationValue((currentValue) => ({
      ...currentValue,
      cellNo,
    }));
  }, []);

  const setContent = useCallback((content: string) => {
    setComponentInformationValue((currentValue) => ({
      ...currentValue,
      content,
    }));
  }, []);

  const validateInputName = useCallback((inputName: string) => {
    if (!inputName.trim()) {
      setError({ inputName: "Input Name is required" });
      return false;
    }

    setError(null);
    return true;
  }, []);

  const resetComponentInformationState = useCallback(() => {
    setComponentInformationValue(initialComponentInformationValue);
    setError(null);
    setIsLoadingComponentInformation(false);
  }, []);

  return {
    componentInformationValue,
    componentWidthOptions,
    error,
    inputNameRef,
    isLoadingComponentInformation,
    focusInputName,
    resetComponentInformationState,
    setCellNo,
    setComponentType,
    setContent,
    setInputName,
    validateInputName,
  };
};
