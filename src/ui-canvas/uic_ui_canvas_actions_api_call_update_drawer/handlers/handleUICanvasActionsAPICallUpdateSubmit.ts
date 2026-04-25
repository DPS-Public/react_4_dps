import type { APICallUpdateValue } from "../types/APICallUpdateValue.interface";

export async function handleUICanvasActionsAPICallUpdateSubmit({
  apiCallValue,
  selectedInputId,
  selectedInputInputId,
  sortedAPIList,
  validateAPICallUpdate,
  updateAPICallRelation,
  onSuccess,
  setIsSubmitting,
}: {
  apiCallValue: APICallUpdateValue;
  selectedInputId?: string;
  selectedInputInputId?: string;
  sortedAPIList: Array<{ id: string; name?: string }>;
  validateAPICallUpdate: (value: APICallUpdateValue) => boolean;
  updateAPICallRelation?: (
    value: {
      event: string;
      description: string;
      api: string;
      apiName: string;
    },
    inputId: string,
  ) => Promise<boolean | void>;
  onSuccess: () => void;
  setIsSubmitting: (value: boolean) => void;
}) {
  if (!selectedInputId || !selectedInputInputId || !updateAPICallRelation) {
    return;
  }

  const sanitizedValue: APICallUpdateValue = {
    event: apiCallValue.event.trim(),
    api: apiCallValue.api.trim(),
    description: apiCallValue.description.trim(),
  };

  if (!validateAPICallUpdate(sanitizedValue)) {
    return;
  }

  const selectedAPI = sortedAPIList.find((item) => item.id === sanitizedValue.api);
  const payload = {
    ...sanitizedValue,
    apiName: selectedAPI?.name || selectedAPI?.id || sanitizedValue.api,
  };

  setIsSubmitting(true);
  try {
    const isSuccess = await updateAPICallRelation(payload, selectedInputInputId);
    if (isSuccess === false) {
      return;
    }

    onSuccess();
  } finally {
    setIsSubmitting(false);
  }
}
