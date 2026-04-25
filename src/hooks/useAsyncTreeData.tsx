import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FileOutlined, FolderOpenOutlined } from "@ant-design/icons";

type RepoContentItem = {
  path: string;
  type: "file" | "dir";
};

type TreeNodeMap = Record<string, any>;
type AntTreeNode = {
  title: string;
  key: string;
  isLeaf: boolean;
  icon: React.ReactNode;
  children?: AntTreeNode[];
};

const BUILD_CHUNK_SIZE = 200;
const CONVERT_CHUNK_SIZE = 400;
const nextFrame = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });

const filterTreeNodes = (nodes: AntTreeNode[], searchTerm: string): AntTreeNode[] => {
  if (!searchTerm) return nodes;

  const normalizedSearchTerm = searchTerm.toLowerCase();

  return nodes.reduce<AntTreeNode[]>((acc, node) => {
    const filteredChildren = node.children ? filterTreeNodes(node.children, searchTerm) : undefined;
    const matchesSearch = node.title.toLowerCase().includes(normalizedSearchTerm);

    if (!matchesSearch && (!filteredChildren || filteredChildren.length === 0)) {
      return acc;
    }

    acc.push({
      ...node,
      children: filteredChildren,
    });

    return acc;
  }, []);
};

const collectExpandedFolderKeys = (nodes: AntTreeNode[]): string[] => {
  const expandedKeys: string[] = [];

  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      expandedKeys.push(String(node.key));
      expandedKeys.push(...collectExpandedFolderKeys(node.children));
    }
  });

  return expandedKeys;
};

const convertTreeMapToNodesChunked = async (
  treeSource: TreeNodeMap,
  onProgress: (progress: number) => void
): Promise<AntTreeNode[]> => {
  const rootNodes: AntTreeNode[] = [];
  const rootEntries = Object.entries(treeSource);
  const stack: Array<{
    entries: Array<[string, any]>;
    index: number;
    target: AntTreeNode[];
  }> = [{ entries: rootEntries, index: 0, target: rootNodes }];

  let processedNodeCount = 0;

  while (stack.length > 0) {
    const currentLevel = stack[stack.length - 1];

    if (currentLevel.index >= currentLevel.entries.length) {
      stack.pop();
      continue;
    }

    const [, item] = currentLevel.entries[currentLevel.index];
    currentLevel.index += 1;

    const nextNode: AntTreeNode = {
      title: item.title,
      key: item.key,
      isLeaf: item.isLeaf,
      icon: item.isLeaf ? <FileOutlined /> : <FolderOpenOutlined />,
      children: [],
    };

    currentLevel.target.push(nextNode);
    processedNodeCount += 1;

    const childEntries = Object.entries(item.children || {});
    if (childEntries.length > 0) {
      stack.push({
        entries: childEntries,
        index: 0,
        target: nextNode.children!,
      });
    } else {
      delete nextNode.children;
    }

    if (processedNodeCount % CONVERT_CHUNK_SIZE === 0) {
      onProgress(processedNodeCount);
      await nextFrame();
    }
  }

  onProgress(processedNodeCount);
  return rootNodes;
};

export const useAsyncTreeData = (
  files: RepoContentItem[],
  searchTerm: string
) => {
  const [treeSource, setTreeSource] = useState<TreeNodeMap>({});
  const [treeData, setTreeData] = useState<AntTreeNode[]>([]);
  const [isBuildingTree, setIsBuildingTree] = useState(false);
  const [treeBuildProgress, setTreeBuildProgress] = useState(0);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    let cancelled = false;

    if (files.length === 0) {
      setTreeSource({});
      setTreeData([]);
      setIsBuildingTree(false);
      setTreeBuildProgress(0);
      return () => {
        cancelled = true;
      };
    }

    setIsBuildingTree(true);
    setTreeBuildProgress(0);
    setTreeData([]);

    const nextTree: TreeNodeMap = {};
    let index = 0;

    const processChunk = async () => {
      if (cancelled) {
        return;
      }

      while (index < files.length) {
        const end = Math.min(index + BUILD_CHUNK_SIZE, files.length);

        for (let fileIndex = index; fileIndex < end; fileIndex += 1) {
          const file = files[fileIndex];
          const parts = file.path.split("/");
          let current = nextTree;

          parts.forEach((part, partIndex) => {
            if (!current[part]) {
              current[part] = {
                title: part,
                key: parts.slice(0, partIndex + 1).join("/"),
                isLeaf: partIndex === parts.length - 1 && file.type === "file",
                children: {},
              };
            }

            current = current[part].children;
          });
        }

        index = end;
        setTreeBuildProgress(Math.min(85, Math.round((index / files.length) * 85)));
        await nextFrame();
      }

      if (cancelled) {
        return;
      }

      setTreeSource(nextTree);

      const totalTreeNodes = files.length;
      const convertedNodes = await convertTreeMapToNodesChunked(nextTree, (processedNodeCount) => {
        if (cancelled) return;

        const convertRatio =
          totalTreeNodes > 0 ? Math.min(1, processedNodeCount / totalTreeNodes) : 1;
        setTreeBuildProgress(85 + Math.round(convertRatio * 14));
      });

      if (cancelled) {
        return;
      }

      setTreeData(convertedNodes);
      setTreeBuildProgress(100);
      setIsBuildingTree(false);
    };

    processChunk();

    return () => {
      cancelled = true;
    };
  }, [files]);

  const filteredTreeData = useMemo(
    () => filterTreeNodes(treeData, deferredSearchTerm),
    [deferredSearchTerm, treeData]
  );

  const expandedKeys = useMemo(
    () => (deferredSearchTerm.trim() ? collectExpandedFolderKeys(filteredTreeData) : []),
    [deferredSearchTerm, filteredTreeData]
  );

  return {
    treeData: filteredTreeData,
    expandedKeys,
    isBuildingTree,
    treeBuildProgress,
    treeSource,
  };
};
