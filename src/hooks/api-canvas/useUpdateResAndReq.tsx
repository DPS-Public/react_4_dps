import {APIEndpoint} from './types';

export default function useUpdateResAndReq({
  selectedEndpoint,
  updateEndpoint

}) {

    const updateConfig = (field: keyof APIEndpoint["config"], value: any) => {
    if (!selectedEndpoint) return;
    const updatedEndpoint = {
      ...selectedEndpoint,

      config: { ...selectedEndpoint.config, [field]: value },
    };
    updateEndpoint(updatedEndpoint);
  };

    return {
        updateConfig
  }
}
