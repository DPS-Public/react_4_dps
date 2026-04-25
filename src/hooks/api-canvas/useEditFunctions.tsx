export default function useEditFunctions({
                                             setIsUpdateInputDrawerVisible,
                                             setIsUpdateOutputDrawerVisible,
                                             setIsUpdateOperationDrawerVisible,
                                             setEditingInput,
                                             setEditingOutput,
                                             setEditingOperation

                                         }) {
    const editInput = (
        operationId: string,
        key: string,
        value: { inputName: string; description: string }
    ) => {
        setEditingInput({id: operationId, key, value});
        setIsUpdateInputDrawerVisible(true);
    };

    const editOutput = (
        operationId: string,
        key: string,
        value: { outputName: string; description: string }
    ) => {
        setEditingOutput({id: operationId, key, value});
        setIsUpdateOutputDrawerVisible(true);
    };

    const editOperation = (
        operationId: string,
        key: string,
        value: { type: string; description: string }
    ) => {
        setEditingOperation({id: operationId, key, value});
        setIsUpdateOperationDrawerVisible(true);
    };
    return {
        editInput,
        editOutput,
        editOperation
    }
}
