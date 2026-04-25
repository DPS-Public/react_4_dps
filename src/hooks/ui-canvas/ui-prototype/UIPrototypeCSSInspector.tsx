import React, { Dispatch, MutableRefObject, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { Col, Form, Input, Radio, Row, Select } from "antd";
import { CloseOutlined } from "@ant-design/icons";

import { deviceOptions } from "@/components/ui-editor/types.ts";
import { ComponentJson, componentTypesObj, ComponentsJson } from "@/components/ui-canvas/common/types.ts";

export interface UIPrototypeCSSInspectorProps {
    allCssString: string;
    componentAttributeSummary: string;
    components: ComponentsJson;
    containerCss: string;
    cssRef: MutableRefObject<Record<string, string>>;
    cssTarget: "container" | "component" | "canvas";
    onClose?: () => void;
    persistPrototypes: (componentsJson: ComponentsJson, selectedUICanvasId: string) => Promise<void>;
    selectedComponent?: ComponentJson | null;
    selectedUICanvasId: string;
    setComponents: Dispatch<SetStateAction<ComponentsJson>>;
    setContainerCss: Dispatch<SetStateAction<string>>;
    setSelectedComponent: Dispatch<SetStateAction<ComponentJson | null>>;
    setCssTarget: Dispatch<SetStateAction<"container" | "component" | "canvas">>;
    updateAllCss: (newCss: string) => void;
    updateCss: (property: string, value: string) => void;
    variant?: "floating" | "docked";
}

export type UIPrototypeCSSInspectorBindings = Omit<UIPrototypeCSSInspectorProps, "onClose" | "variant">;

const fontStyleOptions = [
    { label: "Select Font Style", value: "" },
    { label: "Normal", value: "normal" },
    { label: "Italic", value: "italic" },
    { label: "Oblique", value: "oblique" },
];
const fontWeightOptions = [
    { label: "Select Font Weight", value: "" },
    { label: "300", value: "300" },
    { label: "400", value: "400" },
    { label: "500", value: "500" },
    { label: "600", value: "600" },
    { label: "700", value: "700" },
];
const textAlignOptions = [
    { label: "Select Align", value: "" },
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
    { label: "Justify", value: "justify" },
];
const fontFamilyOptions = [
    { label: "Select Font", value: "" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Helvetica Neue", value: "'Helvetica Neue', sans-serif" },
    { label: "Times New Roman", value: "'Times New Roman', serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Courier New", value: "'Courier New', monospace" },
    { label: "Verdana", value: "Verdana, sans-serif" },
];
const borderStyleOptions = [
    { label: "Select Border Style", value: "" },
    { label: "Solid", value: "solid" },
    { label: "Dashed", value: "dashed" },
    { label: "Dotted", value: "dotted" },
    { label: "Double", value: "double" },
    { label: "None", value: "none" },
];

const formatCssTextareaValue = (css: string, finalize = false) => {
    const normalizedCss = css.replace(/\r\n/g, "\n");
    const cssParts = normalizedCss.split(";");
    const hasTrailingSemicolon = normalizedCss.trimEnd().endsWith(";");

    return cssParts
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, index, array) => {
            const shouldAppendSemicolon = finalize || hasTrailingSemicolon || index < array.length - 1;
            return shouldAppendSemicolon ? `${part};` : part;
        })
        .join("\n");
};

const parseCssTextareaValue = (css: string) => {
    const cssEntries: Record<string, string> = {};

    css.split(";").forEach((entry) => {
        const [key, value] = entry.split(":").map((item) => item?.trim());

        if (key && value) {
            const camelKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
            cssEntries[camelKey] = value;
        }
    });

    return {
        ...cssEntries,
        allCss: formatCssTextareaValue(css || "", true),
        width: cssEntries.width?.replace("px", "") || "",
        height: cssEntries.height?.replace("px", "") || "",
        fontSize: cssEntries.fontSize?.replace("px", "") || "",
        borderRadius: cssEntries.borderRadius?.replace("px", "") || "",
        borderWidth: cssEntries.borderWidth?.replace("px", "") || "",
        paddingTop: cssEntries.paddingTop?.replace("px", "") || "",
        paddingBottom: cssEntries.paddingBottom?.replace("px", "") || "",
        paddingLeft: cssEntries.paddingLeft?.replace("px", "") || "",
        paddingRight: cssEntries.paddingRight?.replace("px", "") || "",
        marginTop: cssEntries.marginTop?.replace("px", "") || "",
        marginBottom: cssEntries.marginBottom?.replace("px", "") || "",
        marginLeft: cssEntries.marginLeft?.replace("px", "") || "",
        marginRight: cssEntries.marginRight?.replace("px", "") || "",
        background: cssEntries.background || "",
        color: cssEntries.color || "",
        borderColor: cssEntries.borderColor || "",
        opacity: cssEntries.opacity || "",
        fontWeight: cssEntries.fontWeight || "",
        fontStyle: cssEntries.fontStyle || "",
        textAlign: cssEntries.textAlign || "",
        fontFamily: cssEntries.fontFamily || "",
        borderStyle: cssEntries.borderStyle || "",
    };
};

