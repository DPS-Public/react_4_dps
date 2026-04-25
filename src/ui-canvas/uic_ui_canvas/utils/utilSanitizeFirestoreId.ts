export const utilSanitizeFirestoreId = (value: string): string => {
  return value.replace(/[/.#$[\]]/g, "_");
};
