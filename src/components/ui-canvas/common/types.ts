export enum ComponentType {
    Txt = "txt",
    Cmb = "cmb",
    Btn = "btn",
    Txa = "txa",
    Rbtn = "rbtn",
    IRbtn = 'irbtn',
    Cbox = "cbox",
    Date = "date",
    Time = "time",
    Lbl = "lbl",
    Icbox = "icbox",
    File = "file",
    Hlink = "hlink",
    Img = "img",
    Tbl = "tbl",
    Grp = "grp",
    Ytube = "ytube",

}

export interface ComponentJson {
    id: string;
    componentType: ComponentType;
    hasLabel: boolean;
    content?: string;
    inputName?: string;
    cellNo?: number;
    fkTableId?: string | null;
    fkGroupId?: string | null;
    order?: number;
    css?: {
        container?: string;
        component?: string;
    };
}
export interface ComponentsJson {
    css: any,

    [userStoryId: string]: {
        [componentId: string]: ComponentJson;
    },

}
export const componentTypesObj: Record<ComponentType, { id: ComponentType; label: string }> = {
    [ComponentType.Txt]: {id: ComponentType.Txt, label: "Edit Line"},
    [ComponentType.Btn]: {id: ComponentType.Btn, label: "Button"},
    [ComponentType.Img]: {id: ComponentType.Img, label: "Image"},
    [ComponentType.Cbox]: {id: ComponentType.Cbox, label: "Checkbox"},
    [ComponentType.Icbox]: {id: ComponentType.Icbox, label: "Inner Checkbox"},
    [ComponentType.Cmb]: {id: ComponentType.Cmb, label: "Select"},
    [ComponentType.Rbtn]: {id: ComponentType.Rbtn, label: "Radio"},
    [ComponentType.IRbtn]: {id: ComponentType.IRbtn, label: "Inner Radio"},
    [ComponentType.Txa]: {id: ComponentType.Txa, label: "Textarea"},
    [ComponentType.Tbl]: {id: ComponentType.Tbl, label: "Table"},
    [ComponentType.Grp]: {id: ComponentType.Grp, label: "Group"},
    [ComponentType.Date]: {id: ComponentType.Date, label: "Date Picker"},
    [ComponentType.Time]: {id: ComponentType.Time, label: "Time Picker"},
    [ComponentType.File]: {id: ComponentType.File, label: "File Picker"},
    [ComponentType.Hlink]: {id: ComponentType.Hlink, label: "Hyperlink"},
    [ComponentType.Lbl]: {id: ComponentType.Lbl, label: "Label"},
    [ComponentType.Ytube]: {id: ComponentType.Ytube, label: "YouTube"},
};

export enum ActionsType {
    COMPONENT_INFORMATION = 'component_information',
    MANUAL_DESCRIPTION = 'manual_description',
    TEMPLATE_DESCRIPTION = 'template_description',
    API_RELATION = 'api_relation',
    FORM_ACTION = 'form_action',
    RENAME = 'rename',
    DELETE = 'delete',
    ADD_TO_TABLE = 'add_to_table',
    ADD_TO_GROUP = 'add_to_group',
    REMOVE_FROM_TABLE = 'remove_from_table',
    REMOVE_FROM_GROUP = "remove_from_group",
}

export const actions = [
    {key: ActionsType.COMPONENT_INFORMATION, label: 'Component Information'},
    {key: ActionsType.MANUAL_DESCRIPTION, label: 'Manual Description'},
    {key: ActionsType.TEMPLATE_DESCRIPTION, label: 'Template Description'},
    {key: ActionsType.API_RELATION, label: 'API Relation'},
    {key: ActionsType.FORM_ACTION, label: 'Form Action'},
    {key: ActionsType.RENAME, label: 'Rename'},
    {key: ActionsType.DELETE, label: 'Delete'},
]
