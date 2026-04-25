export const utilFormatTimestamp = (timestamp: any): string => {
  if (!timestamp) return "Unknown date";
  try {
    if (timestamp?.toDate) return timestamp.toDate().toLocaleString();
    if (typeof timestamp === "string") return new Date(timestamp).toLocaleString();
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000).toLocaleString();
    if (timestamp?._seconds) return new Date(timestamp._seconds * 1000).toLocaleString();
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Invalid date";
  }
};
