export interface UIList {
    description: string;
    id: string
    label: string
}

export interface IUIInput {
    fkStoryId: string
    inputName: string
    inputType: string
    componentType: string
    cellNo: string
    id: string
    // isViewOnly: boolean
    // withLabel: boolean
    // isLabelInTop: boolean
    content: string
}

export interface ISelectedUI {
    id: string
    label: string
    description: string
    input: Record<string, IUIInput>
}

export const componentTypeLabel = {
    txt: 'Edit Line',
    cmb: 'Select Box',
    btn: 'Button',
    txa: "Textarea",
    rbtn: "Radio Button",
    cbox: "Check Box",
    icbox: "Inner Check Box",
    date: "Date Picker",
    time: "Time Picker",
    lbl: "Label",
    file: "File Picker",
    hlink: "Hyperlink",
    img: "Image",
    tbl: "Table",
    grp: "Group",
    ytube: "You Tube",
}
export const FormActionEventLabel = {
    show_form: "popup",
    close_form: "close",
    redirect: "redirect",
}
