import React, { useRef, useState } from "react";
import { DragOutlined } from "@ant-design/icons";
import { useDrag, useDrop } from "react-dnd";
import type { DraggableBodyRowProps } from "../types/DraggableBodyRowProps.interface";



const DraggableBodyRow: React.FC<DraggableBodyRowProps> = ({
  index,
  rowId,
  moveRow,
  className,
  style,
  ...restProps
}) => {
  const ref = useRef<HTMLTableRowElement>(null);
  const dragRef = useRef<HTMLSpanElement>(null);   
  const [isHovered, setIsHovered] = useState(false);

  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: "DraggableBodyRow",
    collect: (monitor) => {
      const { index: dragIndex, rowId: draggedRowId } =
        (monitor.getItem() as { index: number; rowId: string }) || {};
      if (draggedRowId === rowId) return {};
      return {
        isOver: monitor.isOver(),
        dropClassName: dragIndex < index ? " drop-over-downward" : " drop-over-upward",
      };
    },
    drop: (item: { rowId: string }) => {
      moveRow(item.rowId, rowId);
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: "DraggableBodyRow",
    item: { index, rowId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drop(ref);
  drag(dragRef);

  return (
    <tr
      ref={ref}
      className={`${className}${isOver ? dropClassName : ""}`}
      style={{ cursor: "move", ...style, opacity: isDragging ? 0.5 : 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...restProps}
    >
      {React.Children.map(restProps.children as React.ReactElement[], (child: React.ReactElement) => {
        if (child.key === "drag") {
          return React.cloneElement(child, {
            children: (
              <span
                ref={dragRef}
                style={{
                  cursor: "move",
                  display: "inline-block",
                  opacity: isHovered || isDragging ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              >
                <DragOutlined />
              </span>
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

export default DraggableBodyRow;
