import { useEffect, useRef, useState } from "react";
import services from "../services/backlogService";

export const useBacklogCanvas = (tasks: any[], currentProjectId: string | undefined) => {
    const [canvas, setCanvas] = useState<any>({});
    const [apiNames, setApiNames] = useState<{ [key: string]: string }>({});
    const loadedApiIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!currentProjectId) {
            setCanvas({});
            setApiNames({});
            loadedApiIdsRef.current = new Set();
            return;
        }

        const currentCanvasId = localStorage.getItem("currentUI");
        if (!currentCanvasId) {
            setCanvas({});
            return;
        }

        services.getActiveProjectById(currentCanvasId).then((c) => setCanvas(c || {}));
    }, [currentProjectId]);

    useEffect(() => {
        const loadApiNames = async () => {
            if (!canvas?.input) return;
            const apiIds = new Set<string>();

            tasks.forEach((task) => {
                const obj: any = getValueSync(task, canvas);
                if (obj?.value?.api) apiIds.add(obj.value.api);
            });

            const missingApiIds = Array.from(apiIds).filter(
                (apiId) => !loadedApiIdsRef.current.has(apiId)
            );

            if (!missingApiIds.length) {
                return;
            }

            const entries = await Promise.all(
                missingApiIds.map(async (apiId) => {
                    try {
                        const ac = await services.getApiCanvas(apiId);
                        return ac?.name ? [apiId, ac.name] as const : null;
                    } catch {
                        return null;
                    }
                })
            );

            const nextNames: { [key: string]: string } = {};
            for (const entry of entries) {
                if (!entry) continue;
                const [apiId, apiName] = entry;
                nextNames[apiId] = apiName;
                loadedApiIdsRef.current.add(apiId);
            }

            if (!Object.keys(nextNames).length) {
                missingApiIds.forEach((apiId) => loadedApiIdsRef.current.add(apiId));
                return;
            }

            setApiNames((prev) => ({ ...prev, ...nextNames }));
        };

        loadApiNames();
    }, [tasks, canvas]);

    useEffect(() => {
        if (!currentProjectId) {
            return;
        }

        const visibleApiIds = new Set<string>();
        tasks.forEach((task) => {
            const obj: any = getValueSync(task, canvas);
            if (obj?.value?.api) {
                visibleApiIds.add(obj.value.api);
            }
        });

        if (!visibleApiIds.size) {
            setApiNames({});
            loadedApiIdsRef.current = new Set();
            return;
        }

        setApiNames((prev) => {
            const filteredEntries = Object.entries(prev).filter(([apiId]) => visibleApiIds.has(apiId));
            return filteredEntries.length === Object.keys(prev).length
                ? prev
                : Object.fromEntries(filteredEntries);
        });

        loadedApiIdsRef.current = new Set(
            Array.from(loadedApiIdsRef.current).filter((apiId) => visibleApiIds.has(apiId))
        );
    }, [tasks, canvas, currentProjectId]);

    return { canvas, apiNames };
};

export const getValueSync = (arg: any, canvas: any): any => {
    if (!canvas?.input || !arg?.inputId) return "";
    for (const [, item] of Object.entries(canvas.input)) {
        const inputBlock = (item as any)?.[arg?.inputId];
        if (!inputBlock) continue;
        const fieldBlock = inputBlock?.[arg?.key];
        if (!fieldBlock) continue;
        const value =
            arg?.key !== "formAction"
                ? fieldBlock?.[arg?.descId] ?? ""
                : inputBlock?.[arg?.key] ?? "";
        const inputName = inputBlock?.inputName ?? "";
        if (value && inputName) return { value, name: inputName, key: arg?.key };
    }
    return "";
};

export const checkColor = (arg: string): string =>
    arg === "draft"
        ? "bg-[#C8C8C8] text-black"
        : arg === "new"
        ? "bg-[#FFA500] text-black"
        : arg === "closed"
        ? "bg-blue-500 text-white"
        : arg === "canceled"
        ? "bg-red-500 text-white"
        : arg === "ongoing"
        ? "bg-[#008000] text-white"
        : "bg-[#9ACD32] text-black";
