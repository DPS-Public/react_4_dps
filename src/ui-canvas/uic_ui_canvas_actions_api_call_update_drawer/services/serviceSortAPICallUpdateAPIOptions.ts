export function serviceSortAPICallUpdateAPIOptions(apiList: Array<{ id: string; name?: string }>) {
  return [...apiList]
    .filter((item) => item.name && item.name !== item.id && item.name.trim() !== "")
    .sort((left, right) => (left.name || "").localeCompare(right.name || ""));
}
