import React from "react";
import {
  ApiOutlined,
  CodeOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FormOutlined,
  GithubOutlined,
  HistoryOutlined,
  LinkOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";

export const utilGetActionIcon = (actionType: string): React.ReactNode => {
  switch (actionType) {
    case "NAME_UPDATE":
      return <EditOutlined />;
    case "GITHUB_URLS_ADD":
      return <GithubOutlined />;
    case "GITHUB_URL_DELETE":
      return <DeleteOutlined />;
    case "GITHUB_URL_UPDATE":
      return <LinkOutlined />;
    case "CANVAS_DUPLICATED_FROM":
      return <CopyOutlined />;
    case "CREATE":
      return <PlusCircleOutlined />;
    case "EXTERNAL_LINK_CREATE":
      return <LinkOutlined />;
    case "INPUT_CREATE":
    case "INPUT_UPDATE":
      return <CodeOutlined />;
    case "COMPONENT_INFO_UPDATE":
    case "FIELD_UPDATE":
    case "MANUAL_DESCRIPTION_CREATE":
    case "MANUAL_DESCRIPTION_UPDATE":
    case "MANUAL_DESCRIPTION_BATCH_UPDATE":
    case "TEMPLATE_DESCRIPTION_CREATE":
    case "TEMPLATE_DESCRIPTION_UPDATE":
      return <FileTextOutlined />;
    case "API_CALL_RELATION_UPDATE":
      return <ApiOutlined />;
    case "DB_RELATION_CREATE":
    case "DB_RELATION_UPDATE":
      return <DatabaseOutlined />;
    case "COLLECTION_CANVAS_ASSIGN":
    case "FORM_ACTION_CREATE":
    case "FORM_ACTION_UPDATE":
    case "UAC_UPDATE":
      return <FormOutlined />;
    default:
      return <HistoryOutlined />;
  }
};
