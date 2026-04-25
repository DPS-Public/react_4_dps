import React, {useEffect, useRef, useState} from "react";
import Editor from "@monaco-editor/react";
import {Button, Drawer, Space} from "antd";
import {SaveOutlined} from "@ant-design/icons";

export default function APIResponseBodyDrawer({
                                                  isResponseBodyDrawerVisible,
                                                  setIsResponseBodyDrawerVisible,
                                                  selectedEndpoint,
                                                  updateResponseBody,
                                              }) {
    const [editorValue, setEditorValue] = useState("");

    useEffect(() => {
        setEditorValue(selectedEndpoint?.responseBody || "");
    }, [selectedEndpoint?.id, selectedEndpoint?.responseBody]);


    const onClose = () => setIsResponseBodyDrawerVisible(false);
    const editorRef = useRef(null);

    // Monaco hazır olduğunda referansı alıyoruz
    function handleEditorDidMount(editor) {
        editorRef.current = editor;
    }

    // Beautify butonu
    const handleBeautify = () => {
        const editor = editorRef.current;
        if (editor) {
            try {
                const value = editor.getValue();
                const parsed = JSON.parse(value); // JSON'u parse et
                const pretty = JSON.stringify(parsed, null, 2); // formatlı hale getir
                editor.setValue(pretty);
            } catch (err) {
                alert("Invalid JSON format!");
            }
        }
    };
    const handleChange = (value: string) => {
        setEditorValue(value || "");
    };

    const handleSave = () => {
        updateResponseBody(editorValue);
        setIsResponseBodyDrawerVisible(false)
    };

    return (
        <div style={{position: "relative", borderRadius: 6}}>
            {/* Monaco Editor */}
            <Drawer
                title="Response Body"
                placement="right"
                width={600}
                height={800}
                onClose={onClose}
                open={isResponseBodyDrawerVisible}
                footer={
                    <Space>
                        <Button onClick={handleSave} type="primary" icon={<SaveOutlined/>}>
                            Update
                        </Button>
                        <Button onClick={onClose}>
                            Cancel
                        </Button>
                    </Space>
                }
            >
                <div className="flex justify-between items-end mb-2">
                    <h4 className="font-medium">JSON</h4>
                    <Button onClick={handleBeautify} type="text">
                        Beautify
                    </Button>
                </div>
                <Editor
                    height="400px"
                    defaultLanguage="json"
                    value={editorValue}
                    onMount={handleEditorDidMount}
                    onChange={handleChange}
                    theme="vs-light"
                    options={{
                        minimap: {enabled: false},
                        fontSize: 14,
                        lineNumbers: "on",
                        folding: true,
                        automaticLayout: true,
                    }}
                />
            </Drawer>
        </div>
    );
};
