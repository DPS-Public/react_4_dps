export default function useAPIOutputCreate({
                                               selectedEndpoint,
                                               updateEndpoint,
                                               setIsCreateOutputDrawerVisible,
                                               setEditingOutput,
                                           }) {
    const createOutput = (output: { name: string; description: string }) => {
        if (!selectedEndpoint) return;

        const updatedEndpoint = {...selectedEndpoint};

        if (!updatedEndpoint.output) {
            updatedEndpoint.output = [];
        }

        updatedEndpoint.output.push(output);

        updateEndpoint(updatedEndpoint);
        // setIsCreateOutputDrawerVisible(false);
        setEditingOutput(null);
    };
    return {createOutput}
}
