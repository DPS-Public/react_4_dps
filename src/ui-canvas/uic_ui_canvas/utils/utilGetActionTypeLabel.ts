export const utilGetActionTypeLabel = (actionType: string): string => {
  switch (actionType) {
    case "NAME_UPDATE":
      return "Canvas Name Updated";
    case "GITHUB_URLS_ADD":
      return "GitHub Files Added";
    case "GITHUB_URL_DELETE":
      return "GitHub File Removed";
    case "GITHUB_URL_UPDATE":
      return "GitHub File Updated";
    case "CANVAS_DUPLICATED_FROM":
      return "Canvas Duplicated";
    case "CREATE":
      return "Canvas Created";
    case "FIELD_UPDATE":
      return "Canvas Field Updated";
    case "INPUT_UPDATE":
      return "Input List Updated";
    case "MANUAL_DESCRIPTION_BATCH_UPDATE":
      return "Input Descriptions Updated";
    case "UAC_UPDATE":
      return "UAC Updated";
    default:
      return actionType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }
};
