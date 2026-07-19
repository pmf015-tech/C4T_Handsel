import { GoogleGenAI } from "@google/genai";

let cached: GoogleGenAI | null = null;

export class GeminiConfigurationError extends Error {
  readonly name = "GeminiConfigurationError";
  constructor() {
    super(
      "Gemini is not configured. Set GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION (Vertex AI) or GEMINI_API_KEY.",
    );
  }
}

export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Vertex AI is the contest-mandated path (spec E8 / XPRIZE addendum); the
 * API-key fallback keeps local development working without GCP credentials.
 */
export function getGemini(): GoogleGenAI {
  if (cached) return cached;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  if (project) {
    cached = new GoogleGenAI({ vertexai: true, project, location });
    return cached;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiConfigurationError();
  cached = new GoogleGenAI({ apiKey });
  return cached;
}
