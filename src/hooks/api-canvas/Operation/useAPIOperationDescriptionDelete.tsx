export default function useAPIOperationDescriptionDelete({
                                                             selectedEndpoint,
                                                             updateEndpoint
                                                         }) {
    const deleteOperationDescription = (operationId: string) => {
        if (!selectedEndpoint) return;
        const updatedEndpoint = {...selectedEndpoint};
        if (updatedEndpoint.operation && updatedEndpoint.operation[operationId]) {
            updatedEndpoint.operation.splice(operationId, 1);
            updateEndpoint(updatedEndpoint);
        }
    }
    return {deleteOperationDescription}
}
