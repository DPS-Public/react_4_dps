export default function useAPIResponseBodyUpdate({selectedEndpoint, updateEndpoint}) {
    const updateResponseBody = (value: string) => {
        if (!selectedEndpoint) return;
        const updatedEndpoint = {
            ...selectedEndpoint,
            responseBody: value,
        };
        updateEndpoint(updatedEndpoint);
    }
    return {updateResponseBody}
}
