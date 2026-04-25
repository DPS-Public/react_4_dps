import { SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Select, message } from "antd";
import TextArea from "antd/es/input/TextArea";
import { useContext, useEffect, useState } from "react";
import { IssueContext } from "../../context/issueContext";
import services from "../../services/backlogService";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAppSelector } from "@/store";

const ApiRelations = ({ setCheckedRow, checkedRow, onUpdated }: { setCheckedRow: (v: any[]) => void; checkedRow: any[]; onUpdated?: () => void | Promise<void> }) => {
    const { currentProject, api, setApi, setDisabled } = useContext(IssueContext);
    const currentUser = useAppSelector((state: any) => state.auth.currentUser);
    const [form] = Form.useForm();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!currentProject?.id) return;

        const loadApiCanvases = async () => {
            setLoading(true);
            try {
                // Get api_json from project document
                const projectDoc = doc(db, "projects", currentProject.id);
                const project = await getDoc(projectDoc);
                const apiJsonString = project.get("api_json");
                const apiJson = apiJsonString ? JSON.parse(apiJsonString) : {};
                const apiJsonKeys = Object.keys(apiJson);

                // Get all API canvases from api_canvas collection
                const apiCanvasDoc = await getDocs(collection(db, "api_canvas"));
                const apiCanvasList: any[] = [];

                if (!apiCanvasDoc.empty) {
                    apiCanvasDoc.forEach(item => {
                        if (apiJsonKeys.includes(item.id)) {
                            const canvasData = item.data();
                            // Use name from api_canvas document, fallback to api_json value
                            // Priority: canvasData.name > apiJson[item.id] > skip if both are IDs
                            let name = canvasData?.name;
                            
                            // If name from api_canvas is missing or is the same as ID, try api_json
                            if (!name || name === item.id || name.trim() === '') {
                                name = apiJson[item.id];
                            }
                            
                            // Only add if we have a meaningful name (not just ID)
                            // Check if name is different from ID and not empty
                            if (name && name !== item.id && name.trim() !== '' && !name.startsWith('T3')) {
                                apiCanvasList.push({
                                    id: item.id,
                                    name: name,
                                    label: name
                                });
                            } else if (name && name !== item.id && name.trim() !== '') {
                                // If name exists and is different from ID, add it even if it starts with T3
                                // (some names might legitimately start with T3)
                                apiCanvasList.push({
                                    id: item.id,
                                    name: name,
                                    label: name
                                });
                            }
                        }
                    });
                }
                
                // Sort by name for better UX
                apiCanvasList.sort((a, b) => {
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                setData(apiCanvasList);
            } catch (err) {
                console.error("Error loading API canvases:", err);
            } finally {
                setLoading(false);
            }
        };

        loadApiCanvases();
    }, [currentProject]);

    const handleSave = async () => {
        const values = await form.getFieldsValue();
        if (checkedRow?.length) {
            // Parse API name and ID from the selected value
            let apiCanvasName = values.api;
            let apiCanvasId = values.api;
            
            if (values.api && values.api.includes("T")) {
                const parts = values.api.split("T");
                apiCanvasName = parts[0];
                apiCanvasId = parts[1] || parts[0];
            }
            
            await Promise.all(
                checkedRow.map(async (row) => {
                    // Add API relation
                    await services.addApiRelations(currentProject.id, row, values.description, values.api);
                    
                    // Add history entry
                    try {
                        await services.addIssueHistory(currentProject.id, row, {
                            action: "added API Relation",
                            user: currentUser?.displayName || currentUser?.email || "Unknown",
                            userId: currentUser?.uid || "",
                            details: {
                                apiName: apiCanvasName,
                                apiId: apiCanvasId,
                                description: values.description || ""
                            }
                        });
                    } catch (historyError) {
                        console.error("Error adding API relation history:", historyError);
                        // Don't fail the operation if history fails
                    }
                })
            );
            
            message.success("API Relations added successfully");
        }
        if (onUpdated) {
            await onUpdated();
        }
        setApi(false);
        setDisabled(true);
        form.resetFields();
        setCheckedRow([]);
    };

    return (
        <Drawer
            title="Add API Relations"
            closable={{ "aria-label": "Custom Close Button" }}
            open={api}
            onClose={() => setApi(false)}
            footer={[
                <div className="flex items-center gap-1" key="footer">
                    <Button onClick={handleSave} type="primary">
                        <SaveOutlined /> Create
                    </Button>
                    <Button onClick={() => setApi(false)}>Cancel</Button>
                </div>,
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="api" label="API">
                    <Select 
                        className="w-full" 
                        placeholder="Select API" 
                        loading={loading}
                        showSearch
                        optionLabelProp="label"
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {data?.map((apiCanvas, i) => (
                            <Select.Option 
                                key={apiCanvas.id || i} 
                                value={`${apiCanvas?.name || apiCanvas?.label || apiCanvas?.id}T${apiCanvas?.id}`}
                                label={apiCanvas?.name || apiCanvas?.label || apiCanvas?.id}
                            >
                                {apiCanvas?.name || apiCanvas?.label || apiCanvas?.id}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="description" label="Description">
                    <TextArea rows={10} />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default ApiRelations;
