import {Button, Checkbox, Col, Divider, Drawer, Form, Input, Row, Space, Typography} from "antd";
import {SaveOutlined} from "@ant-design/icons";
import React, {useEffect, useState} from "react";
import type {CheckboxChangeEvent} from "antd/es/checkbox";

const {Text, Title} = Typography;

const checkboxGroup = [
    {id: "is_mandatory", label: "Is Mandatory"},
    {id: "is_unique", label: "Is Unique"},
    {id: "is_editable", label: "Is Editable"},
    {id: "is_not_editable", label: "Is Not Editable"},
    {id: "is_integer", label: "Is Integer"},
    {id: "is_float", label: "Is Float"},
    {id: "is_string", label: "Is String"},
    {id: "is_dropdown", label: "Is Dropdown"},
    {id: "is_readonly", label: "Is Readonly"},
    {id: "is_current_user", label: "Is Current User"},
    {id: "is_current_date", label: "Is Current Date"},
    {id: "is_current_time", label: "Is Current Time"},
    {id: "is_minimum_value", label: "Is Minimum Value"},
    {id: "is_maximum_value", label: "Is Maximum Value"},
    {id: "is_row_count", label: "Is Row Count"},
    {id: "is_average_value", label: "Is Average Value"},
    {id: "is_summary", label: "Is Summary"},
    {id: "close_after_click", label: "Close After Click"},
    {id: "disappear_after_click", label: "Disappear After Click"},
];


const InputFields = [
    {id: "maximum_length_is", label: "Maximum length is"},
    {id: "minimum_length_is", label: "Minimum length is"},
    {id: "after_redirect_to", label: "After redirect to"},
    {id: "successful_message_is", label: "Successful message is"},
    {id: "warning_message_is", label: "Warning message is"},
    {id: "error_message_is", label: "Error message is"},
    {id: "date_format_is", label: "Date format is"},
    {id: "time_format_is", label: "Time format is"},
    {id: "minimum_value_is", label: "Minimum value is"},
    {id: "maximum_value_is", label: "Maximum value is"},
    {id: "default_value_is", label: "Default value is"},
    {id: "placeholder_is", label: "Placeholder is"},
    {id: "minimum_selected_item_count_is", label: "Minimum selected item count is"},
    {id: "maximum_selected_item_count_is", label: "Maximum selected item count is"},
    {id: "mask_is", label: "Mask is"},
];

export default React.memo(UICanvasTemplateDescriptionUpdateDrawer, (prevProps, nextProps) => (prevProps.open === nextProps.open));
 function UICanvasTemplateDescriptionUpdateDrawer({
                                                                    open,
                                                                    onClose,
                                                                    templateDescriptionUpdate,
                                                                    selectedInput
                                                                }) {
    const [descriptionList, setDescriptionList] = useState([]);
    const [inputValues, setInputValues] = useState({});

    function handleSave() {
        templateDescriptionUpdate(descriptionList)
        onClose();
    }

    const handleCheckboxChange = (label, checked) => {
        updateDescription(label, checked);
    };

    const handleInputChange = (label, e) => {
        const val = e.target.value;
        setInputValues((prev) => ({...prev, [label.id]: val}));
        updateDescription(label, val);
    };

    const updateDescription = (label, value) => {
        const id = label.id; // label’ı unique key olarak kullanabiliriz
        setDescriptionList((prev) => {
            const filtered = prev.filter((item) => item.id !== label.id);

            if (!value || value === false || value === "") {
                return filtered; // boşsa sil
            }

            return [
                ...filtered,
                {
                    id,
                    check: typeof value === "boolean",
                    ...(typeof value !== "boolean" && {label: label.label}),
                    description:
                        typeof value === "boolean"
                            ? label?.label // checkbox için
                            : `${value}`, // input için

                },
            ];
        });
    }
    useEffect(() => {
        if (open) {
            if (Object.keys(selectedInput.templateDescription || {}).length) {
                const templateDescriptions = Object.values(selectedInput.templateDescription);
                const inputValue = {};
                templateDescriptions.filter(item => !item.check).forEach(item => inputValue[item.templateDescId] = item.description);
                setDescriptionList(templateDescriptions.map(item => ({...item, id: item.templateDescId})));
                setInputValues(inputValue);

            } else {
                setDescriptionList([]);
                setInputValues({});
            }
        }
    }, [open, selectedInput]);
    const onClear = () => {
        setDescriptionList([]);
        setInputValues({});
    }

    return <>
        <Drawer
            width={980}
            open={open}
            onClose={onClose}
            title="Update Description from Template"
            footer={
                <div className="flex justify-between items-center">
                    <Space direction="horizontal">
                        <Button
                            type="primary"
                            icon={<SaveOutlined/>}
                            onClick={handleSave}
                        >Update</Button>
                        <Button onClick={onClose}>Cancel</Button>
                    </Space>
                    <Button onClick={onClear}>Clear</Button>
                </div>
            }
        >
            <Form
                layout="vertical"
                style={{
                    margin: "0 auto",
                }}
            >
                <div className="mb-4">
                    <Title level={5} style={{margin: 0}}>Rules</Title>
                    <Text type="secondary">
                        {selectedInput?.inputName || "Selected Input"}
                    </Text>
                </div>
                <Row gutter={[12, 8]}>
                    {checkboxGroup.map((label) => (
                        <Col xs={24} sm={12} lg={6} key={label.id}>
                            <Form.Item label={null} className="m-0">
                                <Checkbox
                                    checked={!!descriptionList.find(item => item.id === label.id)}
                                    onChange={(e: CheckboxChangeEvent) => handleCheckboxChange(label, e.target.checked)}
                                >
                                    <span style={{fontSize: 13, fontWeight: 500}}>{label.label}</span>
                                </Checkbox>
                            </Form.Item>
                        </Col>
                    ))}
                </Row>

                <Divider style={{margin: "18px 0"}} />

                <div className="mb-4">
                    <Title level={5} style={{margin: 0}}>Values</Title>
                    <Text type="secondary">Fill only the fields you need.</Text>
                </div>
                <Row gutter={[16, 8]}>
                    {InputFields.map((field) => (
                        <Col xs={24} sm={12} lg={6} key={field.id}>
                            <Form.Item
                                label={field.label}
                                className="mb-2"
                            >
                                <Input
                                    size="middle"
                                    value={inputValues?.[field.id] || ""}
                                    onChange={(e) => handleInputChange(field, e)}
                                />
                            </Form.Item>
                        </Col>
                    ))}
                </Row>
            </Form>

        </Drawer>
    </>
}
