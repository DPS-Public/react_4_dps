export const utilGetActionTypeColor = (actionType: string): string => {
  switch (actionType) {
    case "NAME_UPDATE":
      return "blue";
    case "GITHUB_URLS_ADD":
    case "INPUT_CREATE":
    case "MANUAL_DESCRIPTION_CREATE":
    case "TEMPLATE_DESCRIPTION_CREATE":
    case "API_CALL_RELATION_CREATE":
    case "DB_RELATION_CREATE":
    case "EXTERNAL_LINK_CREATE":
    case "FORM_ACTION_CREATE":
    case "COLLECTION_CANVAS_ASSIGN":
      return "green";
    case "GITHUB_URL_DELETE":
      return "red";
    case "GITHUB_URL_UPDATE":
    case "COMPONENT_INFO_UPDATE":
    case "MANUAL_DESCRIPTION_UPDATE":
    case "TEMPLATE_DESCRIPTION_UPDATE":
    case "API_CALL_RELATION_UPDATE":
    case "DB_RELATION_UPDATE":
    case "FORM_ACTION_UPDATE":
    case "FIELD_UPDATE":
    case "INPUT_UPDATE":
    case "MANUAL_DESCRIPTION_BATCH_UPDATE":
    case "UAC_UPDATE":
      return "orange";
    case "CANVAS_DUPLICATED_FROM":
    case "CREATE":
      return "purple";
    default:
      return "gray";
  }
};
