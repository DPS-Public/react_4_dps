import { useAppSelector } from "@/store";
import { AppstoreOutlined, CalendarOutlined, FileTextOutlined, FilterOutlined, SaveOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Col, DatePicker, Drawer, Form, Input, Row, Select, Typography } from "antd";
import { useContext, useEffect, useMemo } from "react";
import { IssueContext } from "../../context/issueContext";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import dayjs from "dayjs";
const { Option } = Select;
const { Title, Text } = Typography;

const formLabel = (icon: React.ReactNode, label: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#1677ff", display: "inline-flex", alignItems: "center" }}>{icon}</span>
        <span>{label}</span>
    </span>
);

const sectionCardStyle: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    overflow: "hidden",
};

const sectionBodyStyle: React.CSSProperties = {
    padding: "14px 16px",
};

const compactItemStyle: React.CSSProperties = {
    marginBottom: 12,
};

const statusOptions = [
    { value: "draft", label: "Draft", textColor: "#7e22ce", background: "#f3e8ff", borderColor: "#d8b4fe" },
    { value: "waiting", label: "Waiting", textColor: "#92400e", background: "#fef3c7", borderColor: "#fcd34d" },
    { value: "new", label: "New", textColor: "#92400e", background: "#f59e0b", borderColor: "#d97706" },
    { value: "ongoing", label: "Ongoing", textColor: "#166534", background: "#86efac", borderColor: "#22c55e" },
    { value: "closed", label: "Closed", textColor: "#1d4ed8", background: "#93c5fd", borderColor: "#60a5fa" },
    { value: "canceled", label: "Canceled", textColor: "#991b1b", background: "#fecaca", borderColor: "#fca5a5" },
];

const renderStatusBadge = (label: string, textColor: string, background: string, borderColor: string) => (
    <span
        style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 76,
            height: 24,
            padding: "0 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.2,
            textTransform: "uppercase",
            color: textColor,
            background,
            border: `1px solid ${borderColor}`,
            lineHeight: 1,
        }}
    >
        {label}
    </span>
);

