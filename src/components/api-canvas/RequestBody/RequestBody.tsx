import {Editor} from '@monaco-editor/react';
import {useEffect, useState, useRef} from 'react';

export default function RequestBody({
                                        selectedEndpoint,
                                        formatJsonTrigger = 0,
                                    }) {
    const [editorValue, setEditorValue] = useState("");
    const editorRef = useRef(null);

    useEffect(() => {
        const body = selectedEndpoint?.requestBody || "";
        setEditorValue(body);
    }, [selectedEndpoint?.id, selectedEndpoint?.requestBody]);

    useEffect(() => {
        if (formatJsonTrigger > 0 && editorRef.current) {
            try {
                const currentValue = editorRef.current.getValue();
                if (currentValue && currentValue.trim()) {
                    const parsed = JSON.parse(currentValue);
                    const pretty = JSON.stringify(parsed, null, 2);
                    editorRef.current.setValue(pretty);
                    setEditorValue(pretty);
                }
            } catch (err) {
                // Not valid JSON, skip formatting
            }
        }
    }, [formatJsonTrigger]);

    const handleChange = (value: string) => {
        setEditorValue(value || "");
    };

    const handleEditorDidMount = (editor) => {
        editorRef.current = editor;
    };

    return (
        <div className="p-5">

            <Editor
                height="200px"
                language="json"
                value={editorValue}
                onChange={handleChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: {enabled: false},
                    scrollBeyondLastLine: false,
                    readOnly: true
                }}
            />
        </div>
    );
}
