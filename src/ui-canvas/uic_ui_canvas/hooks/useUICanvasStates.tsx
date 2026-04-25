import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import getAllUI from "../hooks/useGetAllUI.ts"; 
import type { ISelectedUI } from "@/ui-canvas/uic_ui_canvas/types/ISelectedUI.interface.ts";
import type { UIList } from "@/ui-canvas/uic_ui_canvas/types/UIList.interface.ts";
import useUpdateCanvas from "@/ui-canvas/uic_ui_canvas/hooks/useUpdateCanvas.tsx";
import { useSelector } from "react-redux";
import { RootState, setCurrentCanvas, useAppDispatch } from "@/store";
import useUICanvasCreate from "@/ui-canvas/uic_ui_canvas/hooks/useUICanvasCreate.tsx";
import useUICanvasUpdate from "@/ui-canvas/uic_ui_canvas/hooks/useUICanvasUpdate.tsx";
import useUICanvasDelete from "@/ui-canvas/uic_ui_canvas/hooks/canvas-functions/useUICanvasDelete.tsx";
import useUICanvasDuplicate from "@/ui-canvas/uic_ui_canvas/hooks/canvas-functions/useUICanvasDuplicate.tsx";
import useUICanvasInputCreate from "@/ui-canvas/uic_ui_canvas/hooks/input/useUICanvasInputCreate.tsx";
import useUICanvasInputColumns from "./useUICanvasInputColumns.tsx";
import useUICanvasManualDescriptionCreate
    from "@/ui-canvas/uic_ui_canvas/hooks/input/action/manual-description/useUICanvasManualDescriptionCreate.tsx";
import useUICanvasAPICallRelationCreate
    from "@/ui-canvas/uic_ui_canvas/hooks/input/action/api-call/useUICanvasAPICallRelationCreate.tsx";
import { useUICanvasComponentInformationUpdate } from "@/ui-canvas/uic_ui_canvas/hooks/input/action/component-information/useUICanvasComponentInformationUpdate.tsx";
import useUICanvasTemplateDescriptionCreate
    from "@/ui-canvas/uic_ui_canvas/hooks/input/action/template-description/useUICanvasTemplateDescriptionCreate.tsx";
import useUICanvasInputUpdate from "@/ui-canvas/uic_ui_canvas/hooks/input/useUICanvasInputUpdate.tsx";
import useUICanvasAPICallRelationUpdate
    from "@/ui-canvas/uic_ui_canvas/hooks/input/action/api-call/useUICanvasAPICallRelationUpdate.tsx";
import useUICanvasAPIRelationDelete from "@/ui-canvas/uic_ui_canvas/hooks/input/action/api-call/useUICanvasAPIRelationDelete.tsx";
import useUICanvasFormActionCreate from "@/ui-canvas/uic_ui_canvas/hooks/input/action/form-action/useUICanvasFormActionCreate.tsx";
import useUICanvasFormActionUpdate from "@/ui-canvas/uic_ui_canvas/hooks/input/action/form-action/useUICanvasFormActionUpdate.tsx";
import useUICanvasFormActionDelete from "@/ui-canvas/uic_ui_canvas/hooks/input/action/form-action/useUICanvasFormActionDelete.tsx";
import useUICanvasDescriptionsBulkDelete from "@/ui-canvas/uic_ui_canvas/hooks/useUICanvasDescriptionsBulkDelete.tsx";
import useUICanvasCreateBulkIssue from "@/ui-canvas/uic_ui_canvas/hooks/useUICanvasCreateBulkIssue.tsx";
import useUICanvasExternalLinksLoad from "@/ui-canvas/uic_ui_canvas/hooks/external-link/useUICanvasExternalLinksLoad.tsx";
import useUICanvasTemplateDescriptionUpdate
    from "@/ui-canvas/uic_ui_canvas/hooks/input/action/template-description/useUICanvasTemplateDescriptionUpdate.tsx";
