import { InboxOutlined, LoadingOutlined, SaveOutlined, UploadOutlined, PlusOutlined, EditOutlined, AppstoreOutlined, UserOutlined, FileTextOutlined, FlagOutlined, BugOutlined, BarsOutlined, AlertOutlined, PictureOutlined } from "@ant-design/icons"
import { Button, Drawer, Form, Input, Modal, Select, Space, Upload, UploadProps, Card, Row, Col, Typography, Tag, Radio, Switch } from "antd"
import TextArea from "antd/es/input/TextArea"
import Dragger from "antd/es/upload/Dragger"
import React, { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { useAppSelector } from "@/store"
import { RootState } from "@/store"
import { useProjectUsers } from "@/hooks/useProjectUsers"
import { CreateIssueDrawerProps } from "./types/CreateIssueDrawerProps.interface"
import { useCommonDescriptions } from "./hooks/useCommonDescriptions"
import { useUploadFile } from "./hooks/useUploadFile"
import { useDescriptionModal } from "./hooks/useDescriptionModal"
import { handleDescriptionSelect } from "./handlers/handleDescriptionSelect"
import { handleSaveDescription } from "./handlers/handleSaveDescription"
import useCreateIssue from "./hooks/useCreateIssue"

const { Title, Text } = Typography

const formLabel = (icon: React.ReactNode, label: string, required = false) => (
    <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ color: "#1677ff", display: "inline-flex", alignItems: "center" }}>{icon}</span>
        <span>{label}</span>
        {required ? <span style={{ color: "#ff4d4f", fontWeight: 600, lineHeight: 1 }}>*</span> : null}
    </span>
)

const issueTypeOptions = [
    { value: "New Request", label: "New Request", icon: <PlusOutlined /> },
    { value: "Bug", label: "Bug", icon: <BugOutlined /> },
    { value: "Change Request", label: "Change Request", icon: <EditOutlined /> },
    { value: "Backlog", label: "Backlog", icon: <BarsOutlined /> },
]

const priorityOptions = [
    {
        value: "Urgent",
        label: "Urgent",
        color: "#d9363e",
        background: "#fff1f0",
        border: "#ffccc7",
        activeBackground: "#ffd8d6",
        activeBorder: "#ff7875",
        description: "Immediate attention"
    },
    {
        value: "High",
        label: "High",
        color: "#ad6800",
        background: "#fff7e6",
        border: "#ffd591",
        activeBackground: "#ffe7ba",
        activeBorder: "#faad14",
        description: "Important"
    },
    {
        value: "Normal",
        label: "Normal",
        color: "#1677ff",
        background: "#ffffff",
        border: "#d9d9d9",
        activeBackground: "#e6f4ff",
        activeBorder: "#91caff",
        description: "Planned work"
    },
]

const CREATE_ISSUE_CLOSE_AFTER_INSERT_KEY = "createIssueCloseAfterInsert"
const createIssueDefaultsKey = (projectId?: string) => `createIssueDefaults:${projectId || "global"}`

const readCreateIssueDefaults = (projectId?: string) => {
    try {
        const raw = localStorage.getItem(createIssueDefaultsKey(projectId))
        const parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
        // localStorage can be unavailable in restricted browser contexts.
        return {}
    }
}

const writeCreateIssueDefaults = (projectId: string | undefined, values: { uiCanvas?: string; assignee?: string }) => {
    try {
        const current = readCreateIssueDefaults(projectId)
        localStorage.setItem(createIssueDefaultsKey(projectId), JSON.stringify({ ...current, ...values }))
    } catch {
        // Persisting defaults is best-effort only.
    }
}

const getIssueButtonStyle = (selectedValue: string | undefined, currentValue: string): React.CSSProperties => ({
    flex: "0 1 auto",
    width: "fit-content",
    minWidth: currentValue === "Bug" ? 88 : currentValue === "Backlog" ? 108 : 140,
    textAlign: "center",
    height: 38,
    lineHeight: "36px",
    paddingInline: 14,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: selectedValue === currentValue ? "#1677ff" : "#ffffff",
    color: selectedValue === currentValue ? "#ffffff" : "#0f172a",
    borderColor: "#d9d9d9",
})

