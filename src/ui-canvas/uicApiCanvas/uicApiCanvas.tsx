import React from "react";
import UICApiCanvasContent from "./components/UICApiCanvasContent";
import type { MotionProps } from "./types/MotionProps.interface";

export default function UICApiCanvas(motionProps: MotionProps) {
  return <UICApiCanvasContent {...motionProps} />;
}
