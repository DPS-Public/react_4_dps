export default function useMoveRow({
                                       selectedEndpoint,
                                       updateEndpoint
                                   }) {
    const moveRow = (type: 'input' | 'output' | 'operation', dragIndex: number, hoverIndex: number) => {
        if (!selectedEndpoint) return;
        const updatedEndpoint = {...selectedEndpoint};

        const list = type === 'input'
            ? [...(updatedEndpoint.input || [])]
            : type === 'output'
                ? [...(updatedEndpoint.output || [])]
                : [...(updatedEndpoint.operation || [])];

        const [movedItem] = list.splice(dragIndex, 1);
        list.splice(hoverIndex, 0, movedItem);

        if (type === 'input') {
            updatedEndpoint.input = list;
        } else if (type === 'output') {
            updatedEndpoint.output = list;
        } else {
            updatedEndpoint.operation = list;
        }

        updateEndpoint(updatedEndpoint);
    };

    return {moveRow}
}