import { message, Modal } from "antd";
import useUICanvasInputDelete from "@/ui-canvas/uic_ui_canvas/hooks/input/useUICanvasInputDelete.tsx";
import type { ComponentJson } from "@/ui-canvas/uic_ui_canvas/types/ComponentJson.interface.ts";
import useUICanvasDescriptionUpdate from "@/ui-canvas/uic_ui_canvas/hooks/description/useUICanvasDescriptionUpdate";
import { useUICanvasModalState } from "./useUICanvasModalState";
import { useUICanvasRealtimeSync } from "./useUICanvasRealtimeSync";
import { useUICanvasInputDescriptionMainActions } from "./useUICanvasInputDescriptionMainActions";
import { handleUICanvasInputDescriptionAction } from "../handlers/handleUICanvasInputDescriptionAction";
import { serviceGenerateUICanvas } from "../services/serviceGenerateUICanvas";
import { serviceSaveAIGeneratedCanvas } from "../services/serviceSaveAIGeneratedCanvas";
import { db } from "@/config/firebase.ts";
import { ActionsType } from "@/ui-canvas/uic_ui_canvas/types/ActionsType.enum.ts";
import type { SelectedManualDescriptionCreateInput } from "@/ui-canvas/uic_ui_canvas_actions_manual_description_create_drawer/types/SelectedManualDescriptionCreateInput.interface";
import type { SelectedManualDescriptionAction } from "@/ui-canvas/uic_ui_canvas/types/SelectedManualDescriptionAction.interface";
import type { SelectedComponentInformationInput } from "@/ui-canvas/uic_ui_canvas_actions_component_information_update_drawer/types/SelectedComponentInformationInput.interface";

