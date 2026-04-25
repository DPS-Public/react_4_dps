import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import { app } from "@/config/firebase";

/**
 * Firebase Vertex / AI Logic only.
 * Gemini 1.5 model IDs are retired, so we keep the app on 2.5 / 2.0 models.
 */
const DEFAULT_MODEL = "gemini-2.5-flash";

const DEFAULT_MODEL_FALLBACKS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
];

function getFirebaseGenAiConsoleUrl(): string {
  const projectId =
    String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim() || "YOUR_PROJECT_ID";
  return `https://console.firebase.google.com/project/${projectId}/genai/`;
}

function getGeminiModelCandidates(): string[] {
  const single = String(import.meta.env.VITE_GEMINI_MODEL || "").trim();
  const multi = String(import.meta.env.VITE_GEMINI_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  const raw = [...multi, single, DEFAULT_MODEL, ...DEFAULT_MODEL_FALLBACKS].filter(Boolean);
  return [...new Set(raw)];
}

function stripCodeFence(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function parseGenerateContentJson(rawText: string) {
  return JSON.parse(stripCodeFence(rawText));
}

async function generateWithVertex(
  promptEnvelope: string,
  systemInstruction = "Return only valid JSON. Do not include markdown. JSON must be parseable.",
) {
  const models = getGeminiModelCandidates();
  const errors: string[] = [];
  const ai = getAI(app, { backend: new VertexAIBackend() });

  for (const model of models) {
    try {
      const generativeModel = getGenerativeModel(ai, {
        model,
        systemInstruction,
      });

      const response = await generativeModel.generateContent(promptEnvelope);
      const rawText = response.response.text();
      return parseGenerateContentJson(rawText);
    } catch (error) {
      errors.push(`${model}: ${String((error as Error)?.message || error)}`);
    }
  }

  throw new Error(
    [
      "Firebase Vertex AI failed for all tried models.",
      "",
      `Enable Firebase AI in ${getFirebaseGenAiConsoleUrl()} and complete Get started.`,
      "Ensure the linked GCP project allows Vertex AI / Firebase AI access and billing if required.",
      "Gemini 1.5 models are retired. Use Gemini 2.5 / 2.0 model IDs only.",
      "",
      ...errors.slice(-8),
    ].join("\n"),
  );
}

export async function generateVertexJsonPayload(
  promptEnvelope: string,
  systemInstruction?: string,
) {
  return generateWithVertex(promptEnvelope, systemInstruction);
}

export async function vertexAIGenerateCanvasPayload(promptEnvelope: string) {
  return generateWithVertex(
    promptEnvelope,
    "Return only valid JSON. Do not include markdown. JSON must contain uiCanvas and userAcceptanceCriteria keys.",
  );
}
