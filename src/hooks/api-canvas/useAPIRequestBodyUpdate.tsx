export default function useAPIRequestBodyUpdate({selectedEndpoint, updateEndpoint}) {
    const updateRequestBody = (value: string) => {
        if (!selectedEndpoint) return;
        const updatedEndpoint = {
            ...selectedEndpoint,
            requestBody: value,
        };
        updateEndpoint(updatedEndpoint);
    }
    return {updateRequestBody}
}
