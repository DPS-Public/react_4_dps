import React, { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, DatePicker, Drawer, Empty, Select, Spin, Timeline } from "antd";
import { CloseOutlined, HistoryOutlined, WarningOutlined } from "@ant-design/icons";
import UICanvasHeadingHistoryChangeDetails from "./UICanvasHeadingHistoryChangeDetails";
import { utilGetActionTypeColor } from "../utils/utilGetActionTypeColor";
import { utilGetActionIcon } from "../utils/utilGetActionIcon";
import { utilGetActionTypeLabel } from "../utils/utilGetActionTypeLabel";
import { utilFormatTimestamp } from "../utils/utilFormatTimestamp";
import UICanvasHeadingHistoryDrawerProps from "../types/UICanvasHeadingHistoryDrawerProps.interface";

const { RangePicker } = DatePicker;

export default function UICanvasHeadingHistoryDrawer({
  open,
  onClose,
  uiData,
  historyDocument,
  historyError,
  historyLoading = false,
}: UICanvasHeadingHistoryDrawerProps) {
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string[]>([]);
  const [historyDateRangeFilter, setHistoryDateRangeFilter] = useState<any>(null);

  const sortedHistoryChanges = useMemo(() => {
    const getTimestampDate = (timestamp: any): Date | null => {
      if (!timestamp) return null;

      try {
        if (timestamp?.toDate) return timestamp.toDate();
        if (typeof timestamp === "string" || typeof timestamp === "number") {
          const date = new Date(timestamp);
          return Number.isNaN(date.getTime()) ? null : date;
        }
        if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
        if (timestamp?._seconds) return new Date(timestamp._seconds * 1000);
        const fallbackDate = new Date(timestamp);
        return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
      } catch {
        return null;
      }
    };

    return [...(historyDocument?.allChanges || [])].sort((a: any, b: any) => {
      const aTime = getTimestampDate(a?.timestamp)?.getTime() || 0;
      const bTime = getTimestampDate(b?.timestamp)?.getTime() || 0;
      return bTime - aTime;
    });
  }, [historyDocument]);

  const historyTypeOptions = useMemo(
    () =>
      Array.from(new Set(sortedHistoryChanges.map((change: any) => change.actionType).filter(Boolean))).map(
        (actionType) => ({
          value: actionType,
          label: utilGetActionTypeLabel(actionType),
        })
      ),
    [sortedHistoryChanges]
  );

  const filteredHistoryChanges = useMemo(() => {
    return sortedHistoryChanges.filter((change: any) => {
      const matchesType =
        historyTypeFilter.length === 0 || historyTypeFilter.includes(change.actionType);

      if (!matchesType) return false;

      if (!historyDateRangeFilter || historyDateRangeFilter.length !== 2) return true;

      const dateValue = (() => {
        if (change?.timestamp?.toDate) return change.timestamp.toDate();
        if (typeof change?.timestamp === "string" || typeof change?.timestamp === "number") {
          return new Date(change.timestamp);
        }
        if (change?.timestamp?.seconds) return new Date(change.timestamp.seconds * 1000);
        if (change?.timestamp?._seconds) return new Date(change.timestamp._seconds * 1000);
        return null;
      })();

      if (!dateValue || Number.isNaN(dateValue.getTime())) return false;

      const [startDateValue, endDateValue] = historyDateRangeFilter;
      const startDate = startDateValue?.startOf ? startDateValue.startOf("day").toDate() : null;
      const endDate = endDateValue?.endOf ? endDateValue.endOf("day").toDate() : null;

      if (startDate && dateValue < startDate) return false;
      if (endDate && dateValue > endDate) return false;
      return true;
    });
  }, [sortedHistoryChanges, historyTypeFilter, historyDateRangeFilter]);

  return (
    <Drawer
      placement="right"
      onClose={onClose}
      open={open}
      width={800}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HistoryOutlined style={{ fontSize: "20px", color: "#1890ff" }} />
            <div>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>UI Canvas History</div>
              {uiData && (
                <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                  {uiData.label} - {filteredHistoryChanges.length || 0} changes
                </div>
              )}
            </div>
          </div>
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
        </div>
      }
    >
      {historyLoading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Spin size="large" />
        </div>
      ) : historyError ? (
        <Alert message="History Not Available" description={historyError} type="warning" showIcon icon={<WarningOutlined />} />
      ) : !historyDocument?.allChanges?.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No history records found for this UI Canvas" />
      ) : (
        <div style={{ padding: 24 }}>
          <Card size="small" style={{ marginBottom: 16, borderRadius: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12 }}>
              <Select
                mode="multiple"
                allowClear
                placeholder="Filter by history type"
                value={historyTypeFilter}
                onChange={(values) => setHistoryTypeFilter(values)}
                options={historyTypeOptions}
                maxTagCount="responsive"
              />
              <RangePicker
                value={historyDateRangeFilter}
                onChange={(values) => setHistoryDateRangeFilter(values)}
                allowClear
                format="DD.MM.YYYY"
              />
              <Button
                onClick={() => {
                  setHistoryTypeFilter([]);
                  setHistoryDateRangeFilter(null);
                }}
              >
                Clear
              </Button>
            </div>
          </Card>

          {filteredHistoryChanges.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No history records match the selected filters" />
          ) : (
            <Timeline mode="left">
              {filteredHistoryChanges.map((change: any, index: number) => (
                <Timeline.Item
                  key={index}
                  color={utilGetActionTypeColor(change.actionType)}
                  dot={
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${utilGetActionTypeColor(change.actionType)} 0%, ${utilGetActionTypeColor(change.actionType)}80 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "14px",
                      }}
                    >
                      {utilGetActionIcon(change.actionType)}
                    </div>
                  }
                >
                  <Card size="small" style={{ marginLeft: "16px", borderLeft: `3px solid ${utilGetActionTypeColor(change.actionType)}` }}>
                    <div style={{ marginBottom: 12 }}>
                      <Badge
                        color={utilGetActionTypeColor(change.actionType)}
                        text={<span style={{ fontWeight: 600 }}>{utilGetActionTypeLabel(change.actionType)}</span>}
                      />
                      <div style={{ fontSize: "11px", color: "#8c8c8c", marginTop: 4 }}>
                        {utilFormatTimestamp(change.timestamp)}
                      </div>
                    </div>
                    <UICanvasHeadingHistoryChangeDetails change={change} />
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </div>
      )}
    </Drawer>
  );
}
