import React, {useEffect, useState} from "react";
import {Button, Drawer, Space} from "antd";
import { CodeOutlined, CopyOutlined, LinkOutlined, UploadOutlined } from "@ant-design/icons";
import AddExternalViewLinkModal from "@/components/ui-canvas/external-view-link/UICanvasAddExternalViewLinkModal.tsx";
import UICanvasExternalLinkUploadImageModal
    from "@/components/ui-canvas/external-view-link/UICanvasExternalLinkUploadImageModal.tsx";
import UICanvasExternalLinkImageClipboardCopyModal
    from "@/components/ui-canvas/external-view-link/UICanvasExternalLinkImageClipboardCopyModal.tsx";
import UICanvasExternalLinkViewTable from "@/components/ui-canvas/external-view-link/UICanvasExternalLinkViewTable.tsx";

export default React.memo(
    UICanvasExternalLinksDrawer,
    (prevProps, nextProps) =>
        prevProps.open === nextProps.open &&
        prevProps.tableData === nextProps.tableData &&
        prevProps.initialAction === nextProps.initialAction
)
 function UICanvasExternalLinksDrawer({open, onClose, tableData, initialAction = null}) {
    const [isOpenAddExternalLinkModal, setIsOpenAddExternalLinkModal] = useState(false);
    const [isOpenAddEmbedCodeModal, setIsOpenAddEmbedCodeModal] = useState(false);
    const [isOpenAddExternalUploadImageModal, setIsOpenAddExternalUploadImageModal] = useState(false);
    const [isOpenAddExternalClipboardImageModal, setIsOpenAddExternalClipboardImageModal] = useState(false);

    useEffect(() => {
        if (!open || !initialAction) {
            return;
        }

        if (initialAction === "external_link") {
            setIsOpenAddExternalLinkModal(true);
            return;
        }

        if (initialAction === "embedded_code") {
            setIsOpenAddEmbedCodeModal(true);
            return;
        }

        if (initialAction === "upload_image") {
            setIsOpenAddExternalUploadImageModal(true);
            return;
        }

        if (initialAction === "clipboard_image") {
            setIsOpenAddExternalClipboardImageModal(true);
        }
    }, [open, initialAction]);

    return (
        <>
            <Drawer
                title="External View Link"
                open={open}
                onClose={onClose}
                width={1120}
                bodyStyle={{paddingTop: 12}}
            >
                <Space style={{marginBottom: 16}} wrap>
                    <Button type="primary" icon={<LinkOutlined />} onClick={() => setIsOpenAddExternalLinkModal(true)}>
                        Add Image URL
                    </Button>
                    <Button type="primary" icon={<CodeOutlined />} onClick={() => setIsOpenAddEmbedCodeModal(true)}>
                        Add Embed Code
                    </Button>
                    <Button type="primary" icon={<UploadOutlined />} onClick={() => setIsOpenAddExternalUploadImageModal(true)}>
                        Upload Image
                    </Button>
                    <Button type="primary" icon={<CopyOutlined />} onClick={() => setIsOpenAddExternalClipboardImageModal(true)}>
                        Upload from Clipboard
                    </Button>
                </Space>

                <UICanvasExternalLinkViewTable tableData={tableData}/>
            </Drawer>

            {/* Modals */}
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
    );
}
