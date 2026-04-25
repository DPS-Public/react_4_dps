// types.ts

export enum OperationType {
    SELECTDATA = "selectdata",
    JSON = "json",
    INSERTDATA = "insertdata",
    UPDATEDATA = "updatedata",
    DELETEDATA = "deletedata",
    COMMON = "common",
}

export const operationTypes = {
    [OperationType.COMMON]: {
        value: OperationType.COMMON,
        label: " "
    },
    [OperationType.INSERTDATA]: {
        value: OperationType.INSERTDATA,
        label: "Insert Data",
        bgColor: "#ffa500",
        textColor: "#fff",
    },
    [OperationType.DELETEDATA]: {
        value: OperationType.DELETEDATA,
        label: "Delete Data",
        bgColor: "#ff0000",
        textColor: "#fff",
    },
    [OperationType.UPDATEDATA]: {
        value: OperationType.UPDATEDATA,
        label: "Update Data",
        bgColor: "#ffff00",
        textColor: "#000",
    },
    [OperationType.SELECTDATA]: {
        value: OperationType.SELECTDATA,
        label: "Select Data",
        bgColor: "#333",
        textColor: "#fff",
    },
    [OperationType.JSON]: {
        value: OperationType.JSON,
        label: "Set JSON",
        bgColor: "#0000ff",
        textColor: "#fff",
    },
};


export const convertOperationTypesLabel = {
    [OperationType.SELECTDATA]: "Select Data",
    [OperationType.COMMON]: "Call API",
    [OperationType.INSERTDATA]: "Insert Data",
    [OperationType.UPDATEDATA]: "Update Data",
    [OperationType.DELETEDATA]: "Delete Data",
};

export interface APIEndpoint {
    id: string;
    name: string;
    description?: string;
    config: {
        method: "GET" | "POST" | "PUT" | "DELETE";
        localUrl: string;
        localHeader: string;
        filePath: string;
    };
    requestBody: string;
    responseBody: string;
    input: { name: string; description: string }[];
    output: { name: string; description: string }[];
    operation: { type: OperationType; description: string }[];
}


export interface IIdName {
    id: string;
    name: string;
}

export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
}

export const STORAGE_KEY = "apiEndpoints";
