import React from "react";
import {useDrag, useDrop} from "react-dnd";
import {DragOutlined,} from "@ant-design/icons";

export const DraggableRow = ({ type, operationId, index, moveRow, className, style, children, ...restProps }: any) => {
    const ref = React.useRef<HTMLTableRowElement>(null);
    const dragRef = React.useRef<HTMLSpanElement>(null);
  
    const [, drop] = useDrop({
      accept: 'row',
      drop(item: { type: string, operationId: string, index: number }) {
        if (!ref.current) return;
        if (item.index === index) return;
        if (item.type !== type || item.operationId !== operationId) return;
        
        moveRow(type, operationId, item.index, index);
        item.index = index;
      },
    });
    const [{ isDragging }, drag] = useDrag({
      type: 'row',
      item: { type, operationId, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });
  
    // Connect both the drag handle and row to the drag function
    drag(dragRef);
    drop(ref);
  
    const opacity = isDragging ? 0.5 : 1;

    // Clone the children to modify the drag handle cell
    const modifiedChildren = React.Children.map(children, (child) => {
      if (child.key === 'drag') {
        return React.cloneElement(child, {
          children: (
            <span 
              ref={dragRef} 
              style={{ cursor: 'move' }}
              onMouseDown={(e) => e.stopPropagation()} // Prevent event bubbling
            >
              <DragOutlined />
            </span>
          )
        });
      }
      return child;
    });
  
    return (
      <tr
        ref={ref}
        className={className}
        style={{ ...style, opacity }}
        {...restProps}
      >
        {modifiedChildren}
      </tr>
    );
  };
  
