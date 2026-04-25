

export interface FlattenedTreeRow {
    node: any;
    level: number;
}

const nextFrame = () =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0);
    });

export const utilFilterTreeBySearch = (nodes: any[], searchTerm: string): any[] => {
    if (!searchTerm) return nodes;

    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = (n: any): boolean => {
        const nameMatch = n.name?.toLowerCase().includes(searchLower);
        const pathMatch =
            n.pathName?.toLowerCase().includes(searchLower) ||
            n.githubPath?.toLowerCase().includes(searchLower);
        const externalPathMatch = n.externalPath?.toLowerCase().includes(searchLower);
        const childrenMatch = n.children?.some((child) => matchesSearch(child));

        return nameMatch || pathMatch || externalPathMatch || childrenMatch || false;
    };

    return nodes
        .filter((node) => {
            if (matchesSearch(node)) return true;
            if (node.children && node.children.length > 0) {
                const filteredChildren = utilFilterTreeBySearch(node.children, searchTerm);
                if (filteredChildren.length > 0) return true;
            }
            return false;
        })
        .map((node) => ({
            ...node,
            children: node.children ? utilFilterTreeBySearch(node.children, searchTerm) : undefined,
        }));
};

export const utilGeneratePathNames = (nodes: any[], parentPath: string = ""): any[] => {
    return nodes.map((node) => {
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        const resolvedPath = node.githubPath ?? currentPath;
        const newNode: any = {
            ...node,
            pathName: resolvedPath,
        };
        if (node.children && node.children.length > 0) {
            newNode.children = utilGeneratePathNames(node.children, resolvedPath);
        }
        return newNode;
    });
};

export const utilGeneratePathNamesChunked = async (
    nodes: any[],
    onChunk: (chunk: any[]) => void,
    chunkSize: number = 20
): Promise<any[]> => {
    const processedRoots: any[] = [];

    for (let index = 0; index < nodes.length; index += chunkSize) {
        const chunk = nodes.slice(index, index + chunkSize);
        const processedChunk = utilGeneratePathNames(chunk);
        processedRoots.push(...processedChunk);
        onChunk([...processedRoots]);
        await nextFrame();
    }

    return processedRoots;
};

export const utilGetRootFolderIds = (nodes: any[]): string[] =>
    nodes
        .filter((node) => node.type === "folder" && node.children && node.children.length > 0)
        .map((node) => node.id);

export const utilGetAllFolderIds = (nodes: any[]): string[] => {
    const folderIds: string[] = [];
    nodes.forEach((node) => {
        if (node.type === "folder" && node.children && node.children.length > 0) {
            folderIds.push(node.id);
            if (node.children) {
                folderIds.push(...utilGetAllFolderIds(node.children));
            }
        }
    });
    return folderIds;
};

export const utilGetAncestorFolderIds = (
    nodes: any[],
    targetNodeId: string | null
): string[] => {
    if (!targetNodeId) return [];

    const walk = (treeNodes: any[], ancestors: string[]): string[] | null => {
        for (const node of treeNodes) {
            if (node.id === targetNodeId) {
                return ancestors;
            }

            if (node.children && node.children.length > 0) {
                const nextAncestors =
                    node.type === "folder" ? [...ancestors, node.id] : ancestors;
                const result = walk(node.children, nextAncestors);
                if (result) return result;
            }
        }

        return null;
    };

    return walk(nodes, []) ?? [];
};

export const utilFlattenVisibleTree = (
    nodes: any[],
    expandedNodes: Set<string>,
    forceExpand: boolean = false,
    level: number = 0
): FlattenedTreeRow[] => {
    const rows: FlattenedTreeRow[] = [];

    nodes.forEach((node) => {
        rows.push({ node, level });

        const hasChildren = !!(node.children && node.children.length > 0);
        const isExpanded = forceExpand || expandedNodes.has(node.id);

        if (hasChildren && isExpanded) {
            rows.push(...utilFlattenVisibleTree(node.children!, expandedNodes, forceExpand, level + 1));
        }
    });

    return rows;
};

export const utilToggleSetNode = (prev: Set<string>, nodeId: string): Set<string> => {
    const newSet = new Set(prev);
    if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
    } else {
        newSet.add(nodeId);
    }
    return newSet;
};
