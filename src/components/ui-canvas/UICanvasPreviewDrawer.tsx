import { LoadingOutlined } from "@ant-design/icons";
import { Drawer } from "antd";
import React, { Suspense } from "react";

const UICanvas = React.lazy(() => import("@/ui-canvas/uic_ui_canvas/uicUICanvas"));

export default React.memo(
    UICanvasPreviewDrawer,
    (prevProps, nextProps) =>
        prevProps.open === nextProps.open &&
        prevProps.data?.id === nextProps.data?.id
);

function UICanvasPreviewDrawer({ open, onClose, data, zIndex = 2100 }) {
    const previewTitle = data?.name
        ? `UI Canvas Preview - ${data.name}`
        : "UI Canvas Preview";

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={previewTitle}
            width="90vw"
            zIndex={zIndex}
            destroyOnClose
            styles={{ body: { padding: 0, height: "calc(100vh - 120px)", overflow: "auto" } }}
        >
            {open && data?.id ? (
                <Suspense
                    fallback={
                        <div className="grid min-h-[320px] place-items-center">
                            <LoadingOutlined className="text-3xl text-gray-400" />
                        </div>
                    }
                >
                    <UICanvas
                        previewMode={true}
                        forcedCanvasId={data.id}
                        onClosePreview={onClose}
                    />
                </Suspense>
            ) : null}
        </Drawer>
    );
}
