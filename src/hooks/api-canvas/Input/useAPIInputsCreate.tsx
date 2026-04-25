export default function useAPIInputsCreate({
                                               selectedEndpoint,
                                               updateEndpoint,
                                               setIsInputDrawerVisible,
                                               setEditingInput
                                           }) {
    function createInput(input: { name: string; description: string }) {
        if (!selectedEndpoint) return null;

        const updatedEndpoint = {...selectedEndpoint};

        if (!updatedEndpoint.input) {
            updatedEndpoint.input = [];
        }

        updatedEndpoint.input.push(input);
        updateEndpoint(updatedEndpoint);
        // setIsInputDrawerVisible(false);
        setEditingInput(null);
        return updatedEndpoint;
    }

    return {createInput}
}
