import React from "react";
import { Button, Collapse, Empty, List, Tag, Typography } from "antd";
import { CaretRightOutlined, DeleteOutlined, EyeOutlined, GithubOutlined, PlusOutlined } from "@ant-design/icons";
import UICanvasHeadingGitHubListProps from "../types/UICanvasHeadingGitHubListProps.interface";

const { Text } = Typography;



export default function UICanvasHeadingGitHubList({
  selectedUICanvasId,
  githubUrls,
  onDeleteGithubUrl,
  onOpenAddDrawer,
  onOpenViewDrawer,
}: UICanvasHeadingGitHubListProps) {
  if (!selectedUICanvasId) return null;

  const getDisplayBranch = (branch?: string, defaultBranch?: string) => {
    if (defaultBranch) {
      return defaultBranch;
    }

    if (branch === "main" || branch === "master") {
      return branch;
    }

    return "main";
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Collapse
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        style={{ background: "#fafafa" }}
        defaultActiveKey={[]}
        items={[
          {
            key: "1",
            label: (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <GithubOutlined style={{ color: "#1890ff" }} />
                <span>GitHub Files ({githubUrls.length})</span>
              </div>
            ),
            extra:
              githubUrls.length > 0 ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenAddDrawer();
                  }}
                >
                  Add GitHub Files
                </Button>
              ) : null,
            children: githubUrls.length > 0 ? (
              <List
                size="small"
                dataSource={githubUrls}
                renderItem={(item) => (
                  <List.Item key={`${item.repoId}-${item.filePath}-${item.addedAt}`}>
                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <GithubOutlined style={{ color: "#1890ff" }} />
                          <Text
                            style={{
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "#1890ff",
                              cursor: "pointer",
                              maxWidth: "400px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            onClick={() => onOpenViewDrawer(item)}
                          >
                            {item.fileName || item.filePath.split("/").pop() || item.filePath}
                          </Text>
                          <Tag color="blue">{getDisplayBranch(item.branch, item.defaultBranch)}</Tag>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
                          <Text
                            style={{ fontSize: "12px", color: "#595959", cursor: "pointer" }}
                            onClick={() => onOpenViewDrawer(item)}
                            title={item.filePath}
                          >
                            Path: {item.filePath}
                          </Text>
                          {item.repoFullName && (
                            <Text style={{ fontSize: "12px", color: "#8c8c8c" }}>Repo: {item.repoFullName}</Text>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => onOpenViewDrawer(item)} />
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDeleteGithubUrl(item)} />
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No GitHub files added yet">
                <Button type="primary" onClick={onOpenAddDrawer}>
                  Add GitHub Files
                </Button>
              </Empty>
            ),
          },
        ]}
      />
    </div>
  );
}
