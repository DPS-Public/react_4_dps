import React from "react";
import { Button, Card, Collapse, Dropdown, Select, Space } from "antd";
import type { MenuProps } from "antd";
import { AppstoreOutlined, CodeOutlined, CopyOutlined, LinkOutlined, ShareAltOutlined, UploadOutlined } from "@ant-design/icons";
import UIPrototype from "@/hooks/ui-canvas/ui-prototype/UIPrototype.tsx";
import UIPrototypeCSSInspector, {
  UIPrototypeCSSInspectorBindings,
} from "@/hooks/ui-canvas/ui-prototype/UIPrototypeCSSInspector.tsx";
import UICanvasLinksView from "@/components/ui-canvas/external-view-link/UICanvasLinksView.tsx";
import AddExternalViewLinkModal from "@/components/ui-canvas/external-view-link/UICanvasAddExternalViewLinkModal.tsx";
import UICanvasExternalLinkUploadImageModal from "@/components/ui-canvas/external-view-link/UICanvasExternalLinkUploadImageModal.tsx";
import UICanvasExternalLinkImageClipboardCopyModal from "@/components/ui-canvas/external-view-link/UICanvasExternalLinkImageClipboardCopyModal.tsx";
import type { ComponentJson } from "@/ui-canvas/uic_ui_canvas/types/ComponentJson.interface.ts";
import type { ComponentsJson } from "@/ui-canvas/uic_ui_canvas/types/ComponentsJson.interface.ts";

interface UICanvasUIViewPanelProps {
  activeKey: string | string[];
  onChangeCollapse: (key: string | string[]) => void;
  selectedLink: { id: string } | null;
  setSelectedLink: (val: { id: string }) => void;
  externalLinkData: { title?: string; id?: string }[] | null;
  openUICanvasExternalViewLinksDrawer: (action?: "external_link" | "embedded_code" | "upload_image" | "clipboard_image") => void;
  isShowUIViewCSSColumn: boolean;
  setIsShowUIViewCSSColumn: (fn: (prev: boolean) => boolean) => void;
  selectedUICanvasId: string;
  selectedComponent: unknown;
  setSelectedComponent: (val: unknown) => void;
  openComponentInformationFromPrototype: (component: ComponentJson) => void;
  onToggleCSSPanel: () => void;
  selectedUIInput: unknown;
  readOnly?: boolean;
}

