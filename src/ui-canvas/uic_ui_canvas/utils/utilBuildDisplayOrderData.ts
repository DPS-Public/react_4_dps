export const utilBuildDisplayOrderData = (data) => {
  const rawItems = Array.isArray(data) ? data : Object.values(data || {});
  const result = [];

  const normalize = (value) => (value === undefined || value === null ? "" : String(value).trim());
  const normalizeLookupKey = (value) => normalize(value).toLowerCase();
  const sortByOrder = (items) => items.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
  const uniqueItems = [];
  const seenIds = new Set();

  const byId = new Map();
  const byFkTableId = new Map();
  const byTableName = new Map();
  const byFkGroupId = new Map();
  const byGroupName = new Map();
  const childrenBuckets = {};

  rawItems.forEach((item) => {
    const id = normalize(item.id);
    if (!id || seenIds.has(id)) {
      return;
    }

    seenIds.add(id);
    uniqueItems.push(item);
    byId.set(id, item);

    const fkTableId = normalize(item.fkTableId);
    if (fkTableId) {
      byFkTableId.set(fkTableId, item);
      if (!childrenBuckets[fkTableId]) {
        childrenBuckets[fkTableId] = [];
      }
      childrenBuckets[fkTableId].push(item);
    }

    const tableName = normalize(item.tableName);
    if (tableName) {
      byTableName.set(normalizeLookupKey(tableName), item);
    }

    const fkGroupId = normalize(item.fkGroupId);
    if (fkGroupId) {
      byFkGroupId.set(fkGroupId, item);
      if (!childrenBuckets[fkGroupId]) {
        childrenBuckets[fkGroupId] = [];
      }
      childrenBuckets[fkGroupId].push(item);
    }

    const groupName = normalize(item.groupName);
    if (groupName) {
      byGroupName.set(normalizeLookupKey(groupName), item);
    }
  });

  const parentCandidates = uniqueItems.filter(
    (item) => !normalize(item.fkTableId) && !normalize(item.fkGroupId),
  );
  const orderedRoots = [...sortByOrder([...parentCandidates])];
  const rootIds = new Set(orderedRoots.map((item) => normalize(item.id)));

  Object.keys(childrenBuckets).forEach((fkKey) => {
    const resolved =
      byId.get(fkKey) ||
      byFkTableId.get(fkKey) ||
      byTableName.get(normalizeLookupKey(fkKey)) ||
      byFkGroupId.get(fkKey) ||
      byGroupName.get(normalizeLookupKey(fkKey));

    const resolvedId = normalize(resolved?.id);
    if (resolved && resolvedId && !rootIds.has(resolvedId)) {
      orderedRoots.push(resolved);
      rootIds.add(resolvedId);
    }
  });

  const visitedIds = new Set();

  const getChildren = (item) => {
    const childKeys = [
      normalize(item.id),
      normalizeLookupKey(item.tableName),
      normalizeLookupKey(item.groupName),
    ].filter(Boolean);

    const childMap = new Map();

    childKeys.forEach((key) => {
      (childrenBuckets[key] || []).forEach((child) => {
        const childId = normalize(child.id);
        if (childId && childId !== normalize(item.id) && !visitedIds.has(childId)) {
          childMap.set(childId, child);
        }
      });
    });

    return sortByOrder(Array.from(childMap.values()));
  };

  const appendItemWithChildren = (item, pathParts) => {
    const itemId = normalize(item.id);
    if (!itemId || visitedIds.has(itemId)) {
      return;
    }

    visitedIds.add(itemId);
    result.push({
      ...item,
      displayIndex: pathParts.join("."),
    });

    getChildren(item).forEach((child, index) => {
      appendItemWithChildren(child, [...pathParts, index + 1]);
    });
  };

  let topLevelCounter = 1;

  sortByOrder(orderedRoots).forEach((root) => {
    appendItemWithChildren(root, [topLevelCounter]);
    topLevelCounter += 1;
  });

  sortByOrder(uniqueItems).forEach((item) => {
    if (!visitedIds.has(normalize(item.id))) {
      appendItemWithChildren(item, [topLevelCounter]);
      topLevelCounter += 1;
    }
  });

  return result;
};
