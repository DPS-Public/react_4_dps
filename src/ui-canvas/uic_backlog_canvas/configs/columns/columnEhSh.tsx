import { InputNumber, Space } from "antd";
import React from "react";

interface ColumnEhShParams {
    toggle: boolean;
    filteredTask: any[];
    onShEhChange: (id: string, sh: number, eh: number) => void;
}

const toSafeNumber = (value: unknown): number => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};

export const columnEh = ({ toggle, filteredTask, onShEhChange }: ColumnEhShParams) => ({
    title: (
        <div className="bg-red-500 text-white p-1 rounded justify-between flex items-center gap-2">
            EH <span>{(filteredTask || []).reduce((acc: number, item: any) => acc + toSafeNumber(item?.eh), 0)}</span>
        </div>
    ),
    dataIndex: "eh",
    width: "fit-content",
    align: "left" as const,
    onCell: () => ({ style: { textAlign: "left" } }),
    render: (_: any, r: any) =>
        toggle ? (
            <InputNumber
                min={0}
                defaultValue={toSafeNumber(r.eh)}
                onChange={(v) => onShEhChange(r.id, toSafeNumber(r.sh), toSafeNumber(v))}
                step={0.25}
            />
        ) : (
            <div className="w-full flex justify-start">
                <Space className="text-red-500">{toSafeNumber(r.eh)}</Space>
            </div>
        ),
});

export const columnSh = ({ toggle, filteredTask, onShEhChange }: ColumnEhShParams) => ({
    title: (
        <div className="bg-green-500 text-white p-1 rounded justify-between flex items-center gap-2">
            SH <span>{(filteredTask || []).reduce((acc: number, item: any) => acc + toSafeNumber(item?.sh), 0)}</span>
        </div>
    ),
    dataIndex: "sh",
    width: "fit-content",
    align: "left" as const,
    onCell: () => ({ style: { textAlign: "left" } }),
    render: (_: any, r: any) =>
        toggle ? (
            <InputNumber
                min={0}
                defaultValue={toSafeNumber(r.sh)}
                onChange={(v) => onShEhChange(r.id, toSafeNumber(v), toSafeNumber(r.eh))}
                step={0.25}
            />
        ) : (
            <div className="w-full flex justify-start">
                <Space className="text-green-500">{toSafeNumber(r.sh)}</Space>
            </div>
        ),
});
