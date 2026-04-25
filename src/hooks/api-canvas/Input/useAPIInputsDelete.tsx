export default function useAPIInputsDelete({
                                               selectedEndpoint,
                                               updateEndpoint
                                           }) {
    const deleteInput = (operationId: string, key: string) => {
        if (!selectedEndpoint) return;
        const updatedEndpoint = {...selectedEndpoint};

        if (updatedEndpoint.input && updatedEndpoint.input[operationId]) {
            updatedEndpoint.input.splice(operationId, 1);
            updateEndpoint(updatedEndpoint);
        }
    };
    return {deleteInput}
}
