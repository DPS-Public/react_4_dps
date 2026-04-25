import React, {useMemo, useRef, useState} from "react";
import {Button, Checkbox, Input, Modal, Select, Switch, message} from "antd";
import useAPICanvasExport from "@/hooks/api-canvas/API/useAPICanvasExport.tsx";
import UICanvasShareModal from "./UICanvasShareModal";
import {ImportOutlined, ExportOutlined, CopyOutlined, ShareAltOutlined, HistoryOutlined, RobotOutlined, DownloadOutlined} from "@ant-design/icons";
import downloadJsonTemplatePayload from "../../../../test.json";

const { Option } = Select;
const { TextArea } = Input;

const uiCanvasSupportedComponents = [
    {
        componentType: "txt",
        label: "Edit Line",
        category: "input",
        description: "Single-line text input for short values such as title, email, username, code, or numeric text.",
    },
    {
        componentType: "cmb",
        label: "Select",
        category: "input",
        description: "Dropdown/select input for choosing a single value from predefined options.",
    },
    {
        componentType: "btn",
        label: "Button",
        category: "action",
        description: "Action trigger such as create, save, cancel, submit, open modal, or redirect.",
    },
    {
        componentType: "txa",
        label: "Textarea",
        category: "input",
        description: "Multi-line text input for notes, descriptions, summaries, comments, and long-form content.",
    },
    {
        componentType: "rbtn",
        label: "Radio Button",
        category: "input",
        description: "Radio group where the user selects one option from multiple choices.",
    },
    {
        componentType: "icbox",
        label: "Inner Check Box",
        category: "input",
        description: "Single checkbox item used for checklists, acceptance flags, or definition-of-done style items.",
    },
    {
        componentType: "cbox",
        label: "Check Box",
        category: "input",
        description: "Checkbox group or toggle-style field used to enable or disable one or more options.",
    },
    {
        componentType: "date",
        label: "Date Picker",
        category: "input",
        description: "Date picker component for start date, due date, deadline, or scheduling flows.",
    },
    {
        componentType: "time",
        label: "Time Picker",
        category: "input",
        description: "Time picker component for hour/minute selection or effort estimation inputs.",
    },
    {
        componentType: "lbl",
        label: "Label",
        category: "display",
        description: "Read-only text or generated value such as Task ID, info text, state text, or system labels.",
    },
    {
        componentType: "file",
        label: "File Picker",
        category: "media",
        description: "Upload component for documents, attachments, screenshots, and files.",
    },
    {
        componentType: "hlink",
        label: "Hyperlink",
        category: "media",
        description: "Clickable link field for external references, ticket URLs, docs, or resource links.",
    },
    {
        componentType: "img",
        label: "Image",
        category: "media",
        description: "Image preview or image URL field for screenshots, covers, previews, or gallery-style visuals.",
    },
    {
        componentType: "tbl",
        label: "Table",
        category: "layout",
        description: "Table container for row-based relational data such as subtasks, users, or item lists.",
    },
    {
        componentType: "grp",
        label: "Group",
        category: "layout",
        description: "Logical container grouping related inputs into sections such as Basic Info, Attachments, or Checklist.",
    },
    {
        componentType: "ytube",
        label: "YouTube",
        category: "media",
        description: "Embedded YouTube/video reference component for demos, tutorials, or admin-only media.",
    },
];

const uiCanvasManualDescriptionSupportedEvents = [
    "onclick",
    "onchange",
    "onload",
    "ondblclick",
    "onkeypress",
    "onrightclick",
    "onmouseover",
];

