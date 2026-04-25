export const utilFormatFieldName = (fieldName: string): string => {
  return fieldName.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};
