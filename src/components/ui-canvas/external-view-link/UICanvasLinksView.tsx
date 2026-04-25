const extractEmbedSrc = (value?: string) => {
    if (!value) return "";

    const iframeSrcMatch = value.match(/src=["']([^"']+)["']/i);
    if (iframeSrcMatch?.[1]) {
        return iframeSrcMatch[1];
    }

    return value.trim();
};

const extractIframeAttribute = (value: string | undefined, attribute: "width" | "height") => {
    if (!value) return "";

    const attributeMatch = value.match(new RegExp(`${attribute}\\s*=\\s*["']?([^"'\\s>]+)["']?`, "i"));
    return attributeMatch?.[1] || "";
};

export default function UICanvasLinksView({selectedLink, externalLinkData}) {
    const data = externalLinkData?.find(item => item.id == selectedLink?.id);
    const embedMarkup = data?.code || data?.url || "";
    const embeddedCodeSrc = extractEmbedSrc(embedMarkup);
    const embeddedWidth = extractIframeAttribute(embedMarkup, "width") || "100%";
    const embeddedHeight = extractIframeAttribute(embedMarkup, "height") || "450";
    return (
        data && <div className="p-4 border border-[#f0f0f0]">
            {/* Başlıq + Select */}

            <div className="flex justify-between items-center mb-4">
                    <span>{data?.title}</span>
            </div>

            {/* Sadece resim preview */}

            {data && (
                <div className="text-center w-full h-fit overflow-auto max-h-[80vh]">
                    {data?.type === "image" && <>
                        <img
                            src={data?.url || data?.image || ''}
                            alt="External View"
                            className="w-full object-contain max-h-[600px]"
                            referrerPolicy="no-referrer"
                        />
                    </>
                    }

                    {data?.type === 'embedded' &&
                        <iframe style={{border: "1px solid rgba(0, 0, 0, 0.1)"}} className="w-full max-w-[800px]" height="450"
                                src={data?.url}
                                allowFullScreen></iframe>}

                    {(data?.type === 'embed' || data?.type === 'embedded_code') && embeddedCodeSrc &&
                        <iframe
                            style={{border: "1px solid rgba(0, 0, 0, 0.1)"}}
                            width={embeddedWidth}
                            height={embeddedHeight}
                            src={embeddedCodeSrc}
                            allowFullScreen
                        />}
                </div>
            )}

        </div>

    );
}
