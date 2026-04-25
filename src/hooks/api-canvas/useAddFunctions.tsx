export default function useAddFunctions({
                                            selectedEndpoint,
                                            setIsInputDrawerVisible,
                                            setIsCreateOutputDrawerVisible,
                                            setIsCreateOperationDrawerVisible,
                                            setEditingInput,
                                            setEditingOutput,
                                            setEditingOperation
                                        }) {
    const addInput = () => {
        if (!selectedEndpoint) return;
        setEditingInput(null);
        setIsInputDrawerVisible(true);
    };


    const addOutput = () => {
        if (!selectedEndpoint) return;
        setEditingOutput(null);
        setIsCreateOutputDrawerVisible(true);
    };


    const addOperation = () => {
        if (!selectedEndpoint) return;
        setEditingOperation(null);
        setIsCreateOperationDrawerVisible(true);
    };
    return {
        addInput, addOutput, addOperation
    }
}
