import {Card, Drawer, Space} from "antd";
import InputParameters from "@/components/api-canvas/Input/ InputParameters.tsx";
import React, {useEffect, useState} from "react";
import useInputColumns from "@/hooks/api-canvas/Input/useInputColumns.tsx";
import {ArrowLeftOutlined, CodeOutlined, FileTextOutlined, SyncOutlined} from "@ant-design/icons";
import RequestBody from "@/components/api-canvas/RequestBody/RequestBody.tsx";
import OperationDescription from "@/components/api-canvas/Operation/OperationDescription.tsx";
import useOperationColumns from "@/hooks/api-canvas/Operation/useOperationColumns.tsx";
import OutputFields from "@/components/api-canvas/Output/OutputFields.tsx";
import useOutputColumns from "@/hooks/api-canvas/Output/useOutputColumns.tsx";
import ResponseBody from "@/components/api-canvas/ResponseBody/ResponseBody.tsx";
import {doc, getDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";

export default React.memo(APICanvasDetailsDrawer, (prevProps, nextProps) => prevProps.open === nextProps.open);
 function APICanvasDetailsDrawer({open, onClose, data, zIndex = 2000}) {
    const [apiData, setApiData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setApiData({});
            setError(null);
            setLoading(false);
            return;
        }

        const resolvedId = data?.id || data?.apiId || data?.canvasId || data?.apiCanvasId;
        
        // If we don't have an id but do have data, at least render what we have
        if (!resolvedId) {
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                setApiData(data);
            } else {
                setError("API Canvas ID not found");
            }
            return;
        }

        // Reset state when fetching new data
        setLoading(true);
        setError(null);
        setApiData({});

        const apiCanvasDocRef = doc(db, "api_canvas", resolvedId);
        getDoc(apiCanvasDocRef)
            .then(res => {
                if (res.exists()) {
                    const apiCanvasData = res.data();
                    setApiData({ id: resolvedId, ...apiCanvasData });
                } else {
                    setError(`API Canvas with ID "${resolvedId}" not found`);
                }
            })
            .catch(err => {
                console.error("Error loading API canvas:", err);
                setError(`Failed to load API Canvas: ${err.message}`);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [open, data]);

    useEffect(() => {
        if (!open) {
            setApiData({});
        }
    }, [open]);
    const inputColumns = useInputColumns({selectedEndpoint: apiData, readOnly: true});

    const operationColumns = useOperationColumns({
        selectedEndpoint: apiData, readOnly: true,
    });

    const outputColumns = useOutputColumns({
        selectedEndpoint: apiData,
        readOnly: true
    });

    return (
        <>

            <Drawer
            open={open}
            onClose={onClose}
            title={
                (() => {
                    const n = apiData?.name || data?.name || data?.apiCanvasName;
                    return n ? `API (${n})` : "API";
                })()
            }
            width={window.innerWidth * 0.8}
            zIndex={zIndex}>
            <>
                {apiData?.name && <>
                    <Space direction="vertical" className="w-full" size="large">
                        <Card
                            headStyle={{background: "rgba(0, 0, 0, 0.02)"}}
                            title={
                                <Space align="center" style={{
                                    width: "100%",
                                    justifyContent: "space-between",

                                }}>
                                    <span>Input Fields</span>
                                </Space>
                            }
                            bodyStyle={{padding: 0}}
                        >
                            {/* Table veya içerik buraya gelecek */}
                            <div style={{minHeight: 150}}>
                                <InputParameters
                                    selectedEndpoint={apiData}
                                    inputColumns={inputColumns}
                                />
                            </div>
                        </Card>
                        <Card
                            headStyle={{background: "rgba(0, 0, 0, 0.02)"}}
                            title={
                                <Space align="center" style={{
                                    width: "100%",
                                    justifyContent: "space-between",
                                }}>
                                    <span>
                                        <CodeOutlined style={{marginRight: 8}}/>Request Body
                                    </span>
                                </Space>
                            }
                            bodyStyle={{padding: 0}}
                        >
                            {/* Table veya içerik buraya gelecek */}
                            <div style={{minHeight: 150}}>
                                <RequestBody
                                    selectedEndpoint={apiData}
                                />
                            </div>
                        </Card>
                        <Card
                            headStyle={{background: "rgba(0, 0, 0, 0.02)"}}
                            title={
                                <Space align="center" style={{
                                    width: "100%",
                                    justifyContent: "space-between",

                                }}>
                                                    <span>
                                                         <FileTextOutlined style={{marginRight: 8}}/>
                                                      Operation Description
                                                    </span>
                                </Space>
                            }
                            bodyStyle={{padding: 0}}
                        >
                            {/* Table veya içerik buraya gelecek */}
                            <div style={{minHeight: 150}}>
                                <OperationDescription
                                    selectedEndpoint={apiData}
                                    operationColumns={operationColumns}
                                />
                            </div>
                        </Card>
                        <Card
                            headStyle={{background: "rgba(0, 0, 0, 0.02)"}}
                            title={
                                <Space align="center" style={{
                                    width: "100%",
                                    justifyContent: "space-between",

                                }}>
                                                    <span>
                                                        <ArrowLeftOutlined style={{marginRight: 8}}/>
                                                      Output Fields
                                                    </span>
                                </Space>
                            }
                            bodyStyle={{padding: 0}}
                        >
                            {/* Table veya içerik buraya gelecek */}
                            <div style={{minHeight: 150}}>
                                <OutputFields
                                    selectedEndpoint={apiData}
                                    outputColumns={outputColumns}
                                />
                            </div>
                        </Card>
                        <Card
                            headStyle={{background: "rgba(0, 0, 0, 0.02)"}}
                            title={
                                <Space align="center" style={{
                                    width: "100%",
                                    justifyContent: "space-between",
                                }}>
                                                    <span>
                                                         <SyncOutlined style={{marginRight: 8}}/>
                                                        Response Body
                                                    </span>
                                </Space>
                            }
                            bodyStyle={{padding: 0}}
                        >
                            {/* Table veya içerik buraya gelecek */}
                            <div style={{minHeight: 150}}>
                                <ResponseBody
                                    selectedEndpoint={apiData}
                                />
                            </div>
                        </Card>
                    </Space>
                </>
                }
                {loading && (
                    <div className="text-gray-500 text-center py-8">
                        Loading API canvas...
                    </div>
                )}
                {error && !loading && (
                    <div className="text-red-500 text-center py-8">
                        {error}
                    </div>
                )}
                {!apiData?.name && !loading && !error && (
                    <div className="text-gray-500 text-center py-8">
                        No API canvas data available
                    </div>
                )}

            </>
        </Drawer>

        </>)
}
