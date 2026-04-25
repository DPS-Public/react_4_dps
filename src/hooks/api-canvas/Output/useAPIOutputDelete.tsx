export default function useAPIOutputDelete({selectedEndpoint, updateEndpoint}) {
    const deleteOutput = (operationId: string, key: string) => {
        if (!selectedEndpoint) return;

        const updatedEndpoint = {...selectedEndpoint};

        if (updatedEndpoint.output && updatedEndpoint.output[operationId]) {
            updatedEndpoint.output.splice(operationId, 1);
            updateEndpoint(updatedEndpoint);
        }
    };
    return {deleteOutput}
}
