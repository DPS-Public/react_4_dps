import { callApiPublic } from "@/utils/callApi.ts";

export async function serviceGenerateUICanvas(prompt: string, canvasId: string, canvasName?: string) {
  return callApiPublic("/ui-canvas/generate-canvas", {
    prompt,
    canvasId,
    canvasName,
  });
}