export function useUICanvasStates({
    openUICanvasActionsManualDescriptionUpdateDrawer,
    forcedCanvasId,
    previewMode = false,
}: {
    openUICanvasActionsManualDescriptionUpdateDrawer?: (
        action: SelectedManualDescriptionAction | null,
    ) => void;
    forcedCanvasId?: string;
    previewMode?: boolean;
} = {}) {
    const safeOpenManualDescriptionUpdateDrawer =
        openUICanvasActionsManualDescriptionUpdateDrawer || (() => undefined);
    const [inputColumns, setInputColumns] = useState<unknown[]>([]);
    const [allUIInputs, setAllUIInputs] = useState<Record<string, unknown>>({});
    const [selectedUI, setSelectedUI] = useState<ISelectedUI>();
    const [selectedUICanvasId, setSelectedUICanvasId] = useState<string>("");
    const [uiList, setUIList] = useState<UIList[]>([]);
    const [description, setDescription] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedDescriptions, setSelectedDescriptions] = useState<unknown[]>([]);
    const [selectedUICanvasInputRows, setSelectedUICanvasInputRows] = useState<Array<{ id: string }>>([]);
    const [externalViewLinkTableData, setExternalViewLinkTableData] = useState<unknown[]>([]);
    const [externalLinkData, setExternalLinkData] = useState<Array<{ id?: string } & Record<string, unknown>> | null>(null);
    const [selectedLink, setSelectedLink] = useState({ id: "ui_prototype" });
    const [isShowIssueStats, setIsShowIssueStats] = useState(false);
    const [isShowUIViewCSSColumn, setIsShowUIViewCSSColumn] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState<ComponentJson | null>(null);
    const [selectedComponentInformationInput, setSelectedComponentInformationInput] =
        useState<SelectedComponentInformationInput | null>(null);
    const [selectedManualDescriptionCreateInput, setSelectedManualDescriptionCreateInput] =
        useState<SelectedManualDescriptionCreateInput | null>(null);
    const latestComponentSelectionRequestRef = useRef(0);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<{
        Api?: unknown;
        CollectionCanvas?: unknown;
        Database?: unknown;
        FormCard?: {
            Config?: Record<string, { description?: string }>;
            Input?: Record<string, unknown>;
        };
    } | null>(null);
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const { getUI } = getAllUI({ setSelectedUI, setUIList, setSelectedUICanvasId, setAllUIInputs, forcedCanvasId });
    const inputDescriptionMainActions = useUICanvasInputDescriptionMainActions(selectedUICanvasInputRows, selectedDescriptions);
    const {
        apiCanvasDrawerData,
        closeAPICanvasDrawer,
        closeBacklogIssueDrawer,
        closeUICanvasActionsAPIRelationDrawer,
        closeUICanvasActionsComponentInformationUpdateDrawer,
        closeUICanvasActionsTemplateDescriptionDrawer,
        closeUICanvasActionsTemplateDescriptionUpdateDrawer,
        closeUICanvasCreateIssueDrawer,
        closeUICanvasExternalViewLinksDrawer,
        closeUICanvasFormActionDrawer,
        closeUICanvasPreviewDrawer,
        closeUICanvasUpdateAPIRelationDrawer,
        closeUICanvasUpdateFormActionDrawer,
        closeUICanvasUpdateInputModal,
        closeUICreateModal,
        closeUIUpdateModal,
        editingUICanvas,
        isOpenAIDrawer,
        isOpenUICanvasActionsAPIRelationDrawer,
        isOpenUICanvasActionsComponentInformationUpdateDrawer,
        isOpenUICanvasActionsManualDescriptionDrawer,
        isOpenUICanvasActionsTemplateDescriptionDrawer,
        isOpenUICanvasActionsTemplateDescriptionUpdateDrawer,
        isOpenUICanvasCreateDescriptionModal,
        isOpenUICanvasCreateFormActionDrawer,
        isOpenUICanvasCreateInputModal,
        isOpenUICanvasCreateIssueDrawer,
        isOpenUICanvasDuplicateModal,
        isOpenUICanvasExternalViewLinksDrawer,
        externalViewLinkInitialAction,
        isOpenUICanvasUpdateAPIRelationDrawer,
        isOpenUICanvasUpdateFormActionDrawer,
        isOpenUICanvasUpdateInputModal,
        isOpenUICreateModal,
        isOpenUIUpdateModal,
        issueDrawerData,
        openUICanvasActionsAPIRelationDrawer,
        openUICanvasActionsComponentInformationUpdateDrawer,
        openUICanvasActionsTemplateDescriptionDrawer,
        openUICanvasActionsTemplateDescriptionUpdateDrawer,
        openUICanvasCreateFormActionDrawer,
        openUICanvasCreateIssueDrawer,
        openUICanvasExternalViewLinksDrawer,
        openUICanvasUpdateAPIRelationDrawer,
        openUICanvasUpdateFormActionDrawer,
        openUICanvasUpdateInputModal,
        openUICreateModal,
        openUIUpdateModal,
        setApiCanvasDrawerData,
        setEditingUICanvas,
        setIsOpenAIDrawer,
        setIsOpenUICanvasActionsManualDescriptionDrawer,
        setIsOpenUICanvasCreateDescriptionModal,
        setIsOpenUICanvasCreateInputModal,
        setIsOpenUICanvasDuplicateModal,
        setIssueDrawerData,
        setUICanvasPreviewDrawerData,
        uiCanvasPreviewDrawerData,
        uiCanvasRef,
    } = useUICanvasModalState();

    useUICanvasExternalLinksLoad(
        setExternalViewLinkTableData,
        setExternalLinkData,
        selectedUICanvasId,
        selectedUI?.projectId,
    )

    const dispatch = useAppDispatch();
    useUICanvasRealtimeSync(
        currentProject,
        getUI,
        setLoading,
        setSelectedUI,
        selectedUICanvasId,
        setSelectedUICanvasId,
        setAllUIInputs,
        setUIList,
        dispatch,
        setCurrentCanvas,
        forcedCanvasId,
    );

    const onChangeUI = (id) => {
        if (!previewMode) {
            localStorage.setItem("currentUI", String(id));
        }
        setSelectedUI(undefined);
        setAllUIInputs({});
        setSelectedUICanvasId(id)
        setSelectedDescriptions([])
    }

    useEffect(() => {
        if (!externalLinkData?.length) {
            setSelectedLink({id: "ui_prototype"});
            return;
        }

        const defaultLink = externalLinkData.find((item) => Boolean(item?.defaultView));
        const nextLinkId = (defaultLink?.id || externalLinkData?.[0]?.id) as string | undefined;

        if (nextLinkId) {
            setSelectedLink({id: nextLinkId});
        }
    }, [externalLinkData]);

    useEffect(() => {
        if (!previewMode) return;
        if (externalLinkData?.length) return;

        const sharedLinks = (selectedUI as any)?.sharedExternalLinks;
        if (!Array.isArray(sharedLinks) || sharedLinks.length === 0) return;

        const normalizedLinks = sharedLinks
            .map((item: any, index: number) => {
                const fallbackId = item?.id || item?.key || `shared_link_${index + 1}`;
                return {
                key: fallbackId,
                id: fallbackId,
                title: item?.title || "",
                type: item?.type || "embedded",
                url: item?.url || item?.image || "",
                image: item?.image || "",
                code: item?.code || "",
                file_name: item?.file_name || "",
                defaultView: Boolean(item?.defaultView),
                order: Number(item?.order || 0),
                lastUpdated: item?.lastUpdated || "",
            }})
            .sort((a: any, b: any) => {
                if (a.defaultView && !b.defaultView) return -1;
                if (!a.defaultView && b.defaultView) return 1;
                return (a.order || 0) - (b.order || 0);
            });

        setExternalLinkData(normalizedLinks);
        setExternalViewLinkTableData(normalizedLinks);
    }, [previewMode, selectedUI, externalLinkData]);

    useEffect(() => {
        if (!previewMode) return;
        if (externalLinkData?.length) return;
        if (!selectedUICanvasId || !selectedUI?.projectId) return;

        const loadExternalLinksForPreview = async () => {
            try {
                const externalLinksRef = doc(db, "external_links", selectedUI.projectId as string);
                const externalLinksSnap = await getDoc(externalLinksRef);
                const links = externalLinksSnap.data()?.links?.[selectedUICanvasId] || {};

                const normalizedLinks = Object.entries(links)
                    .map(([dynamicId, item]: [string, any]) => ({
                        key: item?.id || dynamicId,
                        id: item?.id || dynamicId,
                        title: item?.title || "",
                        type: item?.type || "embedded",
                        url: item?.url || item?.image || "",
                        image: item?.image || "",
                        code: item?.code || "",
                        file_name: item?.file_name || "",
                        defaultView: Boolean(item?.defaultView),
                        order: Number(item?.order || 0),
                        lastUpdated: item?.lastUpdated || "",
                    }))
                    .sort((a: any, b: any) => {
                        if (a.defaultView && !b.defaultView) return -1;
                        if (!a.defaultView && b.defaultView) return 1;
                        return (a.order || 0) - (b.order || 0);
                    });

                if (normalizedLinks.length > 0) {
                    setExternalLinkData(normalizedLinks);
                    setExternalViewLinkTableData(normalizedLinks);
                }
            } catch (error) {
                console.error("Failed to load external links for shared preview", error);
            }
        };

        loadExternalLinksForPreview();
    }, [previewMode, externalLinkData, selectedUICanvasId, selectedUI?.projectId]);

    useEffect(() => {
        if (selectedUI?.description) {
            setDescription(selectedUI.description);
        }
    }, [selectedUI]);


    const {updateCanvas} = useUpdateCanvas({selectedUI});
    const {createUICanvas} = useUICanvasCreate()
    const {updateUICanvas,updateUICanvasName} = useUICanvasUpdate({selectedUI, selectedUICanvasId, uiList})
    const {deleteUICanvas} = useUICanvasDelete({selectedUI, uiList, editingUICanvas});
    const {duplicateUICanvas, steps: duplicateSteps} = useUICanvasDuplicate({selectedUI, uiList, selectedUICanvasId});
    const {createInput} = useUICanvasInputCreate({selectedUI, selectedUICanvasId, uiList});
    const {createDescription} = useUICanvasDescriptionUpdate({selectedUICanvasId});

    const openUICanvasActionsManualDescriptionCreateDrawer = useCallback((input: SelectedManualDescriptionCreateInput | null) => {
        setSelectedManualDescriptionCreateInput(input);
        setIsOpenUICanvasActionsManualDescriptionDrawer(Boolean(input));
    }, [setIsOpenUICanvasActionsManualDescriptionDrawer]);


    const {inputTableData, selectedInput, setSelectedInput, moveRow} = useUICanvasInputColumns({
        readOnly: previewMode,
        uiList,
        selectedUI,
        selectedUICanvasId,
        setApiCanvasDrawerData,
        openUICanvasActionsAPIRelationDrawer,
        openUICanvasActionsComponentInformationUpdateDrawer,
        openUICanvasActionsTemplateDescriptionDrawer,
        openUICanvasActionsManualDescriptionCreateDrawer,
        openUICanvasActionsManualDescriptionUpdateDrawer: safeOpenManualDescriptionUpdateDrawer,
        openUICanvasUpdateInputModal,
        openUICanvasUpdateAPIRelationDrawer,
        openUICanvasCreateFormActionDrawer,
        setUICanvasPreviewDrawerData,
        inputColumns,
        setInputColumns,
        openUICanvasUpdateFormActionDrawer,
        setSelectedDescriptions,
        isShowIssueStats,
        setIssueDrawerData,
        openUICanvasActionsTemplateDescriptionUpdateDrawer,
        selectedDescriptions,
        selectedUICanvasInputRows,
        setSelectedUICanvasInputRows,
    });
    const {updateInput} = useUICanvasInputUpdate({selectedUI, selectedUICanvasId, selectedInput});
    const {updateFormAction} = useUICanvasFormActionUpdate({selectedUICanvasId, selectedInput})
    const {deleteFormAction} = useUICanvasFormActionDelete({selectedUICanvasId, selectedInput})
    const { updateComponentInformation } = useUICanvasComponentInformationUpdate({
        selectedUICanvasId,
    })
    const {createManualDescription} = useUICanvasManualDescriptionCreate({
        selectedUICanvasId,
        selectedInput: selectedManualDescriptionCreateInput,
    });
    const {deleteAPIRelation} = useUICanvasAPIRelationDelete({selectedUICanvasId});
    const {createAPICallRelation} = useUICanvasAPICallRelationCreate({selectedInput, selectedUICanvasId});
    const {createFormAction} = useUICanvasFormActionCreate({selectedInput, selectedUICanvasId});
    const {updateAPICallRelation} = useUICanvasAPICallRelationUpdate({selectedInput, selectedUICanvasId});
    const {templateDescriptionCreate} = useUICanvasTemplateDescriptionCreate({selectedUICanvasId, selectedInput});
    const {templateDescriptionUpdate} = useUICanvasTemplateDescriptionUpdate({selectedUICanvasId, selectedInput});
    const {deleteInput} = useUICanvasInputDelete({selectedUICanvasId});
    const {descriptionsBulkDelete} = useUICanvasDescriptionsBulkDelete({
        selectedUICanvasId,
        selectedUI,
        selectedDescriptions,
        setSelectedDescriptions
    });


    const {createBulkIssue} = useUICanvasCreateBulkIssue({selectedDescriptions, uiList, setSelectedDescriptions, selectedUI});
    const createIssueData = {
        uiCanvas: selectedUICanvasId
    };

    const closeUICanvasActionsManualDescriptionCreateDrawer = useCallback(() => {
        setIsOpenUICanvasActionsManualDescriptionDrawer(false);
        setSelectedManualDescriptionCreateInput(null);
    }, [setIsOpenUICanvasActionsManualDescriptionDrawer]);

    async function addUIEditorAddComponent(component: ComponentJson) {
        const selectionRequestId = ++latestComponentSelectionRequestRef.current;
        const componentInfo = await createInput(" ", component);
        if (selectionRequestId === latestComponentSelectionRequestRef.current && componentInfo?.id) {
            setSelectedComponent(componentInfo);
        }
    }

    async function uiEditorUpdateComponent(component: ComponentJson) {
        await updateInput('', {...component,hasLabel: !["btn","hlink"].includes(component.componentType) })
    }

    async function uiEditorDeleteComponent(componentsIds: string[]) {
        Modal.confirm({
            content: "Are you sure you want to delete this component?",
            onOk: async () => {
                await deleteInput(componentsIds)
                setSelectedComponent(null)
            },
            cancelText: "Cancel",
            okText: "OK",
            onCancel: () => {
            },
        })
    }

    async function uiEditorDuplicateComponent(component: ComponentJson) {
        const selectionRequestId = ++latestComponentSelectionRequestRef.current;
        const componentInfo = await createInput(" ", component);
        if (selectionRequestId === latestComponentSelectionRequestRef.current && componentInfo?.id) {
            setSelectedComponent(componentInfo);
        }
    }

    const openComponentInformationFromPrototype = useCallback((component: ComponentJson | null) => {
        if (!component?.id) {
            return;
        }

        setSelectedComponent(component);
        setSelectedComponentInformationInput({
            id: component.id,
            inputName: component.inputName,
            componentType: component.componentType,
            cellNo: String(component.cellNo ?? "6"),
            content: component.content,
            hasLabel: component.hasLabel,
        });
        openUICanvasActionsComponentInformationUpdateDrawer();
    }, [openUICanvasActionsComponentInformationUpdateDrawer]);

    const handleUIEditorComponentContextAction = useCallback((action: string, component: ComponentJson | null) => {
        if (!component?.id) {
            return;
        }

        const editorSelectedInput = {
            ...component,
            uiName: selectedUI?.label,
        };

        setSelectedComponent(component);
        setSelectedInput(editorSelectedInput);

        switch (action) {
            case ActionsType.COMPONENT_INFORMATION: {
                openComponentInformationFromPrototype(component);
                break;
            }
            case ActionsType.MANUAL_DESCRIPTION: {
                openUICanvasActionsManualDescriptionCreateDrawer(editorSelectedInput);
                break;
            }
            case ActionsType.TEMPLATE_DESCRIPTION: {
                openUICanvasActionsTemplateDescriptionDrawer();
                break;
            }
            case ActionsType.API_RELATION: {
                openUICanvasActionsAPIRelationDrawer();
                break;
            }
            case ActionsType.FORM_ACTION: {
                openUICanvasCreateFormActionDrawer();
                break;
            }
            case ActionsType.RENAME: {
                openUICanvasUpdateInputModal();
                break;
            }
            case ActionsType.DELETE: {
                uiEditorDeleteComponent([component.id]);
                break;
            }
            default:
                break;
        }
    }, [
        openComponentInformationFromPrototype,
        openUICanvasActionsAPIRelationDrawer,
        openUICanvasActionsManualDescriptionCreateDrawer,
        openUICanvasActionsTemplateDescriptionDrawer,
        openUICanvasCreateFormActionDrawer,
        openUICanvasUpdateInputModal,
        selectedUI?.label,
        setSelectedComponent,
        setSelectedInput,
        uiEditorDeleteComponent,
    ]);

    function handleActionInputDescription(action: string) {
        handleUICanvasInputDescriptionAction(
            action,
            selectedUICanvasInputRows,
            deleteInput,
            setSelectedUICanvasInputRows,
            descriptionsBulkDelete,
            openUICanvasCreateIssueDrawer,
        );
    }

    const handleGenerate = async () => {
        if (!selectedUI?.description) return message.error("Please add a description to generate canvas");
        const response = await serviceGenerateUICanvas(selectedUI.description, selectedUICanvasId, selectedUI?.label);
        updateUICanvas(response.input[selectedUICanvasId]);
    }

    // AI / Gemini handlers
    const handleAIDrawerCancel = useCallback(() => {
        setIsOpenAIDrawer(false);
        setAiError(null);
        setAiResult(null);
        setAiLoading(false);
    }, [setIsOpenAIDrawer]);

    const handleAICanvasGenerate = useCallback(async (businessDescription: string) => {
        if (!businessDescription) return message.error("Please enter a description");
        try {
            setAiLoading(true);
            setAiError(null);
            const response = await serviceGenerateUICanvas(businessDescription, selectedUICanvasId, selectedUI?.label);
            setAiResult(response || null);
        } catch (err) {
            console.error("AI Generate Error", err);
            setAiError(String(err?.message ?? err));
        } finally {
            setAiLoading(false);
        }
    }, [selectedUICanvasId, selectedUI?.label]);

    const handleAIDrawerSave = useCallback(async () => {
        if (!aiResult) return message.error("Nothing to save");
        try {
            setAiLoading(true);
            await serviceSaveAIGeneratedCanvas(aiResult, selectedUICanvasId, selectedUI?.description ?? "");
            message.success("AI-generated canvas saved to Firestore");
            setIsOpenAIDrawer(false);
            setAiResult(null);
        } catch (err) {
            console.error("AI Save Error", err);
            message.error("Failed to save AI generated canvas");
        } finally {
            setAiLoading(false);
        }
    }, [aiResult, selectedUICanvasId, selectedUI?.description, setIsOpenAIDrawer]);
    return {
        selectedUI,
        uiList,
        selectedUICanvasId,
        setSelectedUICanvasId,
        isOpenUICreateModal,
        isOpenUIUpdateModal,
        openUICreateModal,
        openUIUpdateModal,
        closeUIUpdateModal,
        closeUICreateModal,
        createUICanvas,
        onChangeUI,
        updateCanvas,
        updateUICanvasName,
        description,
        setDescription,
        loading,
        editingUICanvas,
        setEditingUICanvas,
        deleteUICanvas,
        isOpenUICanvasDuplicateModal,
        setIsOpenUICanvasDuplicateModal,
        isOpenUICanvasCreateInputModal,
        setIsOpenUICanvasCreateInputModal,
        isOpenUICanvasCreateDescriptionModal,
        setIsOpenUICanvasCreateDescriptionModal,
        isOpenUICanvasActionsManualDescriptionDrawer,
        closeUICanvasActionsManualDescriptionCreateDrawer,
        selectedManualDescriptionCreateInput,
        uiCanvasRef,
        duplicateUICanvas,
        duplicateSteps,
        createInput,
        inputColumns,
        createDescription,
        inputTableData,
        createManualDescription,
        selectedInput,
        apiCanvasDrawerData,
        closeAPICanvasDrawer,
        isOpenUICanvasActionsAPIRelationDrawer,
        openUICanvasActionsAPIRelationDrawer,
        closeUICanvasActionsAPIRelationDrawer,
        createAPICallRelation,
        moveRow,
        closeUICanvasActionsComponentInformationUpdateDrawer,
        isOpenUICanvasActionsComponentInformationUpdateDrawer,
        updateComponentInformation,
        isOpenUICanvasActionsTemplateDescriptionDrawer,
        closeUICanvasActionsTemplateDescriptionDrawer,
        openUICanvasActionsTemplateDescriptionDrawer,
        templateDescriptionCreate,
        isOpenUICanvasUpdateInputModal,
        closeUICanvasUpdateInputModal,
        updateInput,
        isOpenUICanvasUpdateAPIRelationDrawer,
        closeUICanvasUpdateAPIRelationDrawer,
        updateAPICallRelation,
        deleteAPIRelation,
        isOpenUICanvasCreateFormActionDrawer,
        closeUICanvasFormActionDrawer,
        createFormAction,
        closeUICanvasPreviewDrawer,
        uiCanvasPreviewDrawerData,
        allUIInputs,
        isOpenUICanvasUpdateFormActionDrawer,
        closeUICanvasUpdateFormActionDrawer,
        updateFormAction,
        deleteFormAction,
        selectedUICanvasInputRows,
        deleteInput,
        selectedDescriptions,
        setSelectedDescriptions,
        setSelectedUICanvasInputRows,
        descriptionsBulkDelete,
        isOpenUICanvasCreateIssueDrawer,
        openUICanvasCreateIssueDrawer,
        closeUICanvasCreateIssueDrawer,
        createBulkIssue,
        openUICanvasExternalViewLinksDrawer,
        isOpenUICanvasExternalViewLinksDrawer,
        externalViewLinkInitialAction,
        closeUICanvasExternalViewLinksDrawer,
        externalLinkData,
        externalViewLinkTableData,
        isShowIssueStats,
        setIsShowIssueStats,
        selectedLink,
        setSelectedLink,
        closeBacklogIssueDrawer,
        issueDrawerData,
        setIssueDrawerData,
        closeUICanvasActionsTemplateDescriptionUpdateDrawer,
        isOpenUICanvasActionsTemplateDescriptionUpdateDrawer,
        templateDescriptionUpdate,
        createIssueData,
        isShowUIViewCSSColumn,
        setIsShowUIViewCSSColumn,
        handleActionInputDescription,
        inputDescriptionMainActions,
        selectedComponent,
        setSelectedComponent,
        selectedComponentInformationInput,
        setSelectedComponentInformationInput,
        openComponentInformationFromPrototype,
        handleUIEditorComponentContextAction,
        addUIEditorAddComponent,
        uiEditorUpdateComponent,
        uiEditorDeleteComponent,
        uiEditorDuplicateComponent,
        handleGenerate
        ,
        isOpenAIDrawer,
        setIsOpenAIDrawer,
        aiLoading,
        aiError,
        aiResult,
        handleAIDrawerCancel,
        handleAIDrawerSave,
        handleAICanvasGenerate
    }
}
