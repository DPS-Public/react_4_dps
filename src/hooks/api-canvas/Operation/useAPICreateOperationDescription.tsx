export default function useAPICreateOperationDescription({
                                                             selectedEndpoint,
                                                             updateEndpoint,
                                                             setIsCreateOperationDrawerVisible,
                                                             setEditingOperation,
                                                             operationForm
                                                         }) {
    const createOperation = () => {
        if (!selectedEndpoint) return;

        const updatedEndpoint = {...selectedEndpoint};

        if (!updatedEndpoint.operation) {
            updatedEndpoint.operation = [];
        }

        updatedEndpoint.operation.push(operationForm);

        updateEndpoint(updatedEndpoint);
        // setIsCreateOperationDrawerVisible(false);
        setEditingOperation(null);
    };

    return {
        createOperation
    }
}
