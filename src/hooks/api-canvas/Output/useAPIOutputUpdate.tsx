export default function useAPIOutputUpdate({
                                          selectedEndpoint,
                                          updateEndpoint,
                                               setIsUpdateOutputDrawerVisible,
                                          setEditingOutput,
                                          editingOutput
                                      }) {
    const updateOutput = (output: { name: string; description: string }) => {
        if (!selectedEndpoint) return;

        const updatedEndpoint = {...selectedEndpoint};

        if (!updatedEndpoint.output) {
            updatedEndpoint.output = [];
        }

        updatedEndpoint.output[editingOutput?.value?.key] = ({
                name: output.name,
                description: output.description
        })

        updateEndpoint(updatedEndpoint);
        // setIsUpdateOutputDrawerVisible(false);
        setEditingOutput(null);
    };
    return {updateOutput}
}