export const FilterIssue = ({ data: allTasks }) => {
    const { filter, filterValues, setFilterValues, setTasks, setFilter  , setCountFilter } = useContext(IssueContext);
    const [form] = Form.useForm();
    const { canvasses } = useAppSelector(state => state.auth);
    const { projectUsers: users } = useProjectUsers();
    const assigneesFromBacklog = useMemo(() => {
        if (!allTasks || !Array.isArray(allTasks)) return new Set<string>();
        const assigneeSet = new Set<string>();
        allTasks.forEach(task => {
            if (task?.assignee) {
                assigneeSet.add(task.assignee.toLowerCase().trim());
            }
        });
        return assigneeSet;
    }, [allTasks]);

    // Get unique createdBy users from backlog issues
    const createdByUsersFromBacklog = useMemo(() => {
        if (!allTasks || !Array.isArray(allTasks)) return new Set<string>();
        const createdBySet = new Set<string>();
        allTasks.forEach(task => {
            if (task?.createdBy) {
                createdBySet.add(task.createdBy.toLowerCase().trim());
            }
        });
        return createdBySet;
    }, [allTasks]);

    // Filter users for Assignee dropdown - only those who are assigned to issues
    const assigneeUsers = useMemo(() => {
        if (!users) return [];
        return users.filter((u: any) => {
            if (!u?.uid) return false;
            // Check if this user's uid matches any assignee in backlog
            return assigneesFromBacklog.has(u.uid.toLowerCase().trim());
        });
    }, [users, assigneesFromBacklog]);

    // Filter users for Created By dropdown - only those who created issues
    const createdByUsers = useMemo(() => {
        if (!users) return [];
        return users.filter((u: any) => {
            if (!u?.displayName) return false;
            // Check if this user's displayName matches any createdBy in backlog
            return createdByUsersFromBacklog.has(u.displayName.toLowerCase().trim());
        });
    }, [users, createdByUsersFromBacklog]);

    useEffect(() => {
        if (!filter) return;

        const nextValues: Record<string, any> = { ...(filterValues || {}) };

        if (typeof nextValues.createdAt === "string") {
            nextValues.createdAt = dayjs(nextValues.createdAt);
        }

        if (typeof nextValues.closedDate === "string") {
            nextValues.closedDate = dayjs(nextValues.closedDate);
        }

        form.setFieldsValue(nextValues);
    }, [filter, filterValues, form]);

    const handleFilter = () => {
        const values = form.getFieldsValue()
        const count = Object.entries(values).filter(([_, value]) => {
            if (value === undefined || value === null || value === "") return false;
            if (Array.isArray(value)) return value.length > 0;
            return true;
        }).length;
        
        setCountFilter(count)

        if (values.createdAt) values.createdAt = values.createdAt.format("YYYY-MM-DD");
        if (values.closedDate) values.closedDate = values.closedDate.format("YYYY-MM-DD");
        setFilterValues(values)
        const newArr = allTasks.filter((item) => {
            return Object.entries(values).every(([key, value]) => {
                if (!value) return true;
                if ((key == "createdAt" || key == "closedDate") && typeof value === "string") {
                    if (!item[key]) return false;
                    // Normalize date format for comparison (handle both YYYY-MM-DDTHH:mm:ss and YYYY-MM-DD formats)
                    const itemDate = item[key].split('T')[0];
                    const filterDate = value.split('T')[0];
                    return itemDate === filterDate;
                }
                    if (Array.isArray(value)) {
                        if (!value.length) return true;
                        const itemValue = String(item?.[key] ?? "").toLowerCase();
                        return value.some((entry) => String(entry).toLowerCase() === itemValue);
                    }
                    if (typeof item[key] === "string" && typeof value === "string") {
                        return item[key]?.toLowerCase() === value?.toLowerCase()
                    }
                return item[key] == value;
            });
        });
        setTasks(newArr)
        setFilter(false)
    };
    const handleClear = () => {
        form.resetFields();
        setCountFilter(0);
    };
    return (
        <Drawer
            width="72%"
            title={(
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Title level={4} style={{ margin: 0, color: "#0f172a" }}>Issue Filter</Title>
                </div>
            )}
            onClose={() => setFilter(false)}
            open={filter}
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
                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Button
                        type="primary"
                        onClick={handleFilter}
                        style={{ minWidth: 132, height: 38, borderRadius: 10, boxShadow: "0 8px 18px rgba(22, 119, 255, 0.18)" }}
                    >
                        <SaveOutlined /> Filter
                    </Button>
                    <Button
                        style={{ minWidth: 100, height: 38, borderRadius: 10 }}
                        onClick={handleClear}
                    >
                        Clear
                    </Button>
                    <Button style={{ minWidth: 100, height: 38, borderRadius: 10 }} onClick={() => setFilter(false)}>Cancel</Button>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                        Use one or more fields to filter backlog issues.
                    </Text>
                </div>
            }
        >
            <Form layout="vertical" form={form} requiredMark={false}>
                <Card style={sectionCardStyle} bodyStyle={sectionBodyStyle}>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={8}>
                            <Form.Item name="no" label={formLabel(<FilterOutlined />, "Issue No")} style={compactItemStyle}>
                                <Input size="large" placeholder="Enter issue number" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                            <Form.Item name="status" label={formLabel(<FilterOutlined />, "Status")} style={compactItemStyle}>
                                    <Select mode="multiple" size="large" placeholder="Select status" optionLabelProp="label" allowClear maxTagCount="responsive">
                                    {statusOptions.map((status) => (
                                        <Option
                                            key={status.value}
                                            value={status.value}
                                            label={renderStatusBadge(status.label, status.textColor, status.background, status.borderColor)}
                                        >
                                            {renderStatusBadge(status.label, status.textColor, status.background, status.borderColor)}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                            <Form.Item name="type" label={formLabel(<FilterOutlined />, "Type")} style={compactItemStyle}>
                                <Select size="large" placeholder="Nothing selected">
                                    <Option value="New Request">New Request</Option>
                                    <Option value="Bug">Bug</Option>
                                    <Option value="Change Request">Change Request</Option>
                                    <Option value="Backlog">Backlog</Option>
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item name="description" label={formLabel(<FileTextOutlined />, "Issue Description")} style={compactItemStyle}>
                                <Input size="large" placeholder="Enter issue description" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card style={{ ...sectionCardStyle, marginTop: 14 }} bodyStyle={sectionBodyStyle}>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="assignee" label={formLabel(<UserOutlined />, "Assignee")} style={compactItemStyle}>
                                <Select
                                    size="large"
                                    optionLabelProp="label"
                                    showSearch
                                    allowClear
                                    className="w-full"
                                    placeholder="Select User"
                                    filterOption={(input, option) => {
                                        const user = assigneeUsers?.find((u: any) => u.uid === option?.value);
                                        if (!user) return false;
                                        const searchText = input.toLowerCase().trim();
                                        if (!searchText) return true;
                                        const displayName = (user.displayName || '').toLowerCase();
                                        const email = (user.email || '').toLowerCase();
                                        return displayName.includes(searchText) || email.includes(searchText);
                                    }}
                                    filterSort={(optionA, optionB) => {
                                        const userA = assigneeUsers?.find((u: any) => u.uid === optionA?.value);
                                        const userB = assigneeUsers?.find((u: any) => u.uid === optionB?.value);
                                        if (!userA || !userB) return 0;
                                        const nameA = (userA.displayName || '').toLowerCase();
                                        const nameB = (userB.displayName || '').toLowerCase();
                                        return nameA.localeCompare(nameB);
                                    }}
                                >
                                    {assigneeUsers?.map((u: any, i) => u?.displayName && <Select.Option label={u?.displayName} key={i} value={u.uid}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden">{u?.photoURL ? <img className="w-full h-full object-cover" src={u?.photoURL} /> : u.displayName[0]}</div>
                                            <div className="flex flex-col gap-1">
                                                <span>{u.displayName}</span>
                                                <span className="italic text-gray-500 text-xs">{u.email}</span>
                                            </div>
                                        </div>
                                    </Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                            <Form.Item name="createdBy" label={formLabel(<UserOutlined />, "Created By")} style={compactItemStyle}>
                                <Select
                                    size="large"
                                    optionLabelProp="label"
                                    showSearch
                                    allowClear
                                    className="w-full"
                                    placeholder="Select User"
                                    filterOption={(input, option) => {
                                        const user = createdByUsers?.find((u: any) => u.displayName === option?.value);
                                        if (!user) return false;
                                        const searchText = input.toLowerCase().trim();
                                        if (!searchText) return true;
                                        const displayName = (user.displayName || '').toLowerCase();
                                        const email = (user.email || '').toLowerCase();
                                        return displayName.includes(searchText) || email.includes(searchText);
                                    }}
                                    filterSort={(optionA, optionB) => {
                                        const userA = createdByUsers?.find((u: any) => u.displayName === optionA?.value);
                                        const userB = createdByUsers?.find((u: any) => u.displayName === optionB?.value);
                                        if (!userA || !userB) return 0;
                                        const nameA = (userA.displayName || '').toLowerCase();
                                        const nameB = (userB.displayName || '').toLowerCase();
                                        return nameA.localeCompare(nameB);
                                    }}
                                >
                                    {createdByUsers?.map((u: any, i) => u?.displayName && <Select.Option label={u?.displayName} key={i} value={u.displayName}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden">{u?.photoURL ? <img className="w-full h-full object-cover" src={u?.photoURL} /> : u.displayName[0]}</div>
                                            <div className="flex flex-col gap-1">
                                                <span>{u.displayName}</span>
                                                <span className="italic text-gray-500 text-xs">{u.email}</span>
                                            </div>
                                        </div>
                                    </Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item name="uiCanvas" label={formLabel(<AppstoreOutlined />, "UI Canvas")} style={compactItemStyle}>
                                <Select
                                    size="large"
                                    showSearch={true}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.children ?? "")
                                            .toString()
                                            .toLowerCase()
                                            .includes(input.toLowerCase())
                                    }
                                    filterSort={(optionA, optionB) =>
                                        (optionA?.children ?? "")
                                            .toString()
                                            .toLowerCase()
                                            .localeCompare((optionB?.children ?? "").toString().toLowerCase())
                                    }
                                    placeholder="Nothing selected"
                                >
                                    {canvasses?.map((item, index) => (
                                        <Option key={index} value={item?.label}>
                                            {item?.label}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item name="sprint" label={formLabel(<FilterOutlined />, "Sprint")} style={{ marginBottom: 0 }}>
                                <Select size="large" placeholder="Nothing selected">
                                    <Option value="sprint1">Sprint 1</Option>
                                    <Option value="sprint2">Sprint 2</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card style={{ ...sectionCardStyle, marginTop: 14 }} bodyStyle={sectionBodyStyle}>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="createdAt" label={formLabel(<CalendarOutlined />, "Created Date")} style={{ marginBottom: 0 }}>
                                <DatePicker size="large" className="w-full" format="YYYY-MM-DD" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                            <Form.Item name="closedDate" label={formLabel(<CalendarOutlined />, "Closed Date")} style={{ marginBottom: 0 }}>
                                <DatePicker size="large" className="w-full" format="YYYY-MM-DD" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
            </Form>
        </Drawer>
    );
};
