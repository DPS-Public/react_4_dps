export default function useAPIInputsUpdate({
                                               selectedEndpoint,
                                               updateEndpoint,
                                               setIsInputDrawerVisible,
                                               editingInput,
                                               setEditingInput
                                           }) {
    function updateInput(input: { name: string; description: string }) {
        if (!selectedEndpoint) return null;
        const updatedEndpoint = {...selectedEndpoint};

        if (!updatedEndpoint.input) {
            updatedEndpoint.input = [];
        }

        updatedEndpoint.input[editingInput?.value?.key] = {name: input.name, description: input.description}
        updateEndpoint(updatedEndpoint);
        // setIsInputDrawerVisible(false);
        setEditingInput(null);
        return updatedEndpoint;
    }

    return {updateInput}
}
