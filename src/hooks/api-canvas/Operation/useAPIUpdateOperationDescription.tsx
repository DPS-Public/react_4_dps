export default function useAPIUpdateOperationDescription({
                                                             selectedEndpoint,
                                                             updateEndpoint,
                                                             setIsUpdateOperationDrawerVisible,
                                                             setEditingOperation,
                                                             editingOperation,
                                                             operationForm
                                                         }) {
    const updateOperation = () => {
        if (!selectedEndpoint) return;
        const updatedEndpoint = {...selectedEndpoint};

        if (!updatedEndpoint.operation) {
            updatedEndpoint.operation = [];
        }

        updatedEndpoint.operation[editingOperation?.value?.key] = {
            type: operationForm.type,
            description: operationForm.description
        };

        updateEndpoint(updatedEndpoint);
        // setIsUpdateOperationDrawerVisible(false);
        setEditingOperation(null);
    };
    return {
        updateOperation
    }
}