const UICanvasUIViewPanel: React.FC<UICanvasUIViewPanelProps> = ({
  activeKey,
  onChangeCollapse,
  selectedLink,
  setSelectedLink,
  externalLinkData,
  openUICanvasExternalViewLinksDrawer,
  isShowUIViewCSSColumn,
  setIsShowUIViewCSSColumn,
  selectedUICanvasId,
  selectedComponent,
  setSelectedComponent,
  openComponentInformationFromPrototype,
  onToggleCSSPanel,
  selectedUIInput,
  readOnly = false,
}) => {
  type ExternalViewAction = "external_link" | "embedded_code" | "upload_image" | "clipboard_image";
  const [cssInspectorBindings, setCssInspectorBindings] =
    React.useState<UIPrototypeCSSInspectorBindings | null>(null);
  const [isOpenAddExternalLinkModal, setIsOpenAddExternalLinkModal] = React.useState(false);
  const [isOpenAddEmbedCodeModal, setIsOpenAddEmbedCodeModal] = React.useState(false);
  const [isOpenAddExternalUploadImageModal, setIsOpenAddExternalUploadImageModal] = React.useState(false);
  const [isOpenAddExternalClipboardImageModal, setIsOpenAddExternalClipboardImageModal] = React.useState(false);
  const fallbackCssRef = React.useRef<Record<string, string>>({});
  const fallbackCssInspectorBindings = React.useMemo<UIPrototypeCSSInspectorBindings>(() => ({
    allCssString: "",
    componentAttributeSummary: "",
    components: ((selectedUIInput as ComponentsJson) ?? { css: "" }) as ComponentsJson,
    containerCss: "",
    cssRef: fallbackCssRef,
    cssTarget: "component",
    persistPrototypes: async () => undefined,
    selectedComponent: (selectedComponent as ComponentJson | null) ?? null,
    selectedUICanvasId,
    setComponents: () => undefined,
    setContainerCss: () => undefined,
    setSelectedComponent: (setSelectedComponent as React.Dispatch<React.SetStateAction<ComponentJson | null>>),
    setCssTarget: () => undefined,
    updateAllCss: () => undefined,
    updateCss: () => undefined,
  }), [selectedComponent, selectedUICanvasId, selectedUIInput, setSelectedComponent]);
  const activeCssInspectorBindings = cssInspectorBindings ?? fallbackCssInspectorBindings;
  const isUIPrototypeSelected = selectedLink?.id === "ui_prototype";
  const externalLinkTitleCollator = React.useMemo(
    () => new Intl.Collator("az", { sensitivity: "base", numeric: true }),
    []
  );
  const uiPrototypeOptionLabel = (
    <span className="inline-flex items-center gap-2 font-semibold text-black">
      <AppstoreOutlined />
      UI Prototype
    </span>
  );
  const sortedExternalLinkOptions = React.useMemo(
    () =>
      [...(externalLinkData ?? [])]
        .filter((item) => item?.id)
        .sort((a, b) => externalLinkTitleCollator.compare(a?.title ?? "", b?.title ?? ""))
        .map((item) => ({
          label: item?.title ?? "",
          value: item?.id ?? "",
        })),
    [externalLinkData, externalLinkTitleCollator]
  );

  React.useEffect(() => {
    if (!isUIPrototypeSelected) {
      setIsShowUIViewCSSColumn(() => false);
    }
  }, [isUIPrototypeSelected, setIsShowUIViewCSSColumn]);

  const externalViewMenuItems: MenuProps["items"] = [
    {
      key: "external_link",
      label: "Add Image URL",
      icon: <LinkOutlined />,
    },
    {
      key: "embedded_code",
      label: "Add Embed Code",
      icon: <CodeOutlined />,
    },
    {
      key: "upload_image",
      label: "Upload Image",
      icon: <UploadOutlined />,
    },
    {
      key: "clipboard_image",
      label: "Upload from Clipboard",
      icon: <CopyOutlined />,
    },
  ];

  const items = [
    {
      key: "ui-view",
      className: "bg-white",
      collapsible: "icon" as const,
      label: (
        <Space className="flex justify-between items-center w-full">
          <Space direction="horizontal" className="items-center">
            <span className="text-black font-medium">UI View</span>
            <Select
              value={selectedLink?.id}
              onChange={(value) => setSelectedLink({ id: value })}
              showSearch
              optionFilterProp="label"
              optionRender={(option) => {
                const optionValue = String(option.value ?? "");
                if (optionValue === "ui_prototype") {
                  return uiPrototypeOptionLabel;
                }
                return <span>{String(option.label ?? "")}</span>;
              }}
              options={[
                { label: uiPrototypeOptionLabel, value: "ui_prototype" },
                ...sortedExternalLinkOptions,
              ]}
              style={{ width: 220 }}
              listHeight={320}
            />
          </Space>
          <Space>
            {isUIPrototypeSelected && (
              <Button
                type="default"
                className="font-semibold text-[12px]"
                icon={<ShareAltOutlined />}
                disabled={!selectedUICanvasId}
                onClick={() => {
                  if (selectedUICanvasId) {
                    window.open(`/ui-canvas/preview/${selectedUICanvasId}`, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Live Preview
              </Button>
            )}
            {!readOnly && isUIPrototypeSelected && (
              <Button
                type="default"
                className="font-semibold text-[12px]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedLink({ id: "ui_prototype" });
                  setIsShowUIViewCSSColumn(() => true);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                CSS Panel
              </Button>
            )}
            {!readOnly && (
              <Dropdown.Button
                menu={{
                  items: externalViewMenuItems,
                  onClick: ({ key, domEvent }) => {
                    domEvent.preventDefault();
                    domEvent.stopPropagation();
                    if (key === "external_link") {
                      setIsOpenAddExternalLinkModal(true);
                      return;
                    }

                    if (key === "embedded_code") {
                      setIsOpenAddEmbedCodeModal(true);
                      return;
                    }

                    if (key === "upload_image") {
                      setIsOpenAddExternalUploadImageModal(true);
                      return;
                    }

                    if (key === "clipboard_image") {
                      setIsOpenAddExternalClipboardImageModal(true);
                    }
                  },
                }}
                type="primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openUICanvasExternalViewLinksDrawer();
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                Add External View
              </Dropdown.Button>
            )}
          </Space>
        </Space>
      ),
      children: (
        <Card
          variant="borderless"
          styles={{ body: { padding: 0, height: "fit-content" } }}
        >
          {selectedLink?.id === "ui_prototype" ? (
            <UIPrototype
              preview={readOnly}
              selectedUICanvasId={selectedUICanvasId}
              isShowUIViewCSSColumn={isShowUIViewCSSColumn}
              selectedComponent={selectedComponent}
              setSelectedComponent={setSelectedComponent}
              onOpenComponentInformation={readOnly ? undefined : openComponentInformationFromPrototype}
              onToggleCSSPanel={readOnly ? undefined : onToggleCSSPanel}
              renderInternalCSSInspector={false}
              onCssInspectorStateChange={setCssInspectorBindings}
              componentsJson={(selectedUIInput as unknown) ?? {}}
            />
          ) : (
            <UICanvasLinksView
              selectedLink={selectedLink}
              externalLinkData={externalLinkData}
            />
          )}
        </Card>
      ),
    },
  ];

  return (
    <>
      <Collapse
        activeKey={activeKey}
        onChange={onChangeCollapse}
        className="ui-view-collapse"
        items={items}
      />
      {isShowUIViewCSSColumn && isUIPrototypeSelected && !readOnly && (
        <UIPrototypeCSSInspector
          {...activeCssInspectorBindings}
          onClose={() => setIsShowUIViewCSSColumn(() => false)}
        />
      )}
      {!readOnly && (
        <>
          <AddExternalViewLinkModal
            open={isOpenAddExternalLinkModal}
            onClose={() => setIsOpenAddExternalLinkModal(false)}
          />
          <AddExternalViewLinkModal
            open={isOpenAddEmbedCodeModal}
            onClose={() => setIsOpenAddEmbedCodeModal(false)}
            type="embed"
          />
          <UICanvasExternalLinkUploadImageModal
            open={isOpenAddExternalUploadImageModal}
            onClose={() => setIsOpenAddExternalUploadImageModal(false)}
          />
          <UICanvasExternalLinkImageClipboardCopyModal
            open={isOpenAddExternalClipboardImageModal}
            onClose={() => setIsOpenAddExternalClipboardImageModal(false)}
          />
        </>
      )}
    </>
  );
};

export default UICanvasUIViewPanel;
