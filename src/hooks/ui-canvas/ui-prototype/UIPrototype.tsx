import React, {Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    Button,
    Checkbox,
    Col,
    DatePicker,
    Dropdown,
    Input,
    message,
    Modal,
    Radio,
    Row,
    Select,
    Table,
    TimePicker,
    Typography,
    Upload
} from "antd";
import {DndProvider, useDrag, useDrop} from "react-dnd";
import {doc, getDoc, onSnapshot, updateDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {CloseOutlined, UploadOutlined} from "@ant-design/icons";
import {parseCssString} from "@/utils/ui-canvas/parseCssString.ts";
import {ComponentJson, ComponentsJson} from "@/components/ui-canvas/common/types.ts";
import {HTML5Backend} from "react-dnd-html5-backend";
import UIPrototypeCSSInspector, {
    UIPrototypeCSSInspectorBindings
} from "@/hooks/ui-canvas/ui-prototype/UIPrototypeCSSInspector.tsx";
import {RootState} from "@/store";
import {useSelector} from "react-redux";

const { Text } = Typography;





interface UIDisplayProps {
    componentsJson: ComponentsJson;
    selectedUICanvasId: string;
    isShowUIViewCSSColumn?: boolean;
    containerSurfaceStyle?: React.CSSProperties;
    selectedComponent?: ComponentJson | null,
    setSelectedComponent?: Dispatch<SetStateAction<ComponentJson | null>>
    onOpenComponentInformation?: (component: ComponentJson) => void
    onToggleCSSPanel?: () => void
    renderInternalCSSInspector?: boolean
    onCssInspectorStateChange?: (bindings: UIPrototypeCSSInspectorBindings | null) => void
    getComponentContextMenuItems?: (component: ComponentJson) => Array<{ key: string; label: React.ReactNode; icon?: React.ReactNode } | { type: "divider" }>
    onComponentContextMenuAction?: (actionKey: string, component: ComponentJson) => void
    onRequestClosePopup?: () => void
    preview: boolean
}



const COMPONENT_TYPE = "COMPONENT";
const normalizeValue = (value: unknown) => (value === undefined || value === null ? "" : String(value).trim());
const normalizeComponentType = (componentType?: string) => normalizeValue(componentType).toLowerCase();
const upsertCssDeclaration = (cssString: string, property: string, value: string) => {
    const normalizedProperty = property.trim().toLowerCase();
    const declarations = formatCssMultiline(cssString || "", true)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.toLowerCase().startsWith(`${normalizedProperty}:`));

    if (value.trim()) {
        declarations.push(`${property}: ${value};`);
    }

    return declarations.join("\n");
};
const getNormalizedContentOptions = (content?: string) => {
    const seen = new Set<string>();

    return (content?.split("\n") || [])
        .map((item) => normalizeValue(item))
        .filter((item) => {
            if (!item || seen.has(item)) {
                return false;
            }

            seen.add(item);
            return true;
        });
};
const formatCssMultiline = (css: string, finalize = false) => {
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
const isGroupComponent = (componentType?: string) => ["group", "grp"].includes(normalizeComponentType(componentType));
const isTableComponent = (componentType?: string) => ["table", "tbl"].includes(normalizeComponentType(componentType));
const isLabelComponent = (componentType?: string) => ["label", "lbl"].includes(normalizeComponentType(componentType));
const isSelfLabeledComponent = (componentType?: string) => ["btn", "hlink", "icbox", "img"].includes(normalizeComponentType(componentType));
const isComponentControlTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(target.closest("[data-component-control='true']"));
const getComponentParentKey = (component: ComponentJson) => {
    const fkTableId = normalizeValue(component?.fkTableId);
    const fkGroupId = normalizeValue(component?.fkGroupId);

    if (fkTableId) {
        return `table:${fkTableId}`;
    }

    if (fkGroupId) {
        return `group:${fkGroupId}`;
    }

    return "root";
};
const getContainerLabelStyle = (component: ComponentJson) => {
    const baseStyle = {
        width: "inherit",
        height: "inherit",
        opacity: "inherit",
        borderRadius: "inherit",
        padding: component?.css?.["containerCss"]?.includes("padding") ? "inherit" : "0px",
        margin: component?.css?.["containerCss"]?.includes("margin") ? "inherit" : "0px",
        fontSize: component?.css?.["containerCss"]?.includes("font-size") ? "inherit" : "13px",
        fontWeight: "inherit",
        color: "inherit",
        background: "inherit",
        fontFamily: "inherit",
        fontStyle: "inherit",
    };

    if (isGroupComponent(component.componentType)) {
        return {
            ...baseStyle,
            width: "fit-content",
            alignSelf: "flex-start" as const,
            marginTop: 8,
            marginBottom: 10,
            padding: "4px 10px",
            borderRadius: 10,
            background: "transparent",
            color: "#237804",
            border: "1px solid #b7eb8f",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
        };
    }

    if (isTableComponent(component.componentType)) {
        return {
            ...baseStyle,
            width: "fit-content",
            alignSelf: "flex-start" as const,
            marginTop: 8,
            marginBottom: 10,
            padding: "4px 10px",
            borderRadius: 10,
            background: "transparent",
            color: "#0958d9",
            border: "1px solid #91caff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
        };
    }

    return baseStyle;
};
const hasDefinedStyleValue = (value: unknown) =>
    value !== undefined && value !== null && String(value).trim() !== "";

interface PrototypeFormAction {
    action?: string;
    uiId?: string;
    uiName?: string;
    condition?: string;
}

interface PrototypePopupState {
    open: boolean;
    uiId: string;
    uiName: string;
}

interface EmbeddedCanvasState {
    uiId: string;
    uiName: string;
    components: ComponentsJson;
    containerCss: string;
}


async function updatePrototypes(componentsJson, selectedUICanvasId) {

    const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
    const docSnap = await getDoc(uiCanvasDocRef);
    const docData = docSnap.data();
    const canvasInputs = docData?.input?.[selectedUICanvasId] || {};

    const updatedAllInput = {
        ...docData.input,
        [selectedUICanvasId]: { ...canvasInputs, ...componentsJson }
    };
    try {
        await updateDoc(uiCanvasDocRef, { input: updatedAllInput });
        // message.success("Components updated successfully!");

    } catch (e) {
        console.error(e);
        message.error("Error updating");
    }

}

export default React.memo(
    UIPrototype,
    (prevProps, nextProps) =>
        prevProps.selectedUICanvasId === nextProps.selectedUICanvasId &&
        prevProps.componentsJson === nextProps.componentsJson &&
        prevProps.isShowUIViewCSSColumn === nextProps.isShowUIViewCSSColumn &&
        prevProps.preview === nextProps.preview &&
        prevProps.selectedComponent?.id === nextProps.selectedComponent?.id
)
function UIPrototype({
                                           preview = false,
                                           componentsJson,
                                           selectedUICanvasId,
                                           isShowUIViewCSSColumn = false,
                                           containerSurfaceStyle,
                                           selectedComponent,
                                           setSelectedComponent,
                                           onOpenComponentInformation,
                                           onToggleCSSPanel,
                                           renderInternalCSSInspector = true,
                                           onCssInspectorStateChange,
                                           getComponentContextMenuItems,
                                           onComponentContextMenuAction,
                                           onRequestClosePopup
                                       }: UIDisplayProps) {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const [containerCss, setContainerCss] = useState<string>("width: 900px; height: auto;");
    const cssRef = useRef<Record<string, string>>({});
    const [cssTarget, setCssTarget] = useState<"container" | "component" | "canvas">("container");
    const [components, setComponents] = useState<ComponentsJson>(componentsJson);
    const [activeComponentId, setActiveComponentId] = useState<string | null>(selectedComponent?.id ?? null);
    const [popupState, setPopupState] = useState<PrototypePopupState>({open: false, uiId: "", uiName: ""});
    const [popupComponents, setPopupComponents] = useState<ComponentsJson>({} as ComponentsJson);
    const [popupLayoutCss, setPopupLayoutCss] = useState<string>("width: 900px; height: auto;");
    const [embeddedCanvasState, setEmbeddedCanvasState] = useState<EmbeddedCanvasState | null>(null);
    const [uiCanvasNames, setUICanvasNames] = useState<Record<string, string>>({});
    const lastExternalComponentsRef = useRef("");
    const wasCssPanelOpenRef = useRef(false);

    useEffect(() => {
        if (!currentProject?.id) {
            setUICanvasNames({});
            return;
        }

        const projectDocRef = doc(db, "projects", currentProject.id);

        getDoc(projectDocRef).then((snapshot) => {
            const digitalServiceJson = snapshot.get("digital_service_json");
            const parsedJson = JSON.parse(digitalServiceJson || "{}");
            const uiList = Array.isArray(parsedJson)
                ? parsedJson
                : Object.keys(parsedJson || {}).map((item) => ({
                    id: item,
                    label: parsedJson[item],
                }));

            setUICanvasNames(
                uiList.reduce((accumulator, item) => {
                    if (item?.id) {
                        accumulator[item.id] = item.label || item.name || item.id;
                    }

                    return accumulator;
                }, {} as Record<string, string>)
            );
        }).catch(() => {
            setUICanvasNames({});
        });
    }, [currentProject?.id]);

    useEffect(() => {
        setEmbeddedCanvasState(null);
        setPopupState({open: false, uiId: "", uiName: ""});
        setPopupComponents({} as ComponentsJson);
        setPopupLayoutCss("width: 900px; height: auto;");
        lastExternalComponentsRef.current = "";
    }, [selectedUICanvasId]);

    useEffect(() => {
        const externalComponents = embeddedCanvasState?.components ?? componentsJson;
        const serializedComponents = JSON.stringify(externalComponents || {});

        if (lastExternalComponentsRef.current === serializedComponents) {
            return;
        }

        lastExternalComponentsRef.current = serializedComponents;

        if (Object.keys(externalComponents || {}).length === 0) {
            setComponents({} as ComponentsJson);
            setContainerCss(embeddedCanvasState?.containerCss ?? "width: 900px; height: auto;");
            return;
        }

        const newCss =
            typeof embeddedCanvasState?.containerCss === "string" && embeddedCanvasState.containerCss.trim() !== ""
                ? embeddedCanvasState.containerCss
                : externalComponents?.css && externalComponents.css.trim() !== ""
                    ? externalComponents.css
                : "width: 900px; height: auto;";

        setComponents(externalComponents);
        setContainerCss(newCss);
    }, [componentsJson, embeddedCanvasState]);

    useEffect(() => {
        setActiveComponentId(selectedComponent?.id ?? null);
    }, [selectedComponent?.id]);

    useEffect(() => {
        if (!popupState.open || !popupState.uiId) {
            return;
        }

        const popupDocRef = doc(db, "ui_canvas", popupState.uiId);
        const unsubscribe = onSnapshot(popupDocRef, (snapshot) => {
            const popupData = snapshot.data();
            const popupCanvasInput = popupData?.input?.[popupState.uiId] ?? {};
            setPopupComponents(popupCanvasInput);
            if (typeof popupCanvasInput?.css === "string" && popupCanvasInput.css.trim()) {
                setPopupLayoutCss(popupCanvasInput.css);
            }
            setPopupState((currentState) => {
                if (!currentState.open || currentState.uiId !== popupState.uiId) {
                    return currentState;
                }

                return {
                    ...currentState,
                    uiName: uiCanvasNames[popupState.uiId] || popupData?.name || popupData?.label || currentState.uiName || popupState.uiId,
                };
            });
        });

        return () => unsubscribe();
    }, [popupState.open, popupState.uiId, uiCanvasNames]);

    useEffect(() => {
        if (!embeddedCanvasState?.uiId) {
            return;
        }

        const embeddedDocRef = doc(db, "ui_canvas", embeddedCanvasState.uiId);
        const unsubscribe = onSnapshot(embeddedDocRef, (snapshot) => {
            const nextData = snapshot.data();
            const nextComponents = nextData?.input?.[embeddedCanvasState.uiId] ?? {};
            const nextContainerCss =
                (typeof nextComponents?.css === "string" && nextComponents.css.trim() ? nextComponents.css : "") ||
                "width: 900px; height: auto;";

            setEmbeddedCanvasState((currentState) => {
                if (!currentState || currentState.uiId !== embeddedCanvasState.uiId) {
                    return currentState;
                }

                return {
                    ...currentState,
                    uiName: uiCanvasNames[embeddedCanvasState.uiId] || nextData?.name || nextData?.label || currentState.uiName || embeddedCanvasState.uiId,
                    components: nextComponents,
                    containerCss: nextContainerCss,
                };
            });
        });

        return () => unsubscribe();
    }, [embeddedCanvasState?.uiId, uiCanvasNames]);

    const effectiveSelectedComponent = activeComponentId
        ? components?.[activeComponentId] ?? selectedComponent ?? null
        : null;
    const renderedCanvasId = embeddedCanvasState?.uiId ?? selectedUICanvasId;

    useEffect(() => {
        if (!activeComponentId) {
            return;
        }

        if (selectedComponent?.id && selectedComponent.id !== activeComponentId) {
            return;
        }

        const refreshedComponent = components?.[activeComponentId];

        if (!refreshedComponent) {
            return;
        }

        if (selectedComponent !== refreshedComponent) {
            setSelectedComponent?.(refreshedComponent);
        }
    }, [activeComponentId, components, selectedComponent, setSelectedComponent]);

    useEffect(() => {
        if (isShowUIViewCSSColumn && !wasCssPanelOpenRef.current) {
            setCssTarget("container");
        }

        wasCssPanelOpenRef.current = isShowUIViewCSSColumn;
    }, [isShowUIViewCSSColumn]);

    const moveComponentIntoContainer = (dragId: string, parentComponent: ComponentJson) => {
        setComponents(prev => {
            const newState = { ...prev };
            const dragComp = { ...newState[dragId] };

            if (!dragComp || dragComp.id === parentComponent.id) {
                return prev;
            }

            const isTargetTable = isTableComponent(parentComponent.componentType);
            const isTargetGroup = isGroupComponent(parentComponent.componentType);
            const isDraggingTable = isTableComponent(dragComp.componentType);
            const isDraggingGroup = isGroupComponent(dragComp.componentType);

            if ((isDraggingTable && isTargetGroup) || (isDraggingGroup && isTargetTable)) {
                return prev;
            }

            const sourceParentKey = getComponentParentKey(dragComp);

            dragComp.fkTableId = isTargetTable ? parentComponent.id : null;
            dragComp.fkGroupId = isTargetGroup ? parentComponent.id : null;

            if (dragComp.fkTableId) {
                dragComp.hasLabel = false;
            } else if (!["btn", "hlink"].includes(dragComp.componentType)) {
                dragComp.hasLabel = true;
            }

            newState[dragComp.id] = dragComp;
            const targetParentKey = getComponentParentKey(dragComp);

            const normalizeParentOrder = (parentKey: string) => {
                const siblings = Object.values(newState)
                    .filter((component): component is ComponentJson => {
                        if (!component?.id) {
                            return false;
                        }

                        return getComponentParentKey(component) === parentKey;
                    })
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                siblings.forEach((component, index) => {
                    newState[component.id] = {
                        ...newState[component.id],
                        order: index,
                    };
                });
            };

            if (sourceParentKey !== targetParentKey) {
                normalizeParentOrder(sourceParentKey);
            }

            normalizeParentOrder(targetParentKey);
            updatePrototypes?.(newState, renderedCanvasId);
            return newState;
        });
    };


    const moveComponent = (dragId: string, hoverId: string) => {
        setComponents(prev => {
            const newState = { ...prev };

            const dragComp = { ...newState[dragId] };
            const hoverComp = { ...newState[hoverId] };
            if (!dragComp || !hoverComp) return prev;

            const sourceParentKey = getComponentParentKey(dragComp);
            const isDraggingTable = isTableComponent(dragComp.componentType);
            const isDraggingGroup = isGroupComponent(dragComp.componentType);
            // Hover olunan element table-in ozu olanda onu parent kimi deyil,
            // eyni sekilde group-un ozu olanda da onu parent kimi deyil,
            // oz parent kontekstinde reorder target kimi qebul edirik.
            // Yalniz real table column-u hover olanda fkTableId,
            // group daxilindeki element hover olanda ise fkGroupId dolu olur.
            const nextFkTableId = hoverComp.fkTableId ?? null;
            const nextFkGroupId = hoverComp.fkGroupId ?? null;

            // Table cannot go into group, and group cannot go into table.
            if ((isDraggingTable && nextFkGroupId) || (isDraggingGroup && nextFkTableId)) {
                return prev;
            }

            // Drop olunan komponentin öz yerinə keçmir; onun parent konteynerində birbaşa qabağına yerləşir.
            dragComp.fkTableId = nextFkTableId;
            dragComp.fkGroupId = nextFkGroupId;
            if (dragComp.fkTableId) {
                dragComp.hasLabel = false;
            } else if (!["btn", "hlink"].includes(dragComp.componentType)) {
                dragComp.hasLabel = true;
            }

            newState[dragComp.id] = dragComp;
            const targetParentKey = getComponentParentKey(dragComp);

            const normalizeParentOrder = (parentKey: string, insertBeforeId?: string, itemToInsert?: ComponentJson) => {
                const siblings = Object.values(newState)
                    .filter((component): component is ComponentJson => {
                        if (!component?.id) {
                            return false;
                        }

                        if (itemToInsert && component.id === itemToInsert.id) {
                            return false;
                        }

                        return getComponentParentKey(component) === parentKey;
                    })
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                if (itemToInsert) {
                    const insertIndex = siblings.findIndex((component) => component.id === insertBeforeId);

                    if (insertIndex === -1) {
                        siblings.push(itemToInsert);
                    } else {
                        siblings.splice(insertIndex, 0, itemToInsert);
                    }
                }

                siblings.forEach((component, index) => {
                    newState[component.id] = {
                        ...newState[component.id],
                        order: index,
                    };
                });
            };

            if (sourceParentKey !== targetParentKey) {
                normalizeParentOrder(sourceParentKey);
            }

            normalizeParentOrder(targetParentKey, hoverComp.id, dragComp);
            updatePrototypes?.(newState, renderedCanvasId);
            return newState;
        });
    };

    const handleSelectComponent = useCallback((component: ComponentJson) => {
        setActiveComponentId(component.id);
        setSelectedComponent?.(component);
    }, [setSelectedComponent]);
    const closeFormActionPopup = useCallback(() => {
        setPopupState((currentState) => ({
            ...currentState,
            open: false,
        }));
    }, []);
    const handlePrototypeFormAction = useCallback((formAction?: PrototypeFormAction) => {
        if (!formAction?.action) {
            return;
        }

        if (formAction.action === "show_form" && formAction.uiId) {
            setPopupLayoutCss("width: 900px; height: auto;");
            setPopupState({
                open: true,
                uiId: formAction.uiId,
                uiName: formAction.uiName ?? formAction.uiId,
            });
            return;
        }

        if (formAction.action === "close_form") {
            onRequestClosePopup?.();
            return;
        }

        if (formAction.action === "redirect" && formAction.uiId) {
            setEmbeddedCanvasState({
                uiId: formAction.uiId,
                uiName: formAction.uiName ?? formAction.uiId,
                components: {} as ComponentsJson,
                containerCss: "width: 900px; height: auto;",
            });
        }
    }, [onRequestClosePopup]);
    const handleOpenComponentInformation = useCallback((component: ComponentJson) => {
        setActiveComponentId(component.id);
        setSelectedComponent?.(component);

        if (onOpenComponentInformation) {
            onOpenComponentInformation(component);
            return;
        }

        handleSelectComponent(component);
    }, [handleSelectComponent, onOpenComponentInformation, setSelectedComponent]);
    const renderWithComponentContextMenu = useCallback((component: ComponentJson, content: React.ReactElement) => {
        const menuItems = getComponentContextMenuItems?.(component) ?? [];

        if (preview || menuItems.length === 0) {
            return content;
        }

        return (
            <Dropdown
                trigger={["contextMenu"]}
                menu={{
                    items: menuItems,
                    onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        onComponentContextMenuAction?.(String(key), component);
                    },
                }}
            >
                {content}
            </Dropdown>
        );
    }, [getComponentContextMenuItems, onComponentContextMenuAction, preview]);

    const EmptyContainerDropZone = ({ parentComponent, minHeight = 96 }: { parentComponent: ComponentJson; minHeight?: number }) => {
        const [{ isOverCurrent, canDrop }, drop] = useDrop(() => ({
            accept: COMPONENT_TYPE,
            canDrop: (item: { id: string }) => {
                if (item.id === parentComponent.id) {
                    return false;
                }

                const draggedComponent = components?.[item.id];

                if (!draggedComponent) {
                    return false;
                }

                return !isGroupComponent(draggedComponent.componentType) && !isTableComponent(draggedComponent.componentType);
            },
            drop: (item: { id: string }, monitor) => {
                if (monitor.didDrop()) return;
                moveComponentIntoContainer(item.id, parentComponent);
            },
            collect: (monitor) => ({
                isOverCurrent: monitor.isOver({ shallow: true }),
                canDrop: monitor.canDrop(),
            }),
        }), [parentComponent]);

        const isTargetTable = isTableComponent(parentComponent.componentType);

        return (
            <div
                ref={preview ? undefined : drop}
                className="flex w-full items-center justify-center rounded-md border border-dashed text-[13px]"
                style={{
                    minHeight,
                    padding: 12,
                    color: isOverCurrent && canDrop ? "#1677ff" : "#8c8c8c",
                    background: isOverCurrent && canDrop ? "rgba(22, 119, 255, 0.06)" : "#fafafa",
                    borderColor: isOverCurrent && canDrop ? "#1677ff" : "#d9d9d9",
                    transition: "all 160ms ease",
                }}
            >
                {preview
                    ? null
                    : isTargetTable
                        ? "Drop first column here"
                        : "Drop first input here"}
            </div>
        );
    };

    // === Component Item ===

    const ComponentItem = React.memo(({ component, allComponents, className, showDragHandle = true, allowSelection = true }: {
        component: ComponentJson;
        allComponents: ComponentJson[];
        className?: string;
        showDragHandle?: boolean;
        allowSelection?: boolean;
    }) => {
        const ref = useRef<HTMLDivElement>(null);
        const dragHandleRef = useRef<HTMLButtonElement>(null);
        const [isHovered, setIsHovered] = useState(false);
        const isSelectionEnabled = allowSelection && !preview;
        const canUseDragHandle = !preview && showDragHandle;
        const componentId = normalizeValue(component.id);
        const isEmptyGroupContainer =
            isGroupComponent(component.componentType) &&
            !allComponents.some((child) => normalizeValue(child?.fkGroupId) === componentId);
        const isEmptyTableContainer =
            isTableComponent(component.componentType) &&
            !allComponents.some((child) => normalizeValue(child?.fkTableId) === componentId);
        const shouldHandleAsEmptyContainer = isEmptyGroupContainer || isEmptyTableContainer;

        const [{ isDragging }, drag] = useDrag(() => ({
            canDrag: canUseDragHandle,
            type: COMPONENT_TYPE,
            item: { id: component.id },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
        }));

        const [{ isOverCurrent, draggedId }, drop] = useDrop(() => ({
            accept: COMPONENT_TYPE,
            canDrop: (item: { id: string }) => {
                if (shouldHandleAsEmptyContainer) {
                    const draggedComponent = allComponents.find((child) => child.id === item.id);

                    if (!draggedComponent) {
                        return false;
                    }

                    return item.id !== component.id &&
                        !isGroupComponent(draggedComponent.componentType) &&
                        !isTableComponent(draggedComponent.componentType);
                }

                return item.id !== component.id;
            },
            drop: (item: { id: string }, monitor) => {
                if (!ref.current) return;
                if (monitor.didDrop()) return; // alt elemana bırakıldıysa durdur
                if (item.id === component.id) return;

                if (shouldHandleAsEmptyContainer) {
                    moveComponentIntoContainer(item.id, component);
                    return;
                }

                moveComponent(item.id, component.id);
            },
            collect: (monitor) => ({
                isOverCurrent: monitor.isOver({ shallow: true }),
                draggedId: (monitor.getItem() as { id?: string } | null)?.id,
            }),
        }), [allComponents, component, shouldHandleAsEmptyContainer]);

        if (canUseDragHandle) {
            drop(ref);
            drag(dragHandleRef);
        }

        const customComponentStyle = {
            ...parseCssString(component?.css?.["componentCss"] ?? "")
        };

        const isSelected = effectiveSelectedComponent?.id === component.id;
        const isContainerComponent =
            isGroupComponent(component.componentType) ||
            isTableComponent(component.componentType);

        const isChildSelected = allComponents.some(
            c => c.fkGroupId === component.id && c.id === effectiveSelectedComponent?.id
        );

        const isActiveComponent = isSelectionEnabled && isSelected && !isChildSelected;
        const isHoverHighlight = isSelectionEnabled && isHovered && !isActiveComponent;
        const isDropTarget = Boolean(isOverCurrent && draggedId && draggedId !== component.id);
        const isTableLayoutComponent = isTableComponent(component.componentType) || Boolean(normalizeValue(component.fkTableId));
        const parsedContainerStyle = parseCssString(component?.css?.["containerCss"] ?? "");
        const handleComponentSelection = (event?: { target: EventTarget | null; stopPropagation?: () => void }) => {
            if (!allowSelection) {
                return;
            }

            if (isComponentControlTarget(event?.target ?? null)) {
                return;
            }

            event?.stopPropagation?.();
            handleSelectComponent(component);
        };
        const handleComponentDoubleClick = (event?: { target: EventTarget | null; stopPropagation?: () => void }) => {
            if (!allowSelection) {
                return;
            }

            if (isComponentControlTarget(event?.target ?? null)) {
                return;
            }

            event?.stopPropagation?.();
            handleOpenComponentInformation(component);
        };
        const componentNode = (
            <div
                ref={!preview ? ref : undefined}
                className="relative flex flex-col gap-1.5 rounded-[7px] transition-all"
                style={{
                    width: isTableLayoutComponent
                        ? "100%"
                        : `calc(${(Number(component.cellNo ?? 12) / 12) * 100}% - 8px)`,
                    maxWidth: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                    minHeight: 32,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    opacity: isDragging ? 0.72 : 1,
                    border: isActiveComponent || isHoverHighlight
                        ? `1px solid ${isActiveComponent ? "#1677ff" : "#91caff"}`
                        : "1px solid transparent",
                    transform: isDragging
                        ? "scale(0.985) rotate(0.35deg)"
                        : isDropTarget
                            ? "translateX(10px)"
                            : "translateX(0)",
                    boxShadow: isDragging
                        ? "0 18px 38px rgba(22, 119, 255, 0.18)"
                        : isDropTarget
                            ? "0 10px 24px rgba(22, 119, 255, 0.12)"
                            : isActiveComponent
                                ? "0 0 0 3px rgba(22, 119, 255, 0.16)"
                                : isHoverHighlight
                                    ? "0 0 0 2px rgba(145, 202, 255, 0.35)"
                            : undefined,
                    background: isDropTarget
                        ? "rgba(22, 119, 255, 0.04)"
                        : isActiveComponent
                            ? "rgba(22, 119, 255, 0.05)"
                            : isHoverHighlight
                                ? "rgba(22, 119, 255, 0.02)"
                                : "transparent",
                    transition: "transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease, background 180ms ease",
                }}
                onMouseDown={isSelectionEnabled ? handleComponentSelection : undefined}
                onFocusCapture={isSelectionEnabled ? handleComponentSelection : undefined}
                onDoubleClick={isSelectionEnabled ? handleComponentDoubleClick : undefined}
                onMouseEnter={isSelectionEnabled ? () => setIsHovered(true) : undefined}
                onMouseLeave={isSelectionEnabled ? () => setIsHovered(false) : undefined}
            >
                {isDropTarget && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-2 left-[-8px] top-2 z-20 w-[4px] rounded-full bg-[#1677ff]"
                        style={{
                            boxShadow: "0 0 0 4px rgba(22, 119, 255, 0.12)",
                        }}
                    />
                )}
                {canUseDragHandle && (
                    <div
                        className="absolute right-2 top-2 z-10 flex items-center gap-1 transition-opacity"
                        style={{
                            opacity: isHovered || isDragging ? 1 : 0,
                            pointerEvents: "auto",
                            zIndex: 30,
                        }}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        onClickCapture={(e) => e.stopPropagation()}
                    >
                        <button
                            ref={dragHandleRef}
                            type="button"
                            data-component-control="true"
                            aria-label="Drag component"
                            className="flex h-7 w-6 items-center justify-center rounded-md border border-gray-200 bg-white/95 shadow-sm"
                            style={{
                                cursor: isDragging ? "grabbing" : "grab",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <span
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: 2,
                                }}
                            >
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            width: 3,
                                            height: 3,
                                            borderRadius: "50%",
                                            background: "#8c8c8c",
                                            display: "block",
                                        }}
                                    />
                                ))}
                            </span>
                        </button>
                    </div>
                )}
                <div className="p-1.5 flex flex-col bg-transparent" style={{
                    ...parsedContainerStyle,
                    ...(isContainerComponent
                        ? {
                            height: "auto",
                            minHeight: "unset",
                            maxHeight: "none",
                        }
                        : {}),
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                }}>
                    {component.inputName && (
                        component.hasLabel ||
                        isGroupComponent(component.componentType) ||
                        isTableComponent(component.componentType)
                    ) && !isSelfLabeledComponent(component.componentType) && !isLabelComponent(component.componentType) && (
                        <Text style={getContainerLabelStyle(component)}>
                            {component.inputName}
                        </Text>
                    )}
                    {isGroupComponent(component.componentType)
                        ? renderGroup(component, allComponents, className)
                        : isTableComponent(component.componentType)
                            ? renderTable(component, allComponents)
                            : renderComponent(component, customComponentStyle)
                    }
                </div>
            </div>
        );

        return renderWithComponentContextMenu(component, componentNode);
    });


    const renderComponent = (c: ComponentJson, customComponentStyle: React.CSSProperties = {}) => {
        const uniqueClass = `component-${c.id}`;
        const isInTableCell = Boolean(normalizeValue(c.fkTableId));
        const parsedCanvasStyle = parseCssString(containerCss || "width: 900px; height: auto;");
        const canvasWidth = Number.parseFloat(String(parsedCanvasStyle.width || "").replace("px", "")) || 900;
        const safeCellNo = Number(c.cellNo ?? 12) > 0 ? Number(c.cellNo ?? 12) : 12;
        const tableImageDefaultWidth = `${Math.max(96, Math.round(canvasWidth / safeCellNo))}px`;
        const hasExplicitComponentWidth = hasDefinedStyleValue(customComponentStyle.width);
        const fullWidthComponentStyle: React.CSSProperties = isInTableCell
            ? {
                ...customComponentStyle,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
            }
            : { width: "100%", ...customComponentStyle };
        const normalizedContentOptions = getNormalizedContentOptions(c.content);

        switch (c.componentType) {
            case "txt":
                return <Input className={uniqueClass} defaultValue={c.content} style={fullWidthComponentStyle} />;

            case "cmb":
                return (
                    <Select
                        className={uniqueClass}
                        style={fullWidthComponentStyle}
                        defaultValue={normalizedContentOptions[0]}
                        options={normalizedContentOptions.map((option) => ({ label: option, value: option }))}
                    />
                );

            case "btn": {
                const formAction = (c as ComponentJson & { formAction?: PrototypeFormAction }).formAction;
                return <Button className={`whitespace-normal shrink-0 h-auto min-h-[30px] ${uniqueClass} `
                }
                               type="primary"
                               style={customComponentStyle}
                               onClick={(event) => {
                                   event.stopPropagation();
                                   handlePrototypeFormAction(formAction);
                               }}
                >{c.content || c.inputName || "Button"}</Button>;
            }

            case "txa":
                if (typeof document !== "undefined") {
                    const textAreaStyleTagId = `style-${uniqueClass}`;

                    if (!document.getElementById(textAreaStyleTagId)) {
                        const styleTag = document.createElement("style");
                        styleTag.id = textAreaStyleTagId;
                        styleTag.innerHTML = `
                            .${uniqueClass},
                            .${uniqueClass}.ant-input-textarea,
                            .${uniqueClass} textarea {
                                width: 100% !important;
                                max-width: 100% !important;
                                min-width: 0 !important;
                                display: block !important;
                                box-sizing: border-box !important;
                            }
                        `;
                        document.head.appendChild(styleTag);
                    }
                }

                return (
                    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
                        <Input.TextArea
                            className={uniqueClass}
                            rows={2}
                            defaultValue={c.content}
                            style={{
                                ...customComponentStyle,
                                width: "100%",
                                maxWidth: "100%",
                                minWidth: 0,
                                display: "block",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>
                );

            case "rbtn":
                return (
                    <Radio.Group className={uniqueClass} defaultValue={normalizedContentOptions[0]} style={customComponentStyle}>
                        {normalizedContentOptions.map((option) => (
                            <Radio key={`${c.id}-${option}`} value={option}>{option}</Radio>
                        ))}
                    </Radio.Group>
                );
            case"irbtn":
                return (
                    <Radio className={uniqueClass} defaultChecked style={customComponentStyle}>{c.content || ''}</Radio>
                );

            case "cbox":
                return (
                    <Checkbox.Group className={uniqueClass} defaultValue={normalizedContentOptions[0] ? [normalizedContentOptions[0]] : []} style={customComponentStyle}>
                        {normalizedContentOptions.map((option) => (
                            <Checkbox key={`${c.id}-${option}`} value={option}>{option}</Checkbox>
                        ))}
                    </Checkbox.Group>
                );

            case "icbox":
                return (
                    <span className={`${uniqueClass} inline-flex items-center gap-2`} style={customComponentStyle}>
                        <Checkbox defaultChecked />
                        <span>{normalizeValue(c.inputName) || normalizeValue(c.content)}</span>
                    </span>
                );

            case "date":
                return <DatePicker className={uniqueClass} style={fullWidthComponentStyle} />;

            case "time":
                return <TimePicker className={uniqueClass} style={fullWidthComponentStyle} />;

            case "lbl":
                return (
                    <label
                        className={uniqueClass}
                        style={{
                            display: "block",
                            marginTop: normalizeValue(c.fkTableId) ? 0 : 22,
                            ...customComponentStyle,
                        }}
                    >
                        {normalizeValue(c.content) || normalizeValue(c.inputName)}
                    </label>
                );

            case "file":
                return (
                    <Upload className={uniqueClass}>
                        <Button icon={<UploadOutlined />} style={customComponentStyle}>
                            {c.content || "Upload File"}
                        </Button>
                    </Upload>
                );

            case "hlink":
                return (
                    <a
                        href={normalizeValue(c.content) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={uniqueClass}
                        style={customComponentStyle}
                    >
                        {normalizeValue(c.inputName) || normalizeValue(c.content) || "Link"}
                    </a>
                );

            case "img":
                return (
                    <img
                        src={c.content || "https://via.placeholder.com/120x80?text=Image"}
                        alt={c.inputName || "image"}
                        className={uniqueClass}
                        style={{
                            width: isInTableCell
                                ? (hasExplicitComponentWidth ? customComponentStyle.width : tableImageDefaultWidth)
                                : (hasExplicitComponentWidth ? customComponentStyle.width : "100%"),
                            maxWidth: "100%",
                            height: "auto",
                            borderRadius: 6,
                            display: "block",
                            objectFit: "contain",
                            ...customComponentStyle,
                        }}
                    />
                );

            case "ytube":
                return (
                    <iframe
                        width="100%"
                        height="200"
                        src={`https://www.youtube.com/embed/${c.content || ""}`}
                        title="YouTube video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className={uniqueClass}
                        style={customComponentStyle}
                    />
                );

            // table ve group renderComponent tarafından yönetilmiyor
            case "tbl":
            case "table":
            case "group":
            case "grp":
                return null;

            default:
                return <div className={uniqueClass} style={customComponentStyle}>{c.content}</div>;
        }
    };



    const getLinkedChildren = (allComponents: ComponentJson[], parent: ComponentJson, relationKey: "fkGroupId" | "fkTableId") => {
        const parentId = normalizeValue(parent.id);

        return allComponents.filter((child) => {
            const relationValue = normalizeValue(child?.[relationKey]);

            if (!relationValue) {
                return false;
            }

            return relationValue === parentId;
        });
    };

    const renderGroup = (component: ComponentJson, allComponents: ComponentJson[], className) => {
        const children = getLinkedChildren(allComponents, component, "fkGroupId").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return (
            <div className={`flex flex-wrap gap-2.5 p-1  ${className}`}>
                {children.length === 0 && <EmptyContainerDropZone parentComponent={component} minHeight={88} />}
                {children.map(c => (
                    <ComponentItem key={c.id} component={c} allComponents={allComponents} />
                ))}
            </div>
        );
    };

    const TableColumnHeader = ({ columnComponent }: { columnComponent: ComponentJson }) => {
        const headerRef = useRef<HTMLDivElement>(null);
        const dragHandleRef = useRef<HTMLButtonElement>(null);
        const [isHovered, setIsHovered] = useState(false);

        const [{ isDragging }, drag] = useDrag(() => ({
            canDrag: !preview,
            type: COMPONENT_TYPE,
            item: { id: columnComponent.id },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
        }));

        const [{ isOverCurrent, draggedId }, drop] = useDrop(() => ({
            accept: COMPONENT_TYPE,
            drop: (item: { id: string }, monitor) => {
                if (!headerRef.current) return;
                if (monitor.didDrop()) return;
                if (item.id === columnComponent.id) return;

                moveComponent(item.id, columnComponent.id);
            },
            collect: (monitor) => ({
                isOverCurrent: monitor.isOver({ shallow: true }),
                draggedId: (monitor.getItem() as { id?: string } | null)?.id,
            }),
        }));

        if (!preview) {
            drop(headerRef);
            drag(dragHandleRef);
        }

        const isDropTarget = Boolean(isOverCurrent && draggedId && draggedId !== columnComponent.id);
        const isSelected = effectiveSelectedComponent?.id === columnComponent.id;
        const isSelectionEnabled = !preview;
        const isHoverHighlight = isSelectionEnabled && isHovered && !isSelected;
        const handleHeaderSelection = (event?: { target: EventTarget | null; stopPropagation?: () => void }) => {
            if (isComponentControlTarget(event?.target ?? null)) {
                return;
            }

            event?.stopPropagation?.();
            handleSelectComponent(columnComponent);
        };
        const handleHeaderDoubleClick = (event?: { target: EventTarget | null; stopPropagation?: () => void }) => {
            if (isComponentControlTarget(event?.target ?? null)) {
                return;
            }

            event?.stopPropagation?.();
            handleOpenComponentInformation(columnComponent);
        };

        const headerNode = (
            <div
                ref={headerRef}
                className="relative flex min-h-8 items-center pr-7"
                style={{
                    opacity: isDragging ? 0.72 : 1,
                    border: isSelectionEnabled && (isSelected || isHoverHighlight)
                        ? `1px solid ${isSelected ? "#1677ff" : "#91caff"}`
                        : "1px solid transparent",
                    transform: isDragging
                        ? "scale(0.985)"
                        : isDropTarget
                            ? "translateX(8px)"
                            : "translateX(0)",
                    transition: "transform 180ms ease, opacity 180ms ease, background 180ms ease",
                    background: isDropTarget
                        ? "rgba(22, 119, 255, 0.05)"
                        : isSelectionEnabled && isSelected
                            ? "rgba(22, 119, 255, 0.07)"
                            : isHoverHighlight
                                ? "rgba(22, 119, 255, 0.03)"
                                : undefined,
                    boxShadow: isSelectionEnabled && isSelected
                        ? "0 0 0 2px rgba(22, 119, 255, 0.14)"
                        : isHoverHighlight
                            ? "0 0 0 1px rgba(145, 202, 255, 0.35)"
                            : undefined,
                    borderRadius: 8,
                }}
                onMouseDown={isSelectionEnabled ? handleHeaderSelection : undefined}
                onFocusCapture={isSelectionEnabled ? handleHeaderSelection : undefined}
                onDoubleClick={isSelectionEnabled ? handleHeaderDoubleClick : undefined}
                onMouseEnter={isSelectionEnabled ? () => setIsHovered(true) : undefined}
                onMouseLeave={isSelectionEnabled ? () => setIsHovered(false) : undefined}
            >
                {isDropTarget && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-1 left-[-8px] top-1 w-[4px] rounded-full bg-[#1677ff]"
                        style={{
                            boxShadow: "0 0 0 4px rgba(22, 119, 255, 0.12)",
                        }}
                    />
                )}
                <span>{columnComponent.inputName || " "}</span>
                {!preview && (
                    <div
                        className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 transition-opacity"
                        style={{
                            opacity: isHovered || isDragging ? 1 : 0,
                            pointerEvents: "auto",
                            zIndex: 30,
                        }}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        onClickCapture={(e) => e.stopPropagation()}
                    >
                        <button
                            ref={dragHandleRef}
                            type="button"
                            data-component-control="true"
                            aria-label="Drag table column"
                            className="flex h-6 w-5 items-center justify-center rounded-md border border-gray-200 bg-white/95 shadow-sm"
                            style={{
                                cursor: isDragging ? "grabbing" : "grab",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <span
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: 2,
                                }}
                            >
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            width: 3,
                                            height: 3,
                                            borderRadius: "50%",
                                            background: "#8c8c8c",
                                            display: "block",
                                        }}
                                    />
                                ))}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        );

        return renderWithComponentContextMenu(columnComponent, headerNode);
    };

    const renderTable = (component: ComponentJson, allComponents: ComponentJson[]) => {
        const children = getLinkedChildren(allComponents, component, "fkTableId").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const tableClassName = `prototype-table-${component.id}`;
        const tableStyleTagId = `style-${tableClassName}`;

        if (typeof document !== "undefined" && !document.getElementById(tableStyleTagId)) {
            const styleTag = document.createElement("style");
            styleTag.id = tableStyleTagId;
            styleTag.innerHTML = `
                .${tableClassName} {
                    width: 100%;
                    max-width: 100%;
                }

                .${tableClassName} .ant-spin-nested-loading,
                .${tableClassName} .ant-spin-container,
                .${tableClassName} .ant-table,
                .${tableClassName} .ant-table-wrapper {
                    width: 100%;
                    max-width: 100%;
                }

                .${tableClassName} .ant-table-container {
                    border: 1px solid #d9d9d9;
                    border-radius: 10px;
                    overflow: hidden;
                    background: #ffffff;
                }

                .${tableClassName} .ant-table-thead > tr > th {
                    background: #fafafa !important;
                    border-right: 1px solid #d9d9d9 !important;
                    border-bottom: 1px solid #d9d9d9 !important;
                    padding: 10px 12px !important;
                    vertical-align: top;
                }

                .${tableClassName} .ant-table-thead > tr > th:last-child {
                    border-right: none !important;
                }

                .${tableClassName} .ant-table-tbody > tr > td {
                    background: #ffffff;
                    border-right: 1px solid #f0f0f0 !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                    padding: 10px 12px !important;
                    vertical-align: top;
                }

                .${tableClassName} .ant-table-tbody > tr > td:last-child {
                    border-right: none !important;
                }
            `;
            document.head.appendChild(styleTag);
        }

        const columns = children.map(c => ({
            title: <TableColumnHeader columnComponent={c} />,
            dataIndex: c.id,
            key: c.id,
            render: (content) => {
                return <ComponentItem
                    key={c.id}
                    component={{...c, ...(content && {content}), hasLabel: false}}
                    allComponents={allComponents}
                    showDragHandle={false}
                    allowSelection={false}
                />
            },
        }));
        const inputs = children.filter(c => ["txt", "txa", "lbl"].includes(c.componentType));

        const linesByInput = inputs.map(c =>
            c.content?.trim()?.split("\n").filter(Boolean) || []
        );

        const maxLen = Math.max(1, ...linesByInput.map(arr => arr.length));

        const childrenWithContent = Array.from({length: maxLen}, (_, i) => {
            const item: Record<string, string> = {};

            inputs.forEach((c, idx) => {
                item[c.id] = linesByInput[idx][i] || "";
            });
            return item;
        });

        const data = children.length > 0
            ? (inputs.length > 0 ? childrenWithContent : [{}]).map((item, index) => ({
                ...item,
                key: `${component.id}-row-${index}`,
            }))
            : [];
        if (children.length === 0) {
            return (
                <div
                    style={{
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        overflowX: "auto",
                        overflowY: "hidden",
                    }}
                >
                    <EmptyContainerDropZone parentComponent={component} minHeight={140} />
                </div>
            );
        }
        return (
            <div
                style={{
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    overflowX: "auto",
                    overflowY: "hidden",
                }}
            >
                <Table
                    className={tableClassName}
                    style={{ width: "100%", maxWidth: "100%" }}
                    columns={columns}
                    dataSource={data}
                    rowKey="key"
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: "max-content" }}
                />
            </div>
        )
    };

    const updateCss = (property: string, value: string) => {
        if (cssTarget === "canvas" || !effectiveSelectedComponent) return;

        setComponents(prev => {
            const id = effectiveSelectedComponent.id;
            const targetKey = cssTarget === "container" ? "containerCss" : "componentCss";
            const oldCss = prev[id]?.css?.[targetKey] || "";
            const newCss = upsertCssDeclaration(oldCss, property, value);

            if (newCss === formatCssMultiline(oldCss, true)) {
                return prev;
            }

            const data = {
                ...prev,
                [id]: {
                    ...prev[id],
                    css: {
                        ...prev[id]?.css,
                        [targetKey]: newCss,
                    },
                },
            };
            updatePrototypes(data, renderedCanvasId);
            return data;
        });
    };

    const updateAllCss = (newCss: string) => {
        if (cssTarget === "canvas" || !effectiveSelectedComponent) return;

        const normalizedCss = formatCssMultiline(newCss, true);

        setComponents(prev => {
            const id = effectiveSelectedComponent.id;
            const targetKey = cssTarget === "container" ? "containerCss" : "componentCss";
            const previousCss = prev[id]?.css?.[targetKey] || "";

            if (formatCssMultiline(previousCss, true) === normalizedCss) {
                return prev;
            }

            const data = {
                ...prev,
                [id]: {
                    ...prev[id],
                    css: {
                        ...prev[id]?.css,
                        [targetKey]: normalizedCss,
                    },
                },
            };

            updatePrototypes(data, renderedCanvasId);
            return data;
        });
    };

    const getCssValue = (property: string, target = cssTarget) => {
        if (target === "canvas") {
            return containerCss.match(new RegExp(`${property}:\\s*([^;]+)`))?.[1] || "";
        }

        if (!effectiveSelectedComponent) return "";
        const targetKey = target === "container" ? "containerCss" : "componentCss";
        const cssString = components?.[effectiveSelectedComponent?.id]?.css?.[targetKey] || "";
        return cssString.match(new RegExp(`${property}:\\s*([^;]+)`))?.[1] || "";
    };
    const getAllCss = (target = cssTarget) => {
        if (target === "canvas") {
            let cssString = containerCss || "";

            cssString = cssString
                .split("\n")
                .map(s => s.trim())
                .filter(Boolean)
                .map(s => s.endsWith(";") ? s : s + ";")
                .join("\n");

            return cssString;
        }

        if (!effectiveSelectedComponent) return "";

        const targetKey = target === "container" ? "containerCss" : "componentCss";
        const cssString = components?.[effectiveSelectedComponent?.id]?.css?.[targetKey] || "";
        return formatCssMultiline(cssString, true);
    };

    const currentAllCss = getAllCss(cssTarget);
    const parsedCssEntries = useMemo(
        () => parseCssString(currentAllCss) as Record<string, string>,
        [currentAllCss]
    );

    useEffect(() => {
        cssRef.current = {
            ...parsedCssEntries,
            allCss: currentAllCss,
            width: parsedCssEntries.width?.replace("px", "") || "",
            height: parsedCssEntries.height?.replace("px", "") || "",
            fontSize: parsedCssEntries.fontSize?.replace("px", "") || "",
            borderRadius: parsedCssEntries.borderRadius?.replace("px", "") || "",
            borderWidth: parsedCssEntries.borderWidth?.replace("px", "") || "",
            paddingTop: parsedCssEntries.paddingTop?.replace("px", "") || "",
            paddingBottom: parsedCssEntries.paddingBottom?.replace("px", "") || "",
            paddingLeft: parsedCssEntries.paddingLeft?.replace("px", "") || "",
            paddingRight: parsedCssEntries.paddingRight?.replace("px", "") || "",
            marginTop: parsedCssEntries.marginTop?.replace("px", "") || "",
            marginBottom: parsedCssEntries.marginBottom?.replace("px", "") || "",
            marginLeft: parsedCssEntries.marginLeft?.replace("px", "") || "",
            marginRight: parsedCssEntries.marginRight?.replace("px", "") || "",
            background: parsedCssEntries.background || "",
            color: parsedCssEntries.color || "",
            borderColor: parsedCssEntries.borderColor || "",
            opacity: parsedCssEntries.opacity || "",
            fontWeight: parsedCssEntries.fontWeight || "",
            fontStyle: parsedCssEntries.fontStyle || "",
            textAlign: parsedCssEntries.textAlign || "",
            fontFamily: parsedCssEntries.fontFamily || "",
            borderStyle: parsedCssEntries.borderStyle || "",
        };
    }, [cssTarget, currentAllCss, parsedCssEntries, effectiveSelectedComponent?.id]);
    const orderedComponents = useMemo(
        () => Object.values(components)
            .filter((item): item is ComponentJson => Boolean(item && typeof item === "object" && "id" in item && item.id))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [components]
    );

    const rootComponents = useMemo(
        () => orderedComponents.filter((component) => !normalizeValue(component.fkGroupId) && !normalizeValue(component.fkTableId)),
        [orderedComponents]
    );
    const componentAttributeSummary = useMemo(() => {
        if (!effectiveSelectedComponent) return "";

        return [
            `Input Name: ${effectiveSelectedComponent.inputName || ""}`,
            `Component Type: ${effectiveSelectedComponent.componentType || ""}`,
            `Cell No: ${effectiveSelectedComponent.cellNo ?? ""}`,
            `Group ID: ${effectiveSelectedComponent.fkGroupId || ""}`,
            `Table ID: ${effectiveSelectedComponent.fkTableId || ""}`,
        ].join("\n");
    }, [effectiveSelectedComponent]);

    const cssInspectorBindings = useMemo<UIPrototypeCSSInspectorBindings>(() => ({
        allCssString: currentAllCss,
        componentAttributeSummary,
        components,
        containerCss,
        cssRef,
        cssTarget,
        persistPrototypes: updatePrototypes,
        selectedComponent: effectiveSelectedComponent,
        selectedUICanvasId: renderedCanvasId,
        setComponents,
        setContainerCss,
        setSelectedComponent: (setSelectedComponent ?? (() => undefined)) as Dispatch<SetStateAction<ComponentJson | null>>,
        setCssTarget,
        updateAllCss,
        updateCss,
    }), [
        componentAttributeSummary,
        components,
        containerCss,
        cssTarget,
        currentAllCss,
        effectiveSelectedComponent,
        renderedCanvasId,
        setSelectedComponent,
    ]);

    const popupContainerCss = useMemo(() => {
        const popupCss = popupComponents?.css;
        return typeof popupCss === "string" && popupCss.trim()
            ? popupCss
            : popupLayoutCss;
    }, [popupComponents?.css, popupLayoutCss]);

    const popupCanvasWidth = useMemo(() => {
        const parsedPopupCanvasStyle = parseCssString(popupContainerCss);
        const rawWidth = String(parsedPopupCanvasStyle.width ?? "").replace("px", "");
        const numericWidth = Number.parseFloat(rawWidth);

        return Number.isFinite(numericWidth) && numericWidth > 0 ? numericWidth : 900;
    }, [popupContainerCss]);

    const popupCanvasHeight = useMemo(() => {
        const parsedPopupCanvasStyle = parseCssString(popupContainerCss);
        const rawHeight = String(parsedPopupCanvasStyle.height ?? "").replace("px", "");
        const numericHeight = Number.parseFloat(rawHeight);

        return Number.isFinite(numericHeight) && numericHeight > 0 ? numericHeight : null;
    }, [popupContainerCss]);

    const popupModalWidth = useMemo(() => {
        if (typeof window === "undefined") {
            return popupCanvasWidth;
        }

        return Math.min(window.innerWidth - 32, popupCanvasWidth);
    }, [popupCanvasWidth]);

    useEffect(() => {
        onCssInspectorStateChange?.(cssInspectorBindings);

        return () => {
            onCssInspectorStateChange?.(null);
        };
    }, [cssInspectorBindings, onCssInspectorStateChange]);

    return (
        <>
            <DndProvider backend={HTML5Backend}>
                <div
                    className={`relative overflow-x-auto overflow-y-visible ${preview ? "flex justify-center" : "w-full"}`}
                >
                    <Row
                        className="shadow-prototype rounded-md"
                        style={
                            preview
                                ? {
                                    width: "fit-content",
                                    minWidth: 0,
                                    maxWidth: "100%",
                                }
                                : {
                                    width: "max-content",
                                    minWidth: "100%",
                                    maxWidth: "none",
                                }
                        }
                    >
                        <Col flex="none" className="text-[13px]" style={{ minWidth: 0 }}>
                            <div
                                style={{
                                    ...parseCssString(containerCss || "width: 900px; height: auto;"),
                                    ...containerSurfaceStyle,
                                    transition: "all 0.3s",
                                }}
                                className="overflow-x-auto overflow-y-visible rounded-[5px]"
                            >
                                {rootComponents.length > 0 && (
                                    <div className="flex flex-wrap gap-0 px-3 border border-gray-200 shadow-sm rounded-md overflow-hidden min-w-0">
                                        {rootComponents.map(c => (
                                                <ComponentItem
                                                    key={c.id}
                                                    component={c}
                                                    allComponents={orderedComponents}
                                                    className={`${["group", "grp"].includes(c.componentType) ? "bg-[#f6f6f6] rounded-[5px]" : ""}`}
                                                />
                                            ))}
                                    </div>
                                )}
                            </div>
                        </Col>
                    </Row>

                    {renderInternalCSSInspector && isShowUIViewCSSColumn && (
                        <UIPrototypeCSSInspector
                            {...cssInspectorBindings}
                            onClose={onToggleCSSPanel}
                        />
                    )}
                </div>
            </DndProvider>
            <Modal
                open={popupState.open}
                title={
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            width: "100%",
                        }}
                    >
                        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: "24px" }}>
                            {popupState.uiName || ""}
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={closeFormActionPopup}
                            style={{
                                width: 28,
                                height: 28,
                                minWidth: 28,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "rgba(0, 0, 0, 0.45)",
                            }}
                        />
                    </div>
                }
                closable={false}
                width={popupModalWidth}
                centered
                footer={null}
                onCancel={closeFormActionPopup}
                afterOpenChange={(open) => {
                    if (open) {
                        return;
                    }

                    setPopupState({open: false, uiId: "", uiName: ""});
                    setPopupComponents({} as ComponentsJson);
                    setPopupLayoutCss("width: 900px; height: auto;");
                }}
                destroyOnClose
                zIndex={2600}
                styles={{
                    header: {
                        paddingInline: 5,
                        paddingBlock: 5,
                        marginBottom: 0,
                        minHeight: 36,
                    },
                    body: {
                        padding: 5,
                        overflowX: "hidden",
                        width: popupCanvasWidth,
                        height: popupCanvasHeight ?? "auto",
                        minHeight: popupCanvasHeight ?? undefined,
                        maxWidth: "100%",
                    },
                    content: {
                        overflow: "hidden",
                        padding: 0,
                    },
                }}
            >
                <div
                    className="flex justify-center overflow-hidden"
                    style={{
                        width: popupCanvasWidth,
                        height: popupCanvasHeight ?? "auto",
                        maxWidth: "100%",
                    }}
                >
                    <UIPrototype
                        preview={true}
                        selectedUICanvasId={popupState.uiId}
                        componentsJson={popupComponents ?? {}}
                        isShowUIViewCSSColumn={false}
                        containerSurfaceStyle={{
                            width: "100%",
                            ...(popupCanvasHeight ? { height: "100%" } : {}),
                        }}
                        onRequestClosePopup={closeFormActionPopup}
                    />
                </div>
            </Modal>
        </>
    );
}
