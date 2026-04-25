import {Button, Card, Select} from "antd";
import {EditOutlined, PlusCircleOutlined} from "@ant-design/icons";
import React from "react";

const { Option } = Select;

export default function UIEditorHeading({
                                            onChangeUI,
                                            uiList,
                                            openUICreateModal,
                                            openUIUpdateModal,
                                            selectedUICanvasId,
                                            minimal = false,
                                        }) {
    return (
        <>
        <Card
            bodyStyle={{padding: 16}}
            style={{
                borderRadius: 10,
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow: "none",
                marginBottom: 0,
            }}
        >
            <div style={{display: "flex", gap: 16, alignItems: "center"}}>
                <Select
                    showSearch
                    value={selectedUICanvasId ?? ''}
                    placeholder="Load template"
                    onChange={onChangeUI}
                    style={{flex: "1", width: "100%"}}
                    optionLabelProp="label"
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {[...uiList].sort((a, b) => {
                        const labelA = (a.label || '').toLowerCase();
                        const labelB = (b.label || '').toLowerCase();
                        return labelA.localeCompare(labelB);
                    }).map((item) => (
                        <Option
                            key={item.id}
                            value={item.id}
                            label={item.label}
                            className="group"
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    {item.label}
                                </div>

                                {!minimal && (
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<EditOutlined/>}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => openUIUpdateModal(item)}
                                    />
                                )}
                            </div>
                        </Option>
                    ))}
                </Select>
                <Button
                    type="primary"
                    onClick={openUICreateModal}
                >
                    <PlusCircleOutlined style={{fontSize: "20px"}}/>
                </Button>
                {!minimal && (
                    <Button
                        type="primary"
                        href={`/ui-canvas/preview/${selectedUICanvasId}`}
                        target="_blank"
                    >
                        <span className="ant-btn-icon">
                            <span className="anticon anticon-eye">
                                <svg viewBox="64 64 896 896"
                                     focusable="false"
                                     data-icon="eye"
                                     width="1em" height="1em"
                                     fill="currentColor"
                                     aria-hidden="true">
                                    <path
                                        d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 000 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z"></path>
                                </svg>
                            </span>
                        </span>
                        Live Preview
                    </Button>
                )}
            </div>
        </Card>
        </>
    )
}
