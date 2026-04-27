import { ensurePost, generateJson, json, parseBody, parseGeneratedJson } from "./_gemini.mjs";

export async function handler(event) {
  const invalidMethod = ensurePost(event);
  if (invalidMethod) return invalidMethod;

  try {
    const { prompt } = parseBody(event);

    if (!prompt || typeof prompt !== "string") {
      return json(400, { error: "Prompt invalido para gerar insights." });
    }

    const raw = await generateJson({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      temperature: 0.7,
    });

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      return json(200, { insights: [] });
    }

    return json(200, { insights: parseGeneratedJson(match[0], "array") });
  } catch (error) {
    console.error("[gemini-insights]", error);
    return json(500, {
      error:
        error instanceof Error && error.message
          ? error.message
          : "Falha ao gerar insights financeiros.",
    });
  }
}
