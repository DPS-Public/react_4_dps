import {useState} from "react";
import {message} from "antd";
import * as htmlToImage from 'html-to-image';
import html2canvas from "html2canvas";

export default function useAPICanvasExport() {
    const [downloading, setDownloading] = useState(false);

    const normalizeInputForCapture = (source: HTMLInputElement | HTMLTextAreaElement) => {
        const replacement = document.createElement("div");
        const computed = window.getComputedStyle(source);

        const valueText = source.value || source.getAttribute("placeholder") || "";
        const isTextarea = source.tagName.toLowerCase() === "textarea";

        replacement.style.boxSizing = "border-box";
        replacement.style.width = `${source.clientWidth}px`;
        replacement.style.height = `${Math.max(source.clientHeight, 24)}px`;
        replacement.style.padding = computed.padding;
        replacement.style.border = computed.border;
        replacement.style.borderRadius = computed.borderRadius;
        replacement.style.background = computed.background;
        replacement.style.color = valueText ? computed.color : "#bfbfbf";
        replacement.style.font = computed.font;
        replacement.style.lineHeight = computed.lineHeight;
        replacement.style.letterSpacing = computed.letterSpacing;
        replacement.style.textAlign = computed.textAlign as "left" | "right" | "center" | "justify";
        replacement.style.overflow = "hidden";

        if (!isTextarea) {
            replacement.textContent = valueText;
            replacement.style.whiteSpace = "pre";
            replacement.style.textOverflow = "ellipsis";
            return replacement;
        }

        const inner = document.createElement("div");
        inner.textContent = valueText;
        inner.style.whiteSpace = "pre-wrap";
        inner.style.wordBreak = "break-word";
        inner.style.overflowWrap = "anywhere";
        inner.style.marginTop = `-${(source as HTMLTextAreaElement).scrollTop}px`;
        replacement.appendChild(inner);

        return replacement;
    };

    const patchClonedFormFields = (clonedDoc: Document) => {
        const textareaNodes = clonedDoc.querySelectorAll("textarea");
        textareaNodes.forEach((textarea) => {
            const replacement = normalizeInputForCapture(textarea as HTMLTextAreaElement);
            textarea.parentNode?.replaceChild(replacement, textarea);
        });

        const inputNodes = clonedDoc.querySelectorAll("input");
        inputNodes.forEach((input) => {
            const source = input as HTMLInputElement;
            const type = (source.type || "text").toLowerCase();
            if (["text", "search", "url", "email", "number", "tel", "password"].includes(type)) {
                const replacement = normalizeInputForCapture(source);
                input.parentNode?.replaceChild(replacement, input);
            }
        });
    };

    const shouldSkipNode = (node: HTMLElement) => {
        const tagName = node.tagName?.toLowerCase();
        if (tagName === "iframe" || tagName === "video") return true;

        return false;
    };

    const normalizeErrorMessage = (error: unknown) => {
        if (error instanceof Error && error.message) return error.message;
        if (typeof error === "string") return error;
        try {
            const asText = JSON.stringify(error);
            return asText && asText !== "{}" ? asText : "Unknown error";
        } catch {
            return "Unknown error";
        }
    };

    const getSafeCaptureConfig = (node: HTMLElement, fullSize: boolean) => {
        const rawWidth = fullSize ? Math.max(node.scrollWidth, node.clientWidth) : node.clientWidth;
        const rawHeight = fullSize ? Math.max(node.scrollHeight, node.clientHeight) : node.clientHeight;

        const MAX_DIMENSION = 12000;
        const MAX_AREA = 35_000_000;

        const dimensionRatio = Math.min(1, MAX_DIMENSION / rawWidth, MAX_DIMENSION / rawHeight);
        const areaRatio = Math.min(1, Math.sqrt(MAX_AREA / Math.max(1, rawWidth * rawHeight)));
        const ratio = Math.min(dimensionRatio, areaRatio);

        const width = Math.max(1, Math.floor(rawWidth * ratio));
        const height = Math.max(1, Math.floor(rawHeight * ratio));

        return {
            width,
            height,
            pixelRatio: ratio < 1 ? 1 : 2,
        };
    };

    const downloadBlob = (blob: Blob, name: string = "export") => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const getExportFilename = (filename: string = "export") => {
        const trimmedFilename = filename.trim();

        if (!trimmedFilename) {
            return "export.dps";
        }

        if (/\.(json|dps)$/i.test(trimmedFilename)) {
            return trimmedFilename;
        }

        return `${trimmedFilename}.dps`;
    };

    const exportJSON = async (data: any, filename: string = "export") => {
        try {
            setDownloading(true);
            const jsonString = JSON.stringify(data ?? {}, null, 2);
            const blob = new Blob([jsonString], {type: "application/json"});
            downloadBlob(blob, getExportFilename(filename));
            message.success("JSON exported");
        } catch (err) {
            console.error(err);
            message.error("Failed to export JSON");
        } finally {
            setDownloading(false);
        }
    };

    const exportImage = async (targetRef: React.RefObject<HTMLElement>, filename: string = "export.png") => {
        if (!targetRef.current) return;
        setDownloading(true);
        htmlToImage.toBlob(targetRef.current)
            .then(async (blob) => {
                if (!blob) {
                    throw new Error("Failed to create image blob");
                }
                await navigator.clipboard.write([new ClipboardItem({"image/png": blob})])
                downloadBlob(blob, filename.trim() ? `${filename.trim()}.png` : "export.png")
                setDownloading(false);
                message.success("Image exported and copied to clipboard");
            })
            .catch((err) => {
                console.error(err);
                message.error("Failed to export image");
                setDownloading(false);
            });
    };

    const tryWriteClipboardImage = async (blob: Blob) => {
        const clipboardApi = navigator?.clipboard as Clipboard | undefined;
        const hasClipboardItem = typeof ClipboardItem !== "undefined";

        if (!clipboardApi || !hasClipboardItem) {
            throw new Error("Clipboard API is not supported in this browser");
        }

        await clipboardApi.write([new ClipboardItem({ "image/png": blob })]);
    };

    const createFullCanvasBlob = async (node: HTMLElement) => {
        const width = Math.max(node.scrollWidth, node.clientWidth);
        const height = Math.max(node.scrollHeight, node.clientHeight);

        return htmlToImage.toBlob(node, {
            cacheBust: true,
            pixelRatio: 2,
            width,
            height,
            canvasWidth: width,
            canvasHeight: height,
            skipAutoScale: true,
            filter: (n) => !shouldSkipNode(n as HTMLElement),
            style: {
                width: `${width}px`,
                height: `${height}px`,
                overflow: "visible",
            },
        });
    };

    const createBlobWithHtml2Canvas = async (node: HTMLElement, useFullSize: boolean) => {
        const { width, height, pixelRatio } = getSafeCaptureConfig(node, useFullSize);

        const canvas = await html2canvas(node, {
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            scale: pixelRatio,
            width,
            height,
            windowWidth: width,
            windowHeight: height,
            scrollX: 0,
            scrollY: -window.scrollY,
            ignoreElements: (el) => {
                const element = el as HTMLElement;
                return shouldSkipNode(element);
            },
            onclone: (clonedDoc) => {
                patchClonedFormFields(clonedDoc);
            },
        });

        return new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/png");
        });
    };

    const copyCanvasAsImage = async (targetRef: React.RefObject<HTMLElement>) => {
        if (!targetRef.current) {
            message.error("Canvas not found");
            return;
        }

        setDownloading(true);

        const node = targetRef.current;

        try {
            let blob: Blob | null = null;

            // 1) Try html2canvas full-size capture first (most stable for large trees).
            if (!blob) {
                blob = await createBlobWithHtml2Canvas(node, true);
            }

            // 2) Fallback to html2canvas visible capture.
            if (!blob) {
                blob = await createBlobWithHtml2Canvas(node, false);
            }

            // 3) Last fallback to html-to-image full-size capture.
            if (!blob) {
                try {
                    blob = await createFullCanvasBlob(node);
                } catch (error) {
                    console.warn("html-to-image full capture failed", error);
                }
            }

            // 4) Final fallback to html-to-image visible capture.
            if (!blob) {
                blob = await htmlToImage.toBlob(node, {
                    cacheBust: true,
                    pixelRatio: 1,
                    filter: (n) => !shouldSkipNode(n as HTMLElement),
                });
            }

            if (!blob) {
                throw new Error("Failed to generate image blob");
            }

            // 5) Try clipboard copy; if clipboard write fails, download as fallback.
            try {
                await tryWriteClipboardImage(blob);
                message.success("Canvas image copied to clipboard");
            } catch (clipboardError) {
                console.warn("Clipboard write failed, downloading image instead", clipboardError);
                downloadBlob(blob, `canvas-${Date.now()}.png`);
                message.warning("Clipboard blocked. Image downloaded instead.");
            }
        } catch (err) {
            console.error(err);
            const errMessage = normalizeErrorMessage(err);
            try {
                const fallbackBlob = await createBlobWithHtml2Canvas(node, false);
                if (fallbackBlob) {
                    downloadBlob(fallbackBlob, `canvas-fallback-${Date.now()}.png`);
                    message.warning("Copy failed, fallback image downloaded.");
                    return;
                }
            } catch (fallbackError) {
                console.error("Fallback download failed", fallbackError);
            }

            message.error(`Failed to copy canvas image: ${errMessage}`);
        } finally {
            setDownloading(false);
        }
    };

    const exportCanvas = async ({
                                    exportType,
                                    data,
                                    targetRef,
                                    filename,
                                }: {
        exportType: "json" | "image" | "copy-image";
        data?: any;
        targetRef?: React.RefObject<HTMLElement>;
        filename?: string;
    }) => {
        if (exportType === "json") {
            await exportJSON(data, filename);
        } else if (exportType === "image") {
            await exportImage(targetRef!, filename);
        } else if (exportType === "copy-image") {
            await copyCanvasAsImage(targetRef!);
        }
    };

    return {exportCanvas, downloading};
}
