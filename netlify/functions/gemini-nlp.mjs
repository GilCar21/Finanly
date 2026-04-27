import { ensurePost, generateJson, json, parseBody, parseGeneratedJson } from "./_gemini.mjs";

export async function handler(event) {
  const invalidMethod = ensurePost(event);
  if (invalidMethod) return invalidMethod;

  try {
    const { prompt, userInput } = parseBody(event);

    if (!prompt || typeof prompt !== "string" || !userInput || typeof userInput !== "string") {
      return json(400, { error: "Dados invalidos para o processamento de linguagem natural." });
    }

    const raw = await generateJson({
      model: "gemini-2.5-flash-lite",
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        { role: "user", parts: [{ text: `Mensagem do usuario: "${userInput}"` }] },
      ],
      temperature: 0.3,
    });

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return json(200, {
        result: {
          intent: "unknown",
          suggestion: "Desculpe, nao consegui entender. Tente reformular a mensagem.",
        },
      });
    }

    return json(200, { result: parseGeneratedJson(match[0], "object") });
  } catch (error) {
    console.error("[gemini-nlp]", error);
    return json(500, {
      error:
        error instanceof Error && error.message
          ? error.message
          : "Falha ao interpretar sua mensagem com o Gemini.",
    });
  }
}