const uiCanvasJsonTemplatePayload = {
    meta: {
        templateName: "DPS UI Canvas JSON Template For AI Prompting",
        templateVersion: "1.0",
        purpose: "Use this template to ask AI assistants like Codex or Claude to generate import-ready UI Canvas JSON that can later be imported into DPS UI Canvas via Import JSON.",
        instructionsForAI: [
            "Fill every relevant section using the target screen or flow requirements.",
            "Preserve the overall object structure so the DPS import flow can map the data correctly.",
            "Use stable ids for canvases, inputs, groups, tables, relations, external links, and GitHub mappings.",
            "If a section is not needed, keep the property with an empty object, empty array, null, or placeholder text instead of removing it.",
            "Manual descriptions should explain behavior using the supported event names exactly as defined in manualDescriptionSupportedEvents.",
            "UAC items should be actionable and mapped to task ids and input/component ids where possible.",
            "Use only DPS-supported component types from supportedComponents.",
        ],
        exportFileName: "DPS_UI_Canvas_JSON_Template_For_AI_Prompting.json",
    },
    supportedComponents: uiCanvasSupportedComponents,
    manualDescriptionSupportedEvents: uiCanvasManualDescriptionSupportedEvents,
    id: "ui_canvas_ai_template_id",
    name: "AI Generated UI Canvas Template",
    label: "AI Generated UI Canvas Template",
    projectId: "PROJECT_ID_HERE",
    createdBy: "USER_ID_HERE",
    createdAt: {
        seconds: 1775589448,
        nanoseconds: 44000000,
    },
    updatedAt: {
        seconds: 1775903836,
        nanoseconds: 387000000,
    },
    description: "Canvas description goes here. Include the original prompt, expanded feature scope, layout expectations, business rules, responsive behavior, validations, edge cases, empty states, permissions, and visual notes.",
    canvasDescription: {
        originalPrompt: "Example: Create a login page with email, password, remember me, forgot password, sign up link, and submit button.",
        expandedPrompt: "Describe the final expected UX, responsive behavior, validation rules, API interactions, loading states, success and error states, role-based visibility, and accessibility rules.",
        layout: {
            pageType: "form",
            responsiveModes: ["desktop", "tablet", "mobile"],
            sections: [
                {
                    id: "section_auth_header",
                    title: "Header Section",
                    description: "Contains logo, page title, subtitle, and support text.",
                    order: 1,
                },
                {
                    id: "section_auth_form",
                    title: "Authentication Form Section",
                    description: "Contains form groups, inputs, links, and action buttons.",
                    order: 2,
                },
            ],
        },
        styleNotes: {
            designSystem: "DPS",
            theme: "light",
            spacing: "comfortable",
            notes: "Include typography hierarchy, border radius usage, hover states, focus states, disabled states, shadows, and empty/loading visuals.",
        },
    },
    userAcceptanceCriteria: [
        {
            id: "UAC001",
            title: "Successful Main Action",
            description: "The user can successfully complete the main screen action when valid data is provided.",
            criteriaType: "functional",
            priority: "high",
            taskIds: ["task_submit", "task_validate", "task_success_redirect"],
            relatedInputIds: ["input_email", "input_password", "input_submit_button"],
        },
        {
            id: "UAC002",
            title: "Validation and Error Handling",
            description: "Invalid or missing data displays appropriate feedback and prevents invalid submission.",
            criteriaType: "validation",
            priority: "high",
            taskIds: ["task_required_fields", "task_invalid_message"],
            relatedInputIds: ["input_email", "input_password"],
        },
    ],
    componentCatalog: uiCanvasSupportedComponents.map((item, index) => ({
        id: `component_catalog_${index + 1}`,
        componentType: item.componentType,
        label: item.label,
        category: item.category,
        description: item.description,
        sampleUseCases: [],
    })),
    taskRegistry: [
        {
            id: "task_submit",
            title: "Submit Form",
            description: "Submit the form and trigger the main business flow.",
            linkedUacIds: ["UAC001"],
            linkedInputIds: ["input_submit_button"],
        },
        {
            id: "task_required_fields",
            title: "Required Field Validation",
            description: "Prevent submit while mandatory fields are empty.",
            linkedUacIds: ["UAC002"],
            linkedInputIds: ["input_email", "input_password"],
        },
    ],
    input: {
        input_email: {
            id: "input_email",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_auth_form",
            fkTableId: null,
            inputName: "Email",
            description: "User enters their email address.",
            inputType: "IN",
            componentType: "txt",
            content: "",
            placeholder: "Enter your email",
            defaultValue: "",
            displayIndex: "1",
            order: 1,
            cellNo: "6",
            isMandatory: true,
            hasLabel: true,
            label: "Email",
            helperText: "We will use this email for authentication.",
            validationRules: {
                minLength: 5,
                maxLength: 120,
                pattern: "email",
                customRules: ["must_be_company_email_if_required"],
            },
            css: {
                containerCss: "",
                componentCss: "",
            },
            databaseRelation: {
                collectionName: "",
                fieldName: "",
                relationType: "",
            },
            apiCall: {
                method: "",
                url: "",
                requestField: "",
                responseField: "",
                triggerEvent: "",
            },
            formAction: {
                actionType: "input",
                submitTarget: "auth_form",
                resettable: true,
            },
            manualDescription: {
                input_email_manual_default: {
                    id: "input_email_manual_default",
                    uiId: "ui_canvas_ai_template_id",
                    inputId: "input_email",
                    inputName: "Email",
                    event: "default",
                    order: 1,
                    description: "User enters their email address in this field.",
                },
                input_email_manual_onchange: {
                    id: "input_email_manual_onchange",
                    uiId: "ui_canvas_ai_template_id",
                    inputId: "input_email",
                    inputName: "Email",
                    event: "onChange",
                    order: 2,
                    description: "Validate email format while the user types if real-time validation is enabled.",
                },
                input_email_manual_onfocus: {
                    id: "input_email_manual_onfocus",
                    uiId: "ui_canvas_ai_template_id",
                    inputId: "input_email",
                    inputName: "Email",
                    event: "onFocus",
                    order: 3,
                    description: "Highlight the field and show helper guidance on focus.",
                },
                input_email_manual_onblur: {
                    id: "input_email_manual_onblur",
                    uiId: "ui_canvas_ai_template_id",
                    inputId: "input_email",
                    inputName: "Email",
                    event: "onBlur",
                    order: 4,
                    description: "Validate the email field after the user leaves the field.",
                },
            },
            templateDescription: {
                sourceType: "template",
                templateId: "template_auth_email_field",
                description: "Reusable email input field template for authentication-related canvases.",
            },
        },
        input_submit_button: {
            id: "input_submit_button",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_auth_actions",
            fkTableId: null,
            inputName: "Submit",
            description: "Triggers the main submit action.",
            inputType: "IN",
            componentType: "btn",
            content: "Submit",
            placeholder: "",
            defaultValue: "",
            displayIndex: "2",
            order: 2,
            cellNo: "6",
            isMandatory: false,
            hasLabel: false,
            label: "",
            helperText: "",
            validationRules: {},
            css: {
                containerCss: "",
                componentCss: "",
            },
            databaseRelation: {},
            apiCall: {
                method: "POST",
                url: "/api/auth/login",
                requestField: "form_payload",
                responseField: "auth_result",
                triggerEvent: "onClick",
            },
            formAction: {
                actionType: "submit",
                submitTarget: "auth_form",
                resettable: false,
            },
            manualDescription: {
                input_submit_button_manual_onclick: {
                    id: "input_submit_button_manual_onclick",
                    uiId: "ui_canvas_ai_template_id",
                    inputId: "input_submit_button",
                    inputName: "Submit",
                    event: "onClick",
                    order: 1,
                    description: "When clicked, validate the form, call the submit API, show loading state, and navigate on success.",
                },
                input_submit_button_manual_onmouseover: {
                    id: "input_submit_button_manual_onmouseover",
                    uiId: "ui_canvas_ai_template_id",
                    inputId: "input_submit_button",
                    inputName: "Submit",
                    event: "onMouseOver",
                    order: 2,
                    description: "Optional hover state description for primary action emphasis.",
                },
            },
            templateDescription: {
                sourceType: "manual",
                templateId: "",
                description: "Primary action button for the form.",
            },
        },
        input_table_example: {
            id: "input_table_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: null,
            fkTableId: "table_user_list",
            inputName: "User List Column - Email",
            description: "Example of an input/component inside a table structure.",
            inputType: "IN",
            componentType: "txt",
            content: "",
            placeholder: "",
            defaultValue: "",
            displayIndex: "3",
            order: 1,
            cellNo: "1",
            isMandatory: false,
            hasLabel: true,
            label: "Email",
            helperText: "",
            validationRules: {},
            css: {
                containerCss: "",
                componentCss: "",
            },
            databaseRelation: {},
            apiCall: {},
            formAction: {
                actionType: "display",
                submitTarget: "",
                resettable: false,
            },
            manualDescription: {
                input_table_example_manual_default: {
                    id: "input_table_example_manual_default",
                    uiId: "ui_canvas_ai_template_id",
                    inputId: "input_table_example",
                    inputName: "User List Column - Email",
                    event: "default",
                    order: 1,
                    description: "Displays the email field for each row in the table.",
                },
            },
            templateDescription: {
                sourceType: "table",
                templateId: "table_template_users",
                description: "Email column used inside a table/grid component.",
            },
        },
        input_radio_example: {
            id: "input_radio_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Priority",
            description: "Radio example component.",
            inputType: "IN",
            componentType: "rbtn",
            content: "Low\nMedium\nHigh",
            order: 4,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_checkbox_example: {
            id: "input_checkbox_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Has Attachment",
            description: "Checkbox example component.",
            inputType: "IN",
            componentType: "cbox",
            content: "",
            order: 5,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_inner_checkbox_example: {
            id: "input_inner_checkbox_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Definition of Done",
            description: "Inner checkbox example component.",
            inputType: "IN",
            componentType: "icbox",
            content: "Code Review\nTests Written\nDeployed",
            order: 6,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_date_example: {
            id: "input_date_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Due Date",
            description: "Date example component.",
            inputType: "IN",
            componentType: "date",
            content: "",
            order: 7,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_time_example: {
            id: "input_time_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Estimated Time",
            description: "Time example component.",
            inputType: "IN",
            componentType: "time",
            content: "",
            order: 8,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_label_example: {
            id: "input_label_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Task ID",
            description: "Label example component.",
            inputType: "IN",
            componentType: "lbl",
            content: "TASK-174001",
            order: 9,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_file_example: {
            id: "input_file_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Attachment",
            description: "File picker example component.",
            inputType: "IN",
            componentType: "file",
            content: "",
            order: 10,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_hyperlink_example: {
            id: "input_hyperlink_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Reference Link",
            description: "Hyperlink example component.",
            inputType: "IN",
            componentType: "hlink",
            content: "https://example.com",
            order: 11,
            cellNo: "6",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_image_example: {
            id: "input_image_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Cover Image",
            description: "Image example component.",
            inputType: "IN",
            componentType: "img",
            content: "https://via.placeholder.com/300x160?text=Cover+Image",
            order: 12,
            cellNo: "12",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_group_example: {
            id: "input_group_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: null,
            fkTableId: null,
            inputName: "Example Group",
            description: "Group example component.",
            inputType: "GRP",
            componentType: "grp",
            content: "",
            order: 13,
            cellNo: "12",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_table_container_example: {
            id: "input_table_container_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: null,
            fkTableId: null,
            inputName: "Example Table",
            description: "Table example component.",
            inputType: "TBL",
            componentType: "tbl",
            content: "",
            order: 14,
            cellNo: "12",
            hasLabel: false,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
        input_youtube_example: {
            id: "input_youtube_example",
            fkUserStoryId: "ui_canvas_ai_template_id",
            fkGroupId: "group_examples",
            fkTableId: null,
            inputName: "Demo Video",
            description: "YouTube example component.",
            inputType: "IN",
            componentType: "ytube",
            content: "dQw4w9WgXcQ",
            order: 15,
            cellNo: "12",
            hasLabel: true,
            css: {
                containerCss: "",
                componentCss: "",
            },
            manualDescription: {},
            templateDescription: {},
        },
    },
    inputExamplesByComponentType: {
        txt: { componentType: "txt", inputName: "Task Title", cellNo: "12", hasLabel: true },
        cmb: { componentType: "cmb", inputName: "Project", cellNo: "6", hasLabel: true, content: "Project A\nProject B\nProject C" },
        btn: { componentType: "btn", inputName: "Create", cellNo: "3", hasLabel: false, content: "Create" },
        txa: { componentType: "txa", inputName: "Description", cellNo: "12", hasLabel: true },
        rbtn: { componentType: "rbtn", inputName: "Priority", cellNo: "6", hasLabel: true, content: "Low\nMedium\nHigh" },
        cbox: { componentType: "cbox", inputName: "Has Subtasks?", cellNo: "3", hasLabel: true },
        icbox: { componentType: "icbox", inputName: "Definition of Done", cellNo: "6", hasLabel: true, content: "Code Review\nTests Written\nDeployed" },
        date: { componentType: "date", inputName: "Start Date", cellNo: "6", hasLabel: true },
        time: { componentType: "time", inputName: "Estimated Time", cellNo: "6", hasLabel: true },
        lbl: { componentType: "lbl", inputName: "Task ID", cellNo: "12", hasLabel: true, content: "TASK-174001" },
        file: { componentType: "file", inputName: "Attachment", cellNo: "12", hasLabel: true },
        hlink: { componentType: "hlink", inputName: "Reference URL", cellNo: "12", hasLabel: true, content: "https://example.com" },
        img: { componentType: "img", inputName: "Cover / Screenshot", cellNo: "12", hasLabel: true, content: "https://via.placeholder.com/300x160?text=Image" },
        tbl: { componentType: "tbl", inputName: "Subtasks", cellNo: "12", hasLabel: false },
        grp: { componentType: "grp", inputName: "Basic Information", cellNo: "12", hasLabel: true },
        ytube: { componentType: "ytube", inputName: "Demo Video Link", cellNo: "12", hasLabel: true, content: "dQw4w9WgXcQ" },
    },
    inputDescriptionRegistry: {
        manual: [
            {
                inputId: "input_email",
                supportedEvents: uiCanvasManualDescriptionSupportedEvents,
            },
        ],
        template: [
            {
                inputId: "input_email",
                templateId: "template_auth_email_field",
                description: "Maps the input to a reusable DPS template fragment.",
            },
        ],
        apiRelation: [
            {
                inputId: "input_submit_button",
                event: "onClick",
                method: "POST",
                endpoint: "/api/auth/login",
                requestSource: "form_payload",
                successAction: "redirect_to_dashboard",
                errorAction: "show_error_message",
            },
        ],
        formAction: [
            {
                inputId: "input_submit_button",
                action: "submit",
                formId: "auth_form",
                triggerEvent: "onClick",
            },
        ],
        componentList: [
            {
                componentId: "input_email",
                componentType: "txt",
                groupId: "group_auth_form",
                tableId: null,
            },
            {
                componentId: "input_submit_button",
                componentType: "btn",
                groupId: "group_auth_actions",
                tableId: null,
            },
            {
                componentId: "input_table_example",
                componentType: "table_column",
                groupId: null,
                tableId: "table_user_list",
            },
        ],
    },
    groups: {
        group_auth_form: {
            id: "group_auth_form",
            title: "Authentication Form Group",
            description: "Groups all authentication inputs.",
            order: 1,
            displayIndex: "1",
            parentGroupId: null,
            css: {
                containerCss: "",
                componentCss: "",
            },
        },
        group_auth_actions: {
            id: "group_auth_actions",
            title: "Action Button Group",
            description: "Contains form action buttons and utility links.",
            order: 2,
            displayIndex: "2",
            parentGroupId: "group_auth_form",
            css: {
                containerCss: "",
                componentCss: "",
            },
        },
    },
    tables: {
        table_user_list: {
            id: "table_user_list",
            title: "User List Table",
            description: "Example table structure that can be used inside UI Canvas.",
            order: 1,
            columns: [
                {
                    id: "table_user_list_col_email",
                    title: "Email",
                    key: "email",
                    order: 1,
                },
                {
                    id: "table_user_list_col_status",
                    title: "Status",
                    key: "status",
                    order: 2,
                },
            ],
            actions: [
                {
                    id: "table_user_list_action_view",
                    title: "View",
                    event: "onClick",
                    description: "Opens row detail drawer or page.",
                },
            ],
        },
    },
    externalViewLinks: {
        external_link: [
            {
                id: "external_link_1",
                type: "external_link",
                title: "External Image URL",
                url: "https://example.com/assets/ui-preview.png",
                description: "Added from Add Image URL action.",
            },
        ],
        embedded_code: [
            {
                id: "embedded_code_1",
                type: "embedded_code",
                title: "Figma Embed",
                code: "<iframe src='https://www.figma.com/embed?embed_host=share&url=FILE_URL' allowfullscreen></iframe>",
                description: "Added from Add Embed Code action.",
            },
        ],
        upload_image: [
            {
                id: "upload_image_1",
                type: "upload_image",
                title: "Uploaded UI Screenshot",
                url: "https://firebasestorage.googleapis.com/v0/b/PROJECT/o/ui-canvas%2Fuploaded-image.png",
                storagePath: "ui-canvas/uploaded-image.png",
                description: "Added from Upload Image action.",
            },
        ],
        clipboard_image: [
            {
                id: "clipboard_image_1",
                type: "clipboard_image",
                title: "Clipboard Snapshot",
                url: "https://firebasestorage.googleapis.com/v0/b/PROJECT/o/ui-canvas%2Fclipboard-image.png",
                storagePath: "ui-canvas/clipboard-image.png",
                description: "Added from Upload from Clipboard action.",
            },
        ],
    },
    githubRelation: {
        repository: {
            id: "github_repo_1",
            provider: "github",
            owner: "org-or-user",
            repo: "repository-name",
            branch: "main",
            basePath: "src/modules/example",
            description: "Primary repository relation for the canvas implementation.",
        },
        linkedFiles: [
            {
                id: "github_file_1",
                path: "src/pages/LoginPage.tsx",
                relationType: "page",
                description: "Main page component for this UI canvas.",
            },
            {
                id: "github_file_2",
                path: "src/components/LoginForm.tsx",
                relationType: "component",
                description: "Reusable component related to the canvas.",
            },
        ],
        pullRequests: [
            {
                id: "github_pr_1",
                prNumber: 123,
                title: "Implement login canvas",
                status: "open",
                description: "Sample PR reference for the canvas.",
            },
        ],
    },
    historyTemplate: {
        trackableActions: [
            "DESCRIPTION_UPDATE",
            "FIELD_UPDATE",
            "INPUT_UPDATE",
            "MANUAL_DESCRIPTION_BATCH_UPDATE",
            "UAC_UPDATE",
            "GITHUB_URL_ADD",
            "GITHUB_URL_DELETE",
            "DRAG_DROP_REORDER",
            "IMPORT_JSON",
            "EXPORT_JSON",
        ],
        sampleRecord: {
            id: "history_record_1",
            actionType: "FIELD_UPDATE",
            field: "description",
            oldValue: "Old description",
            newValue: "New description",
            changedAt: {
                seconds: 1775903836,
                nanoseconds: 387000000,
            },
            changedBy: {
                userId: "USER_ID_HERE",
                email: "user@example.com",
                name: "User Name",
            },
        },
    },
    importNotes: {
        expectedImportFlow: "Generate this JSON with AI, review it, then import it from the UI Canvas Import JSON action.",
        validationChecklist: [
            "All ids are unique.",
            "UAC references valid task ids and input ids.",
            "Group and table ids referenced by inputs exist.",
            "External links use the correct type buckets.",
            "GitHub relations point to valid repository paths.",
            "Manual descriptions include event-based behavior where needed.",
        ],
    },
    output: {},
    githubUrls: [],
    isShared: false,
};

export default function ExportUICanvasSelect({
    targetRef, 
    data,
    externalLinks,
    // Import related props
    showImportModal,
    setShowImportModal,
    importDPSFile,
    handleImportCancel,
    setFileContent,
    importLoading,
    currentProject,
    onDuplicate,
    disableDuplicate,
    onHistory,
    disableHistory,
    onAI,
    disableAI,
    onAnalyze,
    disableAnalyze,
}: {
    targetRef?: React.RefObject<HTMLElement>;
    data?: object;
    externalLinks?: Array<Record<string, unknown>> | null;
    showImportModal?: boolean;
    setShowImportModal?: (v: boolean) => void;
    importDPSFile?: (payload?: any) => void;
    handleImportCancel?: () => void;
    setFileContent?: (v: unknown) => void;
    importLoading?: boolean;
    currentProject?: { id?: string; name?: string };
    onDuplicate?: () => void;
    disableDuplicate?: boolean;
    onHistory?: () => void;
    disableHistory?: boolean;
    onAI?: () => void;
    disableAI?: boolean;
    onAnalyze?: () => void;
    disableAnalyze?: boolean;
}) {
    const isShared = Boolean((data as any)?.isShared);
    const [exportType, setExportType] = useState<"json" | "json-template" | "import" | "duplicate" | "share" | "history" | "ai" | "analyze">();
    const [showShareModal, setShowShareModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [importJsonText, setImportJsonText] = useState("");
    const [importReplaceModes, setImportReplaceModes] = useState({
        description: false,
        userAcceptanceCriteria: false,
        externalViewLinks: false,
        input: false,
    });
    const [selectedExportSections, setSelectedExportSections] = useState<string[]>([
        "description",
        "uac",
        "external-links",
        "inputs-and-descriptions",
    ]);
    const {exportCanvas, downloading} = useAPICanvasExport();
    const fileInputRef = useRef(null);

    const exportSectionOptions = useMemo(() => ([
        { value: "description", label: "Description" },
        { value: "uac", label: "UAC" },
        { value: "external-links", label: "UI - External links" },
        { value: "inputs-and-descriptions", label: "Inputs and descriptions" },
    ]), []);

    const sanitizedCanvasFileName = useMemo(() => {
        const rawName = String((data as any)?.name || (data as any)?.label || "ui-canvas").trim();
        const sanitizedName = rawName
            .replace(/[<>:"/\\\\|?*]+/g, "")
            .replace(/\s+/g, "_")
            .replace(/\.+$/g, "");

        return sanitizedName || "ui-canvas";
    }, [data]);

    const buildExportPayload = () => {
        const selectedData = data as any;
        const payload: Record<string, unknown> = {
            id: selectedData?.id || "",
            name: selectedData?.name || selectedData?.label || "",
            label: selectedData?.label || selectedData?.name || "",
            projectId: selectedData?.projectId || "",
            createdBy: selectedData?.createdBy || "",
            createdAt: selectedData?.createdAt || null,
            updatedAt: selectedData?.updatedAt || null,
        };

        if (selectedExportSections.includes("description")) {
            payload.description = selectedData?.description || "";
        }

        if (selectedExportSections.includes("uac")) {
            payload.userAcceptanceCriteria = selectedData?.userAcceptanceCriteria || [];
        }

        if (selectedExportSections.includes("external-links")) {
            payload.externalViewLinks = externalLinks || [];
        }

        if (selectedExportSections.includes("inputs-and-descriptions")) {
            payload.input = selectedData?.input || {};
        }

        return payload;
    };

    const handleExport = async () => {
        if (!selectedExportSections.length) {
            message.warning("Select at least one section to export");
            return;
        }

        await exportCanvas({
            exportType: "json",
            data: buildExportPayload(),
            targetRef,
            filename: `${sanitizedCanvasFileName}.json`,
        });

        setShowExportModal(false);
    };

    const handleDownloadJsonTemplate = () => {
        const jsonString = JSON.stringify(downloadJsonTemplatePayload, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "DPS_UI_Canvas_JSON_Template_For_AI_Prompting.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        message.success("JSON template downloaded");
    };

    const handleJsonTextChange = (value: string) => {
        setImportJsonText(value);

        if (!value.trim()) {
            setFileContent?.(null);
            return;
        }

        try {
            const parsedContent = JSON.parse(value);
            setFileContent?.(parsedContent);
        } catch {
            setFileContent?.(null);
        }
    };

    const buildImportPayload = () => {
        if (!importJsonText.trim()) {
            return null;
        }

        try {
            const parsedContent = JSON.parse(importJsonText);
            return {
                ...parsedContent,
                __importModes: importReplaceModes,
            };
        } catch {
            return null;
        }
    };

    function handleChange(value: "json" | "json-template" | "import" | "duplicate" | "share" | "history" | "ai" | "analyze") {
        setExportType(value);
        
        if (value === "import") {
            setShowImportModal?.(true);
        } else if (value === "json") {
            setShowExportModal(true);
        } else if (value === "json-template") {
            handleDownloadJsonTemplate();
        } else if (value === "duplicate") {
            onDuplicate?.();
        } else if (value === "share") {
            setShowShareModal(true);
        } else if (value === "history") {
            onHistory?.();
        } else if (value === "ai") {
            onAI?.();
        } else if (value === "analyze") {
            onAnalyze?.();
        }
        
        setTimeout(() => {
            setExportType(undefined);
        }, 300);
    }

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".dps,.json"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();

                        reader.onload = (event) => {
                            try {
                                const content = event.target?.result;
                                const parsedContent = JSON.parse(content);
                                const normalizedText = JSON.stringify(parsedContent, null, 2);
                                handleJsonTextChange(normalizedText);
                            } catch (error) {
                                message.error("Invalid JSON file format");
                                console.error("Error parsing JSON file:", error);
                            }
                        };

                        reader.readAsText(file);
                        e.target.value = "";
                    }
                }}
            />
            
            <Select 
                placeholder="Action" 
                value={exportType} 
                onChange={handleChange}
                style={{width: "140px"}}
                loading={downloading || importLoading}
                suffixIcon={<ExportOutlined />}
                popupMatchSelectWidth={false}
                dropdownStyle={{ minWidth: 220 }}
            >
                <Option value="duplicate" disabled={disableDuplicate}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CopyOutlined /> Duplicate
                    </span>
                </Option>
                {onAI && (
                    <Option value="ai" disabled={disableAI}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <RobotOutlined /> AI Assistant
                        </span>
                    </Option>
                )}
                {onAnalyze && (
                    <Option value="analyze" disabled={disableAnalyze}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <HistoryOutlined /> AI Analyzer
                        </span>
                    </Option>
                )}
                <Option value="share">
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShareAltOutlined /> Share Canvas
                        </span>
                        {isShared && (
                            <span
                                style={{
                                    fontSize: 11,
                                    lineHeight: '16px',
                                    padding: '0 6px',
                                    borderRadius: 999,
                                    backgroundColor: '#f6ffed',
                                    border: '1px solid #b7eb8f',
                                    color: '#389e0d',
                                    fontWeight: 600,
                                }}
                            >
                                Shared
                            </span>
                        )}
                    </span>
                </Option>
                <Option value="import">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ImportOutlined /> Import JSON
                    </span>
                </Option>
                <Option value="json">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ExportOutlined /> Export JSON
                    </span>
                </Option>
                <Option value="json-template">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DownloadOutlined /> Download JSON Template
                    </span>
                </Option>
                <Option value="history" disabled={disableHistory}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HistoryOutlined /> History
                    </span>
                </Option>
            </Select>

            {/* Import Confirmation Modal */}
            <Modal
                title="Import UI Canvas"
                open={showImportModal}
                onOk={() => {
                    const importPayload = buildImportPayload();

                    if (!importPayload) {
                        message.error("Please provide valid JSON");
                        return;
                    }

                    setFileContent?.(importPayload);
                    importDPSFile?.(importPayload);
                }}
                onCancel={() => {
                    handleImportCancel?.();
                    setImportJsonText("");
                }}
                confirmLoading={importLoading}
                okText="Import"
                cancelText="Cancel"
                width={600}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div style={{ color: "#666" }}>
                            Import target: <strong>{(data as any)?.label || (data as any)?.name || "Selected UI Canvas"}</strong>
                        </div>
                        <Button onClick={() => fileInputRef.current?.click()}>
                            Browse
                        </Button>
                    </div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                        Supported sections: `description`, `userAcceptanceCriteria`, `externalViewLinks`, `input`
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
                        <div style={{ fontWeight: 600 }}>Replace existing data before import</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Description</span>
                            <Switch
                                checked={importReplaceModes.description}
                                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, description: checked }))}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>UAC</span>
                            <Switch
                                checked={importReplaceModes.userAcceptanceCriteria}
                                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, userAcceptanceCriteria: checked }))}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>UI - External links</span>
                            <Switch
                                checked={importReplaceModes.externalViewLinks}
                                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, externalViewLinks: checked }))}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Inputs and descriptions</span>
                            <Switch
                                checked={importReplaceModes.input}
                                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, input: checked }))}
                            />
                        </div>
                    </div>
                    <TextArea
                        rows={15}
                        value={importJsonText}
                        onChange={(event) => handleJsonTextChange(event.target.value)}
                        placeholder="Paste or load JSON here..."
                    />
                </div>
            </Modal>

            <Modal
                title="Export UI Canvas JSON"
                open={showExportModal}
                onOk={handleExport}
                onCancel={() => setShowExportModal(false)}
                okText="Export"
                cancelText="Cancel"
                confirmLoading={downloading}
            >
                <div style={{ marginBottom: 12, color: "#666" }}>
                    File name: <strong>{sanitizedCanvasFileName}.json</strong>
                </div>
                <Checkbox.Group
                    value={selectedExportSections}
                    onChange={(checkedValues) => setSelectedExportSections(checkedValues as string[])}
                    style={{ width: "100%" }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {exportSectionOptions.map((item) => (
                            <Checkbox key={item.value} value={item.value}>
                                {item.label}
                            </Checkbox>
                        ))}
                    </div>
                </Checkbox.Group>
            </Modal>

            {/* Share Canvas Modal */}
            <UICanvasShareModal
                open={showShareModal}
                onClose={() => setShowShareModal(false)}
                canvasId={data?.id || ""}
                canvasTitle={data?.title || ""}
                currentIsShared={data?.isShared || false}
                currentShareToken={data?.shareToken || ""}
            />
        </>
    );
};