const getPriorityButtonStyle = (selectedValue: string | undefined, option: typeof priorityOptions[number]): React.CSSProperties => ({
    flex: "0 1 auto",
    width: "fit-content",
    minWidth: 88,
    textAlign: "center",
    height: 38,
    lineHeight: "36px",
    paddingInline: 14,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: option.color,
    background: selectedValue === option.value ? option.activeBackground : option.background,
    borderColor: selectedValue === option.value ? option.activeBorder : option.border,
    fontWeight: 600,
    boxShadow: selectedValue === option.value ? `inset 0 0 0 1px ${option.activeBorder}` : "none",
    borderRadius: 6,
})

const CreateIssueDrawer: React.FC<CreateIssueDrawerProps> = ({ open, onClose, onIssueCreated, data, selectedNodes, treeData,selectedDescriptions=[]}) => {

    const [form] = Form.useForm()
    const { canvasses } = useAppSelector(state => state.auth)
    const { projectUsers: users } = useProjectUsers()
    const currentProject = useSelector((state: RootState) => state.project.currentProject)

    const { commonDescriptions, loadingDescriptions, loadCommonDescriptions } = useCommonDescriptions(currentProject?.id, open)
    const { uploadedUrlList, setUploadedUrlList, loader, setLoader, uploadFile, clearFiles } = useUploadFile(open)
    const { descriptionModalOpen, editingDescription, newDescriptionName, setNewDescriptionName, openModal, closeModal } = useDescriptionModal()
    const { createIssue } = useCreateIssue()
    const selectedIssueType = Form.useWatch("type", form)
    const selectedPriority = Form.useWatch("priority", form)
    const selectedUiCanvas = Form.useWatch("uiCanvas", form)
    const selectedAssignee = Form.useWatch("assignee", form)
    const [closeAfterInsert, setCloseAfterInsert] = useState(() => {
        try {
            return localStorage.getItem(CREATE_ISSUE_CLOSE_AFTER_INSERT_KEY) === "true"
        } catch {
            return false
        }
    })

    const savedDefaults = useMemo(() => readCreateIssueDefaults(currentProject?.id), [currentProject?.id, open])

    const applyPersistentDefaults = (incomingValues: any = {}) => {
        const nextValues = { ...incomingValues }

        if (!nextValues.uiCanvas && savedDefaults.uiCanvas) {
            nextValues.uiCanvas = savedDefaults.uiCanvas
        }

        if (!nextValues.assignee && savedDefaults.assignee) {
            nextValues.assignee = savedDefaults.assignee
        }

        form.setFieldsValue(nextValues)
    }

    const handleSave = async () => {
        setLoader(true)
        try {
            const values = await form.validateFields()
            writeCreateIssueDefaults(currentProject?.id, {
                uiCanvas: values.uiCanvas,
                assignee: values.assignee,
            })
            const createdIssueIds = await createIssue(values, uploadedUrlList, selectedNodes, treeData,selectedDescriptions)
            if (createdIssueIds.length) {
                onIssueCreated?.(createdIssueIds)
            }
            clearFiles()
            if (closeAfterInsert) {
                onClose()
                form.resetFields()
            } else {
                form.setFieldsValue({
                    description: undefined,
                    commonDescription: undefined,
                })
            }
        } catch (error: any) {
            console.error("Error creating issue:", error)
        } finally {
            setLoader(false)
        }
    }

    useEffect(() => {
        if (open && data) {
            const { uploadedUrlList: urls, ...rest } = data
            applyPersistentDefaults(rest)
            if (Array.isArray(urls)) setUploadedUrlList(urls)
            return
        }

        if (open) {
            applyPersistentDefaults({
                type: "New Request",
                priority: "Normal",
            })
        }
    }, [open, data, savedDefaults.uiCanvas, savedDefaults.assignee])

    useEffect(() => {
        if (!open) return
        writeCreateIssueDefaults(currentProject?.id, {
            ...(selectedUiCanvas ? { uiCanvas: selectedUiCanvas } : {}),
            ...(selectedAssignee ? { assignee: selectedAssignee } : {}),
        })
    }, [currentProject?.id, open, selectedUiCanvas, selectedAssignee])

    const handleCloseAfterInsertChange = (checked: boolean) => {
        setCloseAfterInsert(checked)
        try {
            localStorage.setItem(CREATE_ISSUE_CLOSE_AFTER_INSERT_KEY, String(checked))
        } catch {
            // Persisting the switch is best-effort only.
        }
    }

    const closeDrawer = () => {
        onClose()
        form.resetFields()
        clearFiles()
    }

    const uploadProps: UploadProps = {
        name: "file",
        multiple: true,
        showUploadList: true,
        beforeUpload: (file) => { uploadFile(file, "upload"); return false },
        fileList: uploadedUrlList.filter(i => i.location === "upload").map((item, index) => ({
            uid: String(index), name: item.name || `file-${index}`, status: "done", url: item.url
        })),
        onRemove: (file) => setUploadedUrlList(prev => prev.filter(i => i.url !== file.url))
    }

    const draggerProps: UploadProps = {
        name: "file",
        multiple: true,
        beforeUpload: (file) => { uploadFile(file, "dragger"); return false },
        showUploadList: false,
        accept: "image/*",
        fileList: uploadedUrlList.filter(i => i.location === "dragger").map((item, index) => ({
            uid: String(index), name: item.name || `file-${index}`, status: "done", url: item.url
        })),
        onRemove: (file) => setUploadedUrlList(prev => prev.filter(i => i.url !== file.url))
    }

    const sectionCardStyle: React.CSSProperties = {
        borderRadius: 14,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        overflow: "hidden",
    }

    const sectionBodyStyle: React.CSSProperties = {
        padding: "14px 16px",
    }

    const compactItemStyle: React.CSSProperties = {
        marginBottom: 12,
    }

    const sectionDividerStyle: React.CSSProperties = {
        borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
        paddingBottom: 16,
        marginBottom: 16,
    }

    return (
        <Drawer
            width="72%"
            title={(
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Title level={4} style={{ margin: 0, color: "#0f172a" }}>Create New Issue</Title>
                </div>
            )}
            onClose={closeDrawer}
            open={open}
            styles={{
                header: {
                    paddingBlock: 14,
                    paddingInline: 20,
                    borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
                    background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
                },
                body: {
                    padding: 16,
                    background: "#f5f7fb",
                    height: "calc(100vh - 132px)",
                    overflow: "auto",
                },
                footer: {
                    padding: "12px 16px",
                    borderTop: "1px solid rgba(148, 163, 184, 0.14)",
                    background: "rgba(255, 255, 255, 0.96)",
                    backdropFilter: "blur(10px)",
                },
            }}
            footer={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Space size={10} align="center">
                        <Switch checked={closeAfterInsert} onChange={handleCloseAfterInsertChange} />
                        <Text style={{ color: "#334155", fontSize: 13 }}>Close after insert</Text>
                    </Space>
                    <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Button
                        type="primary"
                        disabled={loader}
                        onClick={handleSave}
                        style={{ minWidth: 132, height: 38, borderRadius: 10, boxShadow: "0 8px 18px rgba(22, 119, 255, 0.18)" }}
                    >
                        {loader ? <LoadingOutlined /> : <><SaveOutlined /> Create Issue</>}
                    </Button>
                    <Button
                        onClick={closeDrawer}
                        style={{ minWidth: 100, height: 38, borderRadius: 10 }}
                    >
                        Cancel
                    </Button>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                        Required fields: UI Canvas, Assignee, Description, Issue Type
                    </Text>
                    </div>
                </div>
            }
        >
            <Form form={form} layout="vertical" initialValues={{ type: "New Request", priority: "Normal" }} requiredMark={false} style={{ height: "100%" }}>
                <Card
                    style={sectionCardStyle}
                    bodyStyle={sectionBodyStyle}
                >
                    <div style={sectionDividerStyle}>
                        <Row gutter={[16, 0]}>
                            <Col span={24}>
                                <Form.Item
                                    label={formLabel(<AppstoreOutlined />, "UI Canvas", true)}
                                    name="uiCanvas"
                                    rules={[{ required: true }]}
                                    style={compactItemStyle}
                                >
                                    <Select
                                        size="large"
                                        showSearch
                                        optionFilterProp="children"
                                        filterOption={(input, option) => (option?.children ?? "").toString().toLowerCase().includes(input.toLowerCase())}
                                        filterSort={(a, b) => (a?.children ?? "").toString().toLowerCase().localeCompare((b?.children ?? "").toString().toLowerCase())}
                                        placeholder="Select Canvas"
                                    >
                                        {canvasses?.map((item, i) => <Select.Option key={i} value={item.id}>{item?.label}</Select.Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={14}>
                                <Form.Item label={formLabel(<UserOutlined />, "Assignee", true)} name="assignee" rules={[{ required: true }]} style={compactItemStyle}>
                                    <Select
                                        size="large"
                                        optionLabelProp="label"
                                        showSearch
                                        placeholder="Select User"
                                        filterOption={(input: any, option: any) => {
                                            const user = users?.find((u: any) => u.uid === option?.value) as any
                                            if (!user) return false
                                            return (user?.displayName || '').toLowerCase().includes(input.toLowerCase())
                                                || (user?.email || '').toLowerCase().includes(input.toLowerCase())
                                        }}
                                        filterSort={(optA: any, optB: any) => {
                                            const uA = users?.find((u: any) => u.uid === optA?.value) as any
                                            const uB = users?.find((u: any) => u.uid === optB?.value) as any
                                            return (uA?.displayName || '').toLowerCase().localeCompare((uB?.displayName || '').toLowerCase())
                                        }}
                                    >
                                        {users?.map((u: any, i) => u?.displayName && (
                                            <Select.Option label={u?.displayName} key={i} value={u.uid}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden">
                                                        {u?.photoURL
                                                            ? <img className="w-full h-full object-cover" src={u?.photoURL} />
                                                            : <span className="-mt-1">{u.displayName[0]}</span>}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span>{u.displayName}</span>
                                                        <span className="italic">{u.email}</span>
                                                    </div>
                                                </div>
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={10}>
                                <Form.Item label={formLabel(<FileTextOutlined />, "Common Descriptions")} name="commonDescription" style={compactItemStyle}>
                                    <Select
                                        size="large"
                                        placeholder="Select common description"
                                        allowClear
                                        optionLabelProp="name"
                                        loading={loadingDescriptions}
                                        onChange={(value) => handleDescriptionSelect(value, commonDescriptions, currentProject?.id, form.getFieldValue, form.setFieldValue)}
                                        dropdownRender={(menu) => (
                                            <>
                                                {menu}
                                                <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                                                    <Button type="text" icon={<PlusOutlined />} onClick={() => openModal()} style={{ width: '100%' }}>
                                                        Add New Description
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    >
                                        {commonDescriptions.map((desc: any) => (
                                            <Select.Option key={desc.id} value={desc.id} name={desc.name}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{desc.name}</span>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<EditOutlined />}
                                                        onClick={(e) => { e.stopPropagation(); openModal(desc) }}
                                                    />
                                                </div>
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    label={formLabel(<EditOutlined />, "Description", true)}
                                    name="description"
                                    rules={[
                                        { required: true, min: 3, max: 1000 },
                                        { validator: (_, v) => (!v || !v.trim()) ? Promise.reject("Description cannot be empty or spaces only!") : Promise.resolve() }
                                    ]}
                                    style={{ marginBottom: 0 }}
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="Explain the issue clearly so implementation can start without extra clarification..."
                                        style={{
                                            borderRadius: 12,
                                            background: "#fbfdff",
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <div style={sectionDividerStyle}>
                        <Row gutter={[16, 0]}>
                            <Col xs={24} md={12}>
                                <Form.Item label={formLabel(<FlagOutlined />, "Issue Type", true)} name="type" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                    <Radio.Group
                                        optionType="button"
                                        buttonStyle="solid"
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            flexWrap: "wrap",
                                            borderRadius: 10,
                                            gap: 0,
                                        }}
                                    >
                                        {issueTypeOptions.map((issueType) => (
                                            <Radio.Button
                                                key={issueType.value}
                                                value={issueType.value}
                                                title={issueType.label}
                                                style={getIssueButtonStyle(selectedIssueType, issueType.value)}
                                            >
                                                <Space size={6} align="center" style={{ whiteSpace: "nowrap", display: "inline-flex" }}>
                                                    {issueType.icon}
                                                    <span>{issueType.label}</span>
                                                </Space>
                                            </Radio.Button>
                                        ))}
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label={formLabel(<AlertOutlined />, "Prioritet")} name="priority" style={{ marginBottom: 0 }}>
                                    <Radio.Group
                                        optionType="button"
                                        buttonStyle="solid"
                                        style={{
                                            width: "fit-content",
                                            display: "inline-flex",
                                            flexWrap: "wrap",
                                            borderRadius: 6,
                                            overflow: "hidden",
                                        }}
                                    >
                                        {priorityOptions.map((option) => (
                                            <Radio.Button
                                                key={option.value}
                                                value={option.value}
                                                title={option.description}
                                                style={getPriorityButtonStyle(selectedPriority, option)}
                                            >
                                                {option.label}
                                            </Radio.Button>
                                        ))}
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <div>
                        <Row gutter={[16, 12]}>
                            <Col span={24}>
                                <Form.Item label={formLabel(<UploadOutlined />, "Upload Image")} style={compactItemStyle}>
                                    <Upload {...uploadProps}>
                                        <Button icon={<UploadOutlined />} style={{ width: "100%", height: 38, borderRadius: 10 }}>
                                            Choose File
                                        </Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item label={formLabel(<PictureOutlined />, "Drag, Drop or Paste Image")} style={{ marginBottom: 0 }}>
                                    <Dragger
                                        {...draggerProps}
                                        style={{
                                            borderRadius: 12,
                                            background: "linear-gradient(180deg, #fcfdff 0%, #f7faff 100%)",
                                            border: "1px dashed rgba(22, 119, 255, 0.25)",
                                            padding: "12px 10px",
                                        }}
                                    >
                                        {uploadedUrlList.some(i => i.type === "image" && i.location === "dragger") ? (
                                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                                {uploadedUrlList.map((elem, index) => (elem.type === "image" && elem.location === "dragger") && (
                                                    <div key={index} className="flex shadow-md border flex-col items-center rounded-xl p-3 justify-center bg-white">
                                                        <img src={elem?.url} alt="Uploaded preview" className="w-40 h-40 object-contain mb-3 rounded-lg shadow-md" />
                                                        <Button danger size="small" onClick={e => { e.stopPropagation(); setUploadedUrlList(prev => prev.filter(i => i.url !== elem.url)) }}>
                                                            Remove
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <>
                                                <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}><InboxOutlined style={{ color: "#1677ff" }} /></p>
                                                <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                                                    Drop image here or paste from clipboard
                                                </p>
                                                <p className="ant-upload-hint" style={{ color: "#64748b", margin: 0, fontSize: 12 }}>
                                                    PNG, JPG and clipboard screenshots are supported.
                                                </p>
                                            </>
                                        )}
                                    </Dragger>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                </Card>
            </Form>

            <Modal
                title={editingDescription ? "Edit Description" : "Add New Description"}
                open={descriptionModalOpen}
                onOk={() => handleSaveDescription(newDescriptionName, currentProject?.id, editingDescription, closeModal, loadCommonDescriptions)}
                onCancel={closeModal}
                okText="Save"
                cancelText="Cancel"
            >
                <Input
                    placeholder="Enter description name (e.g., Testing, Frontend Development)"
                    value={newDescriptionName}
                    onChange={(e) => setNewDescriptionName(e.target.value)}
                    onPressEnter={() => handleSaveDescription(newDescriptionName, currentProject?.id, editingDescription, closeModal, loadCommonDescriptions)}
                    autoFocus
                />
            </Modal>
        </Drawer>
    )
}

export default React.memo(CreateIssueDrawer, (prev, next) => prev.open === next.open)
