export const utilFindNodeById = (nodes: any[], id: string): any => {
    for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
            const found = utilFindNodeById(node.children, id)
            if (found) return found
        }
    }
    return null
}
