import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 700;

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function getClient() {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error("A chave GEMINI_API_KEY nao esta configurada no servidor.");
  }

  return new GoogleGenAI({ apiKey: geminiApiKey });
}

export function parseBody(event) {
  if (!event.body) {
    throw new Error("Requisicao sem corpo.");
  }

  return JSON.parse(event.body);
}

export function ensurePost(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo nao permitido." });
  }

  return null;
}

export async function generateJson({ model, contents, schema, temperature }) {
  const ai = getClient();
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          temperature,
          ...(schema
            ? {
                responseSchema: schema,
              }
            : {}),
        },
      });

      return response.text ?? "";
    } catch (error) {
      lastError = error;

      const status = typeof error?.status === "number" ? error.status : undefined;
      const isRetryable = status ? RETRYABLE_STATUS_CODES.has(status) : false;
      const hasAttemptsLeft = attempt < MAX_RETRIES;

      if (!isRetryable || !hasAttemptsLeft) {
        throw error;
      }

      const retryDelay = BASE_RETRY_DELAY_MS * 2 ** attempt;
      await wait(retryDelay);
    }
  }

  throw lastError;
}

export function parseGeneratedJson(raw, fallbackShape = "object") {
  const candidates = buildJsonCandidates(raw, fallbackShape);
  let lastError;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Resposta JSON invalida gerada pelo Gemini.");
}

export { Type };

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildJsonCandidates(raw, fallbackShape) {
  const normalized = String(raw ?? "").trim();
  const extracted = extractJsonBlock(normalized, fallbackShape);
  const cleaned = stripCodeFences(extracted || normalized).trim();

  const candidates = [cleaned];
  const withoutTrailingCommas = cleaned.replace(/,\s*([}\]])/g, "$1");

  if (withoutTrailingCommas !== cleaned) {
    candidates.push(withoutTrailingCommas);
  }

  const withoutBom = withoutTrailingCommas.replace(/^\uFEFF/, "");
  if (withoutBom !== withoutTrailingCommas) {
    candidates.push(withoutBom);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function extractJsonBlock(text, fallbackShape) {
  const preferred = fallbackShape === "array" ? ["[", "{"] : ["{", "["];

  for (const opener of preferred) {
    const closer = opener === "[" ? "]" : "}";
    const start = text.indexOf(opener);
    const end = text.lastIndexOf(closer);

    if (start !== -1 && end !== -1 && end > start) {
      return text.slice(start, end + 1);
    }
  }

  return text;
}

function stripCodeFences(text) {
  return text.replace(/^```(?:json)?\s*|\s*```$/g, "");
}
