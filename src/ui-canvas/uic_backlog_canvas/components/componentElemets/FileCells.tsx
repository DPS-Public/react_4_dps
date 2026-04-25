import { Paperclip } from "lucide-react";
import { useState, useRef } from "react";
import { Image } from "antd";

export const FileCells = ({ files }) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!files?.length) return null;

  const imageFiles = files.filter(item => item.type === "image");
  const visible = expanded ? files : files.slice(0, 1);
  const rest = files.length - 1;

  return (
    <Image.PreviewGroup>
      <div ref={containerRef} className="w-full max-w-[200px] min-w-0 flex flex-col gap-1 overflow-hidden">
        {/* Keep preview images out of flex gap flow */}
        <div className="absolute w-0 h-0 overflow-hidden pointer-events-none">
          {imageFiles.map((item, index) => (
            <Image
              key={`img-${index}`}
              src={item.url}
              alt={item?.name || item?.url.split("/").pop().split("?")[0]}
              width={0}
              height={0}
              preview={{
                getContainer: () => document.body,
              }}
            />
          ))}
        </div>

        {/* Render visible file links */}
        {visible.map((item, index) => (
          <div key={index} className="w-full max-w-[200px] min-w-0 flex items-center gap-1 whitespace-nowrap overflow-hidden">
            {item.type === "image" ? (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  // Find the image index in imageFiles array
                  const imageIndex = imageFiles.findIndex(img => img.url === item.url);
                  // Find the corresponding hidden Image component and trigger preview
                  if (containerRef.current) {
                    const allImages = containerRef.current.querySelectorAll('.ant-image img');
                    if (allImages[imageIndex]) {
                      (allImages[imageIndex] as HTMLElement).click();
                    }
                  }
                }}
                className="text-blue-500 flex-1 flex min-w-0 items-center gap-1 cursor-pointer hover:underline overflow-hidden"
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate">
                  {item?.name || item?.url.split("/").pop().split("?")[0]}
                </span>
              </span>
            ) : (
              <a
                href={item.url}
                target="_blank"
                className="text-blue-500 flex-1 min-w-0 truncate cursor-pointer hover:underline"
              >
                {item?.name || item?.url.split("/").pop().split("?")[0]}
              </a>
            )}

            {!expanded && rest > 0 && index === 0 && (
              <span
                onClick={() => setExpanded(true)}
                className="text-gray-800 text-[12px] font-normal cursor-pointer hover:text-blue-600 shrink-0"
              >
                ({rest} more)
              </span>
            )}
          </div>
        ))}
        {expanded && rest > 0 && (
          <span
            onClick={() => setExpanded(false)}
            className="text-gray-800 font-semibold cursor-pointer hover:text-blue-600 w-fit"
          >
            less
          </span>
        )}
      </div>
    </Image.PreviewGroup>
  );
};