const upsertCssTextareaDeclaration = (cssString: string, property: string, value: string) => {
    const normalizedProperty = property.trim().toLowerCase();
    const declarations = formatCssTextareaValue(cssString || "", true)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.toLowerCase().startsWith(`${normalizedProperty}:`));

    if (value.trim()) {
        declarations.push(`${property}: ${value};`);
    }

    return declarations.join("\n");
};

const getColorInputValue = (value: string) => (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#000000");

const compactLabelStyle = {
    fontSize: 12,
    lineHeight: "16px",
    color: "#595959",
    fontWeight: 500,
};

const compactControlStyle = {
    fontSize: 12,
};

export default function UIPrototypeCSSInspector({
    allCssString,
    componentAttributeSummary,
    components,
    containerCss,
    cssRef,
    cssTarget,
    onClose,
    persistPrototypes,
    selectedComponent,
    selectedUICanvasId,
    setComponents,
    setContainerCss,
    setSelectedComponent,
    setCssTarget,
    updateAllCss,
    updateCss,
    variant = "floating",
}: UIPrototypeCSSInspectorProps) {
    const panelWidth = 340;
    const panelHeight = 420;
    const headerRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef({
        dragging: false,
        offsetX: 0,
        offsetY: 0,
    });
    const [position, setPosition] = useState(() => ({
        x: Math.max(16, window.innerWidth - panelWidth - 28),
        y: 84,
    }));
    const [allCssValue, setAllCssValue] = useState(() => formatCssTextareaValue(allCssString || ""));
    const liveCssValues = useMemo(() => parseCssTextareaValue(allCssValue), [allCssValue]);

    const clampPosition = (x: number, y: number) => {
        const maxX = Math.max(16, window.innerWidth - panelWidth - 16);
        const maxY = Math.max(16, window.innerHeight - Math.min(panelHeight, window.innerHeight - 32) - 16);

        return {
            x: Math.min(Math.max(16, x), maxX),
            y: Math.min(Math.max(16, y), maxY),
        };
    };

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!dragStateRef.current.dragging) return;

            setPosition(
                clampPosition(
                    event.clientX - dragStateRef.current.offsetX,
                    event.clientY - dragStateRef.current.offsetY
                )
            );
        };

        const handleMouseUp = () => {
            dragStateRef.current.dragging = false;
        };

        const handleResize = () => {
            setPosition((current) => clampPosition(current.x, current.y));
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    useEffect(() => {
        setAllCssValue(formatCssTextareaValue(allCssString || ""));
    }, [allCssString, cssTarget, selectedComponent?.id]);

    useEffect(() => {
        cssRef.current = liveCssValues;
    }, [cssRef, liveCssValues]);

    const applyCssPropertyChange = (property: string, value: string) => {
        const nextCss = upsertCssTextareaDeclaration(allCssValue, property, value);
        setAllCssValue(nextCss);
        updateCss(property, value);
    };

    const handleHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest("button")) {
            return;
        }

        const rect = headerRef.current?.getBoundingClientRect();
        if (!rect) return;

        dragStateRef.current = {
            dragging: true,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        };
    };

    const renderCssNumberField = (
        label: string,
        key: string,
        property: string,
        options?: { px?: boolean; min?: string; max?: string; step?: string }
    ) => {
        const suffix = options?.px === false ? "" : "px";

        return (
            <Form.Item label={label} style={{ marginBottom: 6 }} labelCol={{ style: compactLabelStyle }}>
                <Input
                    size="small"
                    type="number"
                    disabled={areComponentControlsDisabled || isCanvasTarget}
                    value={liveCssValues[key] || ""}
                    style={compactControlStyle}
                    min={options?.min}
                    max={options?.max}
                    step={options?.step}
                    onChange={(e) => {
                        const val = e.target.value;
                        applyCssPropertyChange(property, val ? `${val}${suffix}` : "");
                    }}
                />
            </Form.Item>
        );
    };

    const renderCssSelectField = (
        label: string,
        key: string,
        property: string,
        options: Array<{ label: string; value: string }>
    ) => (
        <Form.Item label={label} style={{ marginBottom: 6 }} labelCol={{ style: compactLabelStyle }}>
            <Select
                size="small"
                disabled={areComponentControlsDisabled || isCanvasTarget}
                value={liveCssValues[key] || ""}
                options={options}
                style={compactControlStyle}
                onChange={(val) => applyCssPropertyChange(property, val)}
            />
        </Form.Item>
    );

    const renderSpacingRow = (
        firstLabel: string,
        firstKey: string,
        firstProperty: string,
        secondLabel: string,
        secondKey: string,
        secondProperty: string
    ) => (
        <Row gutter={8}>
            <Col span={12}>{renderCssNumberField(firstLabel, firstKey, firstProperty)}</Col>
            <Col span={12}>{renderCssNumberField(secondLabel, secondKey, secondProperty)}</Col>
        </Row>
    );

    const selectedComponentTypeLabel = selectedComponent?.componentType
        ? componentTypesObj[selectedComponent.componentType]?.label ?? selectedComponent.componentType
        : "No component selected";
    const selectedComponentName =
        selectedComponent?.inputName?.trim() ||
        selectedComponent?.content?.trim() ||
        "Unnamed component";
    const panelTitle = selectedComponent?.id
        ? `CSS Panel: ${selectedComponentName}`
        : "CSS Panel";
    const isNoComponentSelected = !selectedComponent?.id && cssTarget !== "canvas";
    const isCanvasTarget = cssTarget === "canvas";
    const requiresSelectedComponent = cssTarget !== "canvas";
    const areComponentControlsDisabled = requiresSelectedComponent && !selectedComponent;
    const persistCanvasCss = (nextCss: string) => {
        setComponents((prev) => {
            const nextComponents = {
                ...prev,
                css: nextCss,
            };

            persistPrototypes(nextComponents, selectedUICanvasId);
            return nextComponents;
        });
    };

    const renderFieldGroup = (title: string, children: React.ReactNode) => (
        <div
            className="mb-2 rounded-md border border-[#e5e7eb] bg-[#fafafa]"
            style={{ padding: 8 }}
        >
            <div
                className="mb-1.5 uppercase tracking-[0.04em] text-[#8c8c8c]"
                style={{ fontSize: 11, lineHeight: "14px", fontWeight: 700 }}
            >
                {title}
            </div>
            {children}
        </div>
    );

    const isDocked = variant === "docked";
    const shellClassName = isDocked
        ? "relative h-full overflow-hidden rounded-[14px] border border-gray-200 bg-white"
        : "pointer-events-auto relative overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-[0_20px_64px_rgba(15,23,42,0.18)]";
    const shellStyle = isDocked
        ? {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column" as const,
        }
        : {
            width: panelWidth,
            height: panelHeight,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 32px)",
            display: "flex",
            flexDirection: "column" as const,
            position: "fixed" as const,
            left: position.x,
            top: position.y,
        };

    const content = (
        <div className={`ui-prototype-css-inspector ${shellClassName}`} style={shellStyle}>
                <style>
                    {`
                        .ui-prototype-css-inspector,
                        .ui-prototype-css-inspector * {
                            font-size: 12px;
                        }

                        .ui-prototype-css-inspector .ant-form-item-label > label,
                        .ui-prototype-css-inspector .ant-input,
                        .ui-prototype-css-inspector .ant-input-number,
                        .ui-prototype-css-inspector .ant-input-number-input,
                        .ui-prototype-css-inspector .ant-select-selector,
                        .ui-prototype-css-inspector .ant-select-selection-item,
                        .ui-prototype-css-inspector .ant-select-selection-placeholder,
                        .ui-prototype-css-inspector .ant-radio-button-wrapper,
                        .ui-prototype-css-inspector .ant-btn,
                        .ui-prototype-css-inspector textarea {
                            font-size: 12px !important;
                        }

                        .ui-prototype-css-inspector .ant-form-vertical .ant-form-item:not(.ant-form-item-horizontal) .ant-form-item-label,
                        .ui-prototype-css-inspector .ant-form-item .ant-form-item-label {
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                    `}
                </style>
                <div
                    ref={headerRef}
                    className="flex items-center justify-between border-b border-gray-200 bg-[#fafafa] px-2 py-2"
                    style={{ cursor: isDocked ? "default" : "move" }}
                    onMouseDown={isDocked ? undefined : handleHeaderMouseDown}
                >
                    <div className="min-w-0 pr-3">
                        <div className="truncate text-[12px] font-semibold leading-4 text-[#262626]">{panelTitle}</div>
                        <div
                            className="truncate text-[11px] leading-4"
                            style={
                                isNoComponentSelected
                                    ? {
                                        display: "inline-flex",
                                        alignItems: "center",
                                        marginTop: 2,
                                        padding: "1px 6px",
                                        borderRadius: 999,
                                        background: "#fff1f0",
                                        color: "#cf1322",
                                        border: "1px solid #ffa39e",
                                        fontWeight: 700,
                                    }
                                    : {
                                        color: "#8c8c8c",
                                    }
                            }
                        >
                            {selectedComponentTypeLabel}
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Close CSS panel"
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-[#595959] transition-colors hover:border-[#91caff] hover:text-[#1677ff]"
                        onClick={onClose}
                        style={{ cursor: "pointer" }}
                    >
                        <CloseOutlined className="text-[12px]" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    {renderFieldGroup(
                        "Target",
                        <Form.Item label="CSS Target" style={{ marginBottom: 0 }} labelCol={{ style: compactLabelStyle }}>
                            <Radio.Group
                                size="small"
                                value={cssTarget}
                                onChange={(e) => setCssTarget(e.target.value)}
                                optionType="button"
                                buttonStyle="solid"
                                style={compactControlStyle}
                            >
                                <Radio.Button value="container" style={{ fontSize: 12 }}>Container</Radio.Button>
                                <Radio.Button value="component" style={{ fontSize: 12 }}>Component</Radio.Button>
                                <Radio.Button value="canvas" style={{ fontSize: 12 }}>Canvas</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    )}
                    <Form
                        key={`${selectedComponent?.id || "no-component"}-${cssTarget}`}
                        layout="vertical"
                        size="small"
                        labelCol={{ style: { ...compactLabelStyle, paddingBottom: 1 } }}
                        style={{ rowGap: 0 }}
                        colon={false}
                    >
                        {renderFieldGroup(
                            "Context",
                            <>
                                <Form.Item label="Canvas" style={{ marginBottom: 6 }} labelCol={{ style: compactLabelStyle }}>
                                    <Select
                                        size="small"
                                        disabled={!isCanvasTarget}
                                        style={compactControlStyle}
                                        getPopupContainer={(triggerNode) => triggerNode.parentNode}
                                        options={deviceOptions.map((d) => ({ label: d.label, value: d.value }))}
                                        value={
                                            deviceOptions.find(
                                                (item) =>
                                                    String(item.width) ===
                                                    containerCss.match(/width:\s*([^;]+)/)?.[1]?.replace("px", "") &&
                                                    String(item.height) ===
                                                    containerCss.match(/height:\s*([^;]+)/)?.[1]?.replace("px", "")
                                            )?.value || "Responsible"
                                        }
                                        onChange={(value) => {
                                            const device = deviceOptions.find((d) => d.value === value);
                                            if (!device) return;

                                            if (value === "Responsible") {
                                                setContainerCss("");

                                                return;
                                            }

                                            let newCss = containerCss;

                                            if (device.width) {
                                                newCss = newCss.includes("width:")
                                                    ? newCss.replace(/width:\s*[^;]+;/, `width: ${device.width}px;`)
                                                    : `${newCss}width: ${device.width}px;`;
                                            }

                                            if (device.height) {
                                                newCss = newCss.includes("height:")
                                                    ? newCss.replace(/height:\s*[^;]+;/, `height: ${device.height}px;`)
                                                    : `${newCss}height: ${device.height}px;`;
                                            }

                                            setContainerCss(newCss);
                                        }}
                                        onBlur={() => {
                                            persistCanvasCss(containerCss);
                                        }}
                                    />
                                </Form.Item>

                                <Row gutter={6}>
                                    <Col span={12}>
                                        <Form.Item label="Width (px)" style={{ marginBottom: 6 }} labelCol={{ style: compactLabelStyle }}>
                                            <Input
                                                size="small"
                                                type="number"
                                                disabled={!isCanvasTarget}
                                                style={compactControlStyle}
                                                value={
                                                    (() => {
                                                        const widthMatch = containerCss.match(/width:\s*([^;]+)/)?.[1];
                                                        if (!widthMatch) return "900";
                                                        if (widthMatch.includes("%")) return "";

                                                        return widthMatch.replace("px", "");
                                                    })()
                                                }
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    let newCss = containerCss;

                                                    if (!val) {
                                                        newCss = newCss.replace(/width:\s*[^;]+;?/, "").trim();
                                                    } else {
                                                        newCss = newCss.includes("width:")
                                                            ? newCss.replace(/width:\s*[^;]+;/, `width: ${val}px;`)
                                                            : `${newCss}width: ${val}px;`;
                                                    }

                                                    setContainerCss(newCss);
                                                }}
                                                onBlur={() => persistCanvasCss(containerCss)}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Height (px)" style={{ marginBottom: 0 }} labelCol={{ style: compactLabelStyle }}>
                                            <Input
                                                size="small"
                                                type="number"
                                                disabled={!isCanvasTarget}
                                                style={compactControlStyle}
                                                value={containerCss.match(/height:\s*([^;]+)/)?.[1]?.replace("px", "") || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    let newCss = containerCss;

                                                    if (!val) {
                                                        newCss = newCss.replace(/height:\s*[^;]+;?/, "").trim();
                                                    } else {
                                                        newCss = newCss.includes("height:")
                                                            ? newCss.replace(/height:\s*[^;]+;/, `height: ${val}px;`)
                                                            : `${newCss}height: ${val}px;`;
                                                    }

                                                    setContainerCss(newCss);
                                                }}
                                                onBlur={() => persistCanvasCss(containerCss)}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </>
                        )}

                        {renderFieldGroup(
                            "Raw CSS",
                            <Form.Item label="CSS Style" style={{ marginBottom: 0 }} labelCol={{ style: compactLabelStyle }}>
                                <Input.TextArea
                                    rows={4}
                                    style={{ ...compactControlStyle, padding: 6 }}
                                    disabled={areComponentControlsDisabled || isCanvasTarget}
                                    value={allCssValue}
                                    onChange={(e) => {
                                        const formattedValue = formatCssTextareaValue(e.target.value);
                                        setAllCssValue(formattedValue);
                                    }}
                                    onBlur={(e) => {
                                        const formattedValue = formatCssTextareaValue(e.target.value, true);
                                        setAllCssValue(formattedValue);
                                        updateAllCss(formattedValue);
                                    }}
                                />
                            </Form.Item>
                        )}

                        {renderFieldGroup(
                            "Selection",
                            <>
                                <Form.Item label="Attribute" style={{ marginBottom: 6 }} labelCol={{ style: compactLabelStyle }}>
                                    <Input.TextArea
                                        rows={3}
                                        style={{ ...compactControlStyle, padding: 6 }}
                                        disabled
                                        value={isCanvasTarget ? "Canvas Type: UI Prototype\nEditable Fields: Width, Height" : componentAttributeSummary}
                                        placeholder="No attribute data available for the selected component"
                                    />
                                </Form.Item>

                                <Form.Item label="Component ID" style={{ marginBottom: 0 }} labelCol={{ style: compactLabelStyle }}>
                                    <Input
                                        size="small"
                                        style={compactControlStyle}
                                        disabled
                                        value={isCanvasTarget ? "canvas" : selectedComponent?.id || ""}
                                        placeholder={isCanvasTarget ? "Canvas selected" : "Select a component"}
                                    />
                                </Form.Item>
                            </>
                        )}

                        {renderFieldGroup(
                            "Colors",
                            <>
                                <Form.Item label="Background" style={{ marginBottom: 6 }} labelCol={{ style: compactLabelStyle }}>
                                    <Input
                                        size="small"
                                        type="color"
                                        disabled={areComponentControlsDisabled || isCanvasTarget}
                                        value={getColorInputValue(liveCssValues.background || "")}
                                        style={{ ...compactControlStyle, opacity: liveCssValues.background ? 1 : 0.45, padding: 2, height: 28 }}
                                        onChange={(e) => applyCssPropertyChange("background", e.target.value)}
                                    />
                                </Form.Item>

                                <Form.Item label="Font Color" style={{ marginBottom: 0 }} labelCol={{ style: compactLabelStyle }}>
                                    <Input
                                        size="small"
                                        type="color"
                                        disabled={areComponentControlsDisabled || isCanvasTarget}
                                        value={getColorInputValue(liveCssValues.color || "")}
                                        style={{ ...compactControlStyle, opacity: liveCssValues.color ? 1 : 0.45, padding: 2, height: 28 }}
                                        onChange={(e) => applyCssPropertyChange("color", e.target.value)}
                                    />
                                </Form.Item>
                            </>
                        )}

                        {!isCanvasTarget && (
                            <>
                                {renderFieldGroup(
                                    "Size & Type",
                                    <>
                                        <Row gutter={6}>
                                            <Col span={12}>{renderCssNumberField("Width (px)", "width", "width")}</Col>
                                            <Col span={12}>{renderCssNumberField("Height (px)", "height", "height")}</Col>
                                        </Row>

                                        <Row gutter={6}>
                                            <Col span={12}>{renderCssNumberField("Font Size", "fontSize", "font-size")}</Col>
                                            <Col span={12}>
                                                {renderCssNumberField("Opacity", "opacity", "opacity", {
                                                    px: false,
                                                    min: "0",
                                                    max: "1",
                                                    step: "0.1",
                                                })}
                                            </Col>
                                        </Row>
                                    </>
                                )}

                                {renderFieldGroup(
                                    "Typography",
                                    <>
                                        {renderCssSelectField("Font Style", "fontStyle", "font-style", fontStyleOptions)}
                                        {renderCssSelectField("Font Weight", "fontWeight", "font-weight", fontWeightOptions)}
                                        {renderCssSelectField("Align", "textAlign", "text-align", textAlignOptions)}
                                        {renderCssSelectField("Font", "fontFamily", "font-family", fontFamilyOptions)}
                                    </>
                                )}

                                {renderFieldGroup(
                                    "Border",
                                    <>
                                        <Form.Item label="Color" style={{ marginBottom: 6 }} labelCol={{ style: compactLabelStyle }}>
                                            <Input
                                                size="small"
                                                type="color"
                                                disabled={areComponentControlsDisabled}
                                                value={getColorInputValue(liveCssValues.borderColor || "")}
                                                style={{ ...compactControlStyle, opacity: liveCssValues.borderColor ? 1 : 0.45, padding: 2, height: 28 }}
                                                onChange={(e) => applyCssPropertyChange("border-color", e.target.value)}
                                            />
                                        </Form.Item>

                                        <Row gutter={6}>
                                            <Col span={12}>{renderCssNumberField("Radius", "borderRadius", "border-radius")}</Col>
                                            <Col span={12}>{renderCssNumberField("Width", "borderWidth", "border-width")}</Col>
                                        </Row>

                                        {renderCssSelectField("Style", "borderStyle", "border-style", borderStyleOptions)}
                                    </>
                                )}

                                {renderFieldGroup(
                                    "Padding",
                                    <>
                                        {renderSpacingRow("Top", "paddingTop", "padding-top", "Bottom", "paddingBottom", "padding-bottom")}
                                        {renderSpacingRow("Right", "paddingRight", "padding-right", "Left", "paddingLeft", "padding-left")}
                                    </>
                                )}

                                {renderFieldGroup(
                                    "Margin",
                                    <>
                                        {renderSpacingRow("Top", "marginTop", "margin-top", "Bottom", "marginBottom", "margin-bottom")}
                                        {renderSpacingRow("Right", "marginRight", "margin-right", "Left", "marginLeft", "margin-left")}
                                    </>
                                )}
                            </>
                        )}
                    </Form>
                </div>
            </div>
    );

    if (isDocked) {
        return content;
    }

    return (
        <div className="pointer-events-none fixed inset-0" style={{ zIndex: 2200 }}>
            {content}
        </div>
    );
}
